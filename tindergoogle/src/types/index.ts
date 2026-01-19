// Database types

export interface User {
  id: string
  telegram_id: number
  name: string
  created_at: string
}

export interface Profile {
  id: string
  bio: string | null
  age: number | null
  gender: 'male' | 'female' | 'other' | null
  looking_for: 'male' | 'female' | 'both' | null
  profile_picture_url: string | null
  photos: string[] | null
  location: string | null
  height: number | null  // cm
  weight: number | null  // kg
  job: string | null
  education: string | null
  interests: string[] | null
  smoking: 'never' | 'sometimes' | 'often' | null
  drinking: 'never' | 'sometimes' | 'often' | null
  verified: boolean
}

export interface UserWithProfile extends User {
  profiles: Profile | null
}

export interface Swipe {
  id: number
  swiper_id: string
  swiped_id: string
  liked: boolean
  created_at: string
}

export interface Match {
  id: number
  user1_id: string
  user2_id: string
  created_at: string
  user1?: User
  user2?: User
}

export interface Message {
  id: number
  match_id: number
  sender_id: string
  content: string
  created_at: string
}

// ========================================
// MONETIZATION TYPES
// ========================================

export interface Wallet {
  id: string
  user_id: string
  stars_balance: number
  total_earned: number
  total_spent: number
  total_withdrawn: number
  pending_withdrawal: number
  is_creator: boolean
  creator_verified: boolean
  created_at: string
  updated_at: string
}

export interface StarPackage {
  id: string
  name: string
  stars_amount: number
  price_stars: number
  bonus_percent: number
  is_active: boolean
  sort_order: number
}

export type TransactionType = 
  | 'purchase'
  | 'tip'
  | 'subscription'
  | 'content_unlock'
  | 'story_view'
  | 'message_payment'
  | 'gift'
  | 'earning'
  | 'withdrawal'
  | 'refund'
  | 'bonus'

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  fee: number
  net_amount: number
  status: TransactionStatus
  related_user_id?: string
  content_id?: string
  content_type?: string
  telegram_payment_id?: string
  description?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface CreatorProfile {
  id: string
  user_id: string
  subscription_enabled: boolean
  subscription_price: number
  subscription_benefits: string[]
  default_photo_price: number
  default_story_price: number
  default_message_price: number
  tips_enabled: boolean
  min_tip_amount: number
  total_subscribers: number
  total_content_sold: number
  payout_method: 'telegram_stars' | 'card' | 'crypto' | null
  payout_details: Record<string, unknown>
  min_payout_amount: number
  creator_verified?: boolean
  created_at: string
  updated_at: string
}

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'paused'

export interface Subscription {
  id: string
  subscriber_id: string
  creator_id: string
  price_paid: number
  status: SubscriptionStatus
  auto_renew: boolean
  started_at: string
  expires_at: string
  renewed_at?: string
  cancelled_at?: string
  created_at: string
}

export type PaidContentType = 'photo' | 'photo_set' | 'story' | 'video' | 'message' | 'voice'

export interface PaidContent {
  id: string
  creator_id: string
  type: PaidContentType
  title?: string
  description?: string
  price: number
  preview_url?: string
  content_urls: string[]
  is_free_for_subscribers: boolean
  view_count: number
  purchase_count: number
  is_active: boolean
  expires_at?: string
  created_at: string
}

export interface ContentPurchase {
  id: string
  buyer_id: string
  content_id: string
  price_paid: number
  transaction_id?: string
  purchased_at: string
}

export interface Gift {
  id: string
  name: string
  emoji: string
  description?: string
  price: number
  animation_url?: string
  is_active: boolean
  sort_order: number
}

export interface SentGift {
  id: string
  sender_id: string
  receiver_id: string
  gift_id: string
  message?: string
  is_anonymous: boolean
  transaction_id?: string
  created_at: string
  gift?: Gift
}

export interface Tip {
  id: string
  sender_id: string
  receiver_id: string
  amount: number
  message?: string
  transaction_id?: string
  is_anonymous: boolean
  created_at: string
}

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled'
export type PayoutMethod = 'telegram_stars' | 'card' | 'crypto'

export interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  fee: number
  net_amount: number
  method: PayoutMethod
  payout_details: Record<string, unknown>
  status: WithdrawalStatus
  processed_at?: string
  processed_by?: string
  rejection_reason?: string
  transaction_id?: string
  created_at: string
}

// Platform settings
export interface PlatformSettings {
  commission_rate: { percent: number }
  min_withdrawal: { stars: number }
  withdrawal_fee: { percent: number; min_stars: number }
  stars_to_uzs: { rate: number }
  stars_to_usd: { rate: number }
}

// Telegram WebApp types
export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

// Telegram Invoice Parameters
export interface TelegramInvoiceParams {
  title: string
  description: string
  payload: string
  currency: string // 'XTR' for Stars
  prices: Array<{
    label: string
    amount: number
  }>
  provider_token?: string // Empty for Stars
  photo_url?: string
  photo_width?: number
  photo_height?: number
  need_name?: boolean
  need_phone_number?: boolean
  need_email?: boolean
  need_shipping_address?: boolean
  is_flexible?: boolean
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: TelegramUser
    query_id?: string
    auth_date?: number
    hash?: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
    secondary_bg_color?: string
  }
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  isClosingConfirmationEnabled: boolean
  BackButton: {
    isVisible: boolean
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    isProgressVisible: boolean
    setText: (text: string) => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    showProgress: (leaveActive?: boolean) => void
    hideProgress: () => void
  }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  // Payment methods
  openInvoice: (url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void
  expand: () => void
  close: () => void
  ready: () => void
  showAlert: (message: string, callback?: () => void) => void
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void
  showPopup: (params: {
    title?: string
    message: string
    buttons?: Array<{
      id?: string
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'
      text?: string
    }>
  }, callback?: (buttonId: string) => void) => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}
