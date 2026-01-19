import { supabase } from './supabase'
import type { 
  Wallet, 
  StarPackage, 
  Transaction, 
  CreatorProfile,
  PaidContent,
  Gift,
  Subscription
} from '@/types'

const PLATFORM_COMMISSION = 0.10 // 10%

// ========================================
// WALLET OPERATIONS
// ========================================

export async function getWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching wallet:', error)
    return null
  }
  return data
}

export async function createWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from('wallets')
    .insert({ user_id: userId })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating wallet:', error)
    return null
  }
  return data
}

export async function getOrCreateWallet(userId: string): Promise<Wallet | null> {
  let wallet = await getWallet(userId)
  if (!wallet) {
    wallet = await createWallet(userId)
  }
  return wallet
}

// ========================================
// STAR PACKAGES
// ========================================

export async function getStarPackages(): Promise<StarPackage[]> {
  const { data, error } = await supabase
    .from('star_packages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  
  if (error) {
    console.error('Error fetching star packages:', error)
    return []
  }
  
  // Remove duplicates by name (in case INSERT ran multiple times)
  const uniquePackages = data?.reduce((acc: StarPackage[], pkg) => {
    if (!acc.find(p => p.name === pkg.name)) {
      acc.push(pkg)
    }
    return acc
  }, []) || []
  
  return uniquePackages
}

// ========================================
// TRANSACTIONS
// ========================================

export async function createTransaction(
  userId: string,
  type: Transaction['type'],
  amount: number,
  options?: {
    relatedUserId?: string
    contentId?: string
    contentType?: string
    telegramPaymentId?: string
    description?: string
    metadata?: Record<string, unknown>
  }
): Promise<Transaction | null> {
  const fee = ['tip', 'subscription', 'content_unlock', 'story_view', 'message_payment', 'gift'].includes(type)
    ? Math.floor(amount * PLATFORM_COMMISSION)
    : 0
  
  const netAmount = amount - fee

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type,
      amount,
      fee,
      net_amount: netAmount,
      related_user_id: options?.relatedUserId,
      content_id: options?.contentId,
      content_type: options?.contentType,
      telegram_payment_id: options?.telegramPaymentId,
      description: options?.description,
      metadata: options?.metadata || {},
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating transaction:', error)
    return null
  }

  // If this is a payment to another user, create their earning transaction
  if (options?.relatedUserId && fee > 0) {
    await supabase.from('transactions').insert({
      user_id: options.relatedUserId,
      type: 'earning',
      amount: netAmount,
      fee: 0,
      net_amount: netAmount,
      related_user_id: userId,
      content_id: options.contentId,
      content_type: options.contentType,
      description: `Daromad: ${type}`,
    })
  }

  return data
}

export async function getTransactionHistory(
  userId: string, 
  limit = 50
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed') // Only show completed transactions
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }
  return data || []
}

// ========================================
// CREATOR PROFILE
// ========================================

export async function getCreatorProfile(userId: string): Promise<CreatorProfile | null> {
  const { data, error } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching creator profile:', error)
  }
  return data
}

export async function createOrUpdateCreatorProfile(
  userId: string,
  profile: Partial<CreatorProfile>
): Promise<CreatorProfile | null> {
  const { data, error } = await supabase
    .from('creator_profiles')
    .upsert({
      user_id: userId,
      ...profile,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error updating creator profile:', error)
    return null
  }

  // Also mark wallet as creator
  await supabase
    .from('wallets')
    .update({ is_creator: true })
    .eq('user_id', userId)

  return data
}

// ========================================
// PAID CONTENT
// ========================================

export async function createPaidContent(
  creatorId: string,
  content: Omit<PaidContent, 'id' | 'creator_id' | 'view_count' | 'purchase_count' | 'created_at'>
): Promise<PaidContent | null> {
  const { data, error } = await supabase
    .from('paid_content')
    .insert({
      creator_id: creatorId,
      ...content,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating paid content:', error)
    return null
  }
  return data
}

export async function getPaidContent(contentId: string): Promise<PaidContent | null> {
  const { data, error } = await supabase
    .from('paid_content')
    .select('*')
    .eq('id', contentId)
    .single()

  if (error) {
    console.error('Error fetching paid content:', error)
    return null
  }
  return data
}

export async function getCreatorContent(creatorId: string): Promise<PaidContent[]> {
  const { data, error } = await supabase
    .from('paid_content')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching creator content:', error)
    return []
  }
  return data || []
}

export async function purchaseContent(
  buyerId: string,
  contentId: string
): Promise<{ success: boolean; error?: string }> {
  // Get content details
  const content = await getPaidContent(contentId)
  if (!content) {
    return { success: false, error: 'Kontent topilmadi' }
  }

  // Check if already purchased
  const { data: existing } = await supabase
    .from('content_purchases')
    .select('id')
    .eq('buyer_id', buyerId)
    .eq('content_id', contentId)
    .single()

  if (existing) {
    return { success: false, error: 'Siz allaqachon sotib olgansiz' }
  }

  // Check buyer's balance
  const wallet = await getWallet(buyerId)
  if (!wallet || wallet.stars_balance < content.price) {
    return { success: false, error: 'Balans yetarli emas' }
  }

  // Create transaction
  const transaction = await createTransaction(buyerId, 'content_unlock', content.price, {
    relatedUserId: content.creator_id,
    contentId: content.id,
    contentType: content.type,
    description: `Kontent sotib olish: ${content.title || content.type}`,
  })

  if (!transaction) {
    return { success: false, error: 'Tranzaksiya yaratishda xatolik' }
  }

  // Record purchase
  const { error: purchaseError } = await supabase
    .from('content_purchases')
    .insert({
      buyer_id: buyerId,
      content_id: contentId,
      price_paid: content.price,
      transaction_id: transaction.id,
    })

  if (purchaseError) {
    console.error('Error recording purchase:', purchaseError)
    return { success: false, error: 'Xarid qayd etishda xatolik' }
  }

  // Update purchase count
  await supabase
    .from('paid_content')
    .update({ purchase_count: content.purchase_count + 1 })
    .eq('id', contentId)

  return { success: true }
}

export async function hasUserPurchasedContent(
  userId: string,
  contentId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('content_purchases')
    .select('id')
    .eq('buyer_id', userId)
    .eq('content_id', contentId)
    .single()

  return !!data
}

// ========================================
// SUBSCRIPTIONS
// ========================================

export async function subscribeToCreator(
  subscriberId: string,
  creatorId: string,
  price: number,
  durationDays = 30
): Promise<{ success: boolean; error?: string }> {
  // Check existing subscription
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .eq('creator_id', creatorId)
    .eq('status', 'active')
    .single()

  if (existing) {
    return { success: false, error: 'Siz allaqachon obuna bo\'lgansiz' }
  }

  // Check balance
  const wallet = await getWallet(subscriberId)
  if (!wallet || wallet.stars_balance < price) {
    return { success: false, error: 'Balans yetarli emas' }
  }

  // Create transaction
  const transaction = await createTransaction(subscriberId, 'subscription', price, {
    relatedUserId: creatorId,
    contentType: 'subscription',
    description: 'Obuna to\'lovi',
  })

  if (!transaction) {
    return { success: false, error: 'Tranzaksiya yaratishda xatolik' }
  }

  // Create subscription
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + durationDays)

  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      subscriber_id: subscriberId,
      creator_id: creatorId,
      price_paid: price,
      status: 'active',
      expires_at: expiresAt.toISOString(),
    })

  if (subError) {
    console.error('Error creating subscription:', subError)
    return { success: false, error: 'Obuna yaratishda xatolik' }
  }

  // Update creator's subscriber count
  await supabase.rpc('increment_subscriber_count', { creator_user_id: creatorId })

  return { success: true }
}

export async function getUserSubscription(
  subscriberId: string,
  creatorId: string
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .eq('creator_id', creatorId)
    .eq('status', 'active')
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching subscription:', error)
  }
  return data
}

export async function isUserSubscribed(
  subscriberId: string,
  creatorId: string
): Promise<boolean> {
  const sub = await getUserSubscription(subscriberId, creatorId)
  return !!sub && new Date(sub.expires_at) > new Date()
}

// ========================================
// TIPS & GIFTS
// ========================================

export async function sendTip(
  senderId: string,
  receiverId: string,
  amount: number,
  message?: string,
  isAnonymous = false
): Promise<{ success: boolean; error?: string }> {
  // Check balance
  const wallet = await getWallet(senderId)
  if (!wallet || wallet.stars_balance < amount) {
    return { success: false, error: 'Balans yetarli emas' }
  }

  // Create transaction
  const transaction = await createTransaction(senderId, 'tip', amount, {
    relatedUserId: receiverId,
    description: 'Tip yuborish',
  })

  if (!transaction) {
    return { success: false, error: 'Tranzaksiya yaratishda xatolik' }
  }

  // Record tip
  const { error: tipError } = await supabase
    .from('tips')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      amount,
      message,
      is_anonymous: isAnonymous,
      transaction_id: transaction.id,
    })

  if (tipError) {
    console.error('Error recording tip:', tipError)
    return { success: false, error: 'Tip qayd etishda xatolik' }
  }

  return { success: true }
}

export async function getGifts(): Promise<Gift[]> {
  const { data, error } = await supabase
    .from('gifts')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('Error fetching gifts:', error)
    return []
  }
  return data || []
}

export async function sendGift(
  senderId: string,
  receiverId: string,
  giftId: string,
  message?: string,
  isAnonymous = false
): Promise<{ success: boolean; error?: string }> {
  // Get gift details
  const { data: gift, error: giftError } = await supabase
    .from('gifts')
    .select('*')
    .eq('id', giftId)
    .single()

  if (giftError || !gift) {
    return { success: false, error: 'Sovg\'a topilmadi' }
  }

  // Check balance
  const wallet = await getWallet(senderId)
  if (!wallet || wallet.stars_balance < gift.price) {
    return { success: false, error: 'Balans yetarli emas' }
  }

  // Create transaction
  const transaction = await createTransaction(senderId, 'gift', gift.price, {
    relatedUserId: receiverId,
    contentType: 'gift',
    description: `Sovg'a: ${gift.name}`,
  })

  if (!transaction) {
    return { success: false, error: 'Tranzaksiya yaratishda xatolik' }
  }

  // Record gift
  const { error: sendError } = await supabase
    .from('sent_gifts')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      gift_id: giftId,
      message,
      is_anonymous: isAnonymous,
      transaction_id: transaction.id,
    })

  if (sendError) {
    console.error('Error recording gift:', sendError)
    return { success: false, error: 'Sovg\'a qayd etishda xatolik' }
  }

  return { success: true }
}

// ========================================
// WITHDRAWALS
// ========================================

export async function requestWithdrawal(
  userId: string,
  amount: number,
  method: 'telegram_stars' | 'card' | 'crypto',
  payoutDetails: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  // Check balance
  const wallet = await getWallet(userId)
  if (!wallet || wallet.stars_balance < amount) {
    return { success: false, error: 'Balans yetarli emas' }
  }

  // Check minimum withdrawal
  const minWithdrawal = 1000 // From platform settings
  if (amount < minWithdrawal) {
    return { success: false, error: `Minimal yechib olish: ${minWithdrawal} Stars` }
  }

  // Calculate fee (2%, min 50 stars)
  const feePercent = 0.02
  const minFee = 50
  const fee = Math.max(Math.floor(amount * feePercent), minFee)
  const netAmount = amount - fee

  // Create withdrawal request
  const { error } = await supabase
    .from('withdrawal_requests')
    .insert({
      user_id: userId,
      amount,
      fee,
      net_amount: netAmount,
      method,
      payout_details: payoutDetails,
      status: 'pending',
    })

  if (error) {
    console.error('Error creating withdrawal request:', error)
    return { success: false, error: 'So\'rov yaratishda xatolik' }
  }

  // Mark stars as pending
  await supabase
    .from('wallets')
    .update({ pending_withdrawal: wallet.pending_withdrawal + amount })
    .eq('user_id', userId)

  return { success: true }
}

export async function getWithdrawalHistory(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching withdrawals:', error)
    return []
  }
  return data || []
}

// ========================================
// CONVERSION RATES
// ========================================

export function starsToUZS(stars: number): number {
  const rate = 1000 // 1 Star = 1000 UZS
  return stars * rate
}

export function starsToUSD(stars: number): number {
  const rate = 0.01 // 1 Star = $0.01
  return stars * rate
}

export function formatStars(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`
  }
  return amount.toString()
}

export function formatMoney(amount: number, currency: 'UZS' | 'USD' = 'UZS'): string {
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`
  }
  return `${amount.toLocaleString()} so'm`
}
