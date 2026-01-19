import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

// Telegram Update types
interface TelegramUpdate {
  update_id: number
  pre_checkout_query?: PreCheckoutQuery
  message?: {
    successful_payment?: SuccessfulPayment
    from?: TelegramUser
    chat?: { id: number }
  }
}

interface PreCheckoutQuery {
  id: string
  from: TelegramUser
  currency: string
  total_amount: number
  invoice_payload: string
}

interface SuccessfulPayment {
  currency: string
  total_amount: number
  invoice_payload: string
  telegram_payment_charge_id: string
  provider_payment_charge_id: string
}

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

// Answer pre-checkout query
async function answerPreCheckoutQuery(queryId: string, ok: boolean, errorMessage?: string) {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pre_checkout_query_id: queryId,
        ok,
        error_message: errorMessage,
      }),
    }
  )
  return response.json()
}

// Send message to user
async function sendMessage(chatId: number, text: string) {
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json()
    
    console.log('Received Telegram update:', JSON.stringify(update, null, 2))

    // Handle pre-checkout query (user is about to pay)
    if (update.pre_checkout_query) {
      const query = update.pre_checkout_query
      
      try {
        // Payload format: "shortUserId|shortPackageId|timestamp"
        const payloadParts = query.invoice_payload.split('|')
        
        if (payloadParts.length < 2) {
          await answerPreCheckoutQuery(query.id, false, 'Noto\'g\'ri payload formati')
          return NextResponse.json({ ok: true })
        }

        // Find pending transaction to verify
        const { data: pendingTx } = await supabase
          .from('transactions')
          .select('*')
          .eq('status', 'pending')
          .eq('type', 'purchase')
          .filter('metadata->>payload', 'eq', query.invoice_payload)
          .single()

        if (pendingTx) {
          // Transaction found, approve
          await answerPreCheckoutQuery(query.id, true)
        } else {
          // Fallback: check if user and package exist by short IDs
          const shortUserId = payloadParts[0]
          const shortPackageId = payloadParts[1]
          
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .ilike('id', `${shortUserId}%`)
            .single()
            
          const { data: pkg } = await supabase
            .from('star_packages')
            .select('id')
            .ilike('id', `${shortPackageId}%`)
            .single()

          if (!user) {
            await answerPreCheckoutQuery(query.id, false, 'Foydalanuvchi topilmadi')
            return NextResponse.json({ ok: true })
          }

          if (!pkg) {
            await answerPreCheckoutQuery(query.id, false, 'Paket topilmadi')
            return NextResponse.json({ ok: true })
          }

          // All checks passed, confirm pre-checkout
          await answerPreCheckoutQuery(query.id, true)
        }
        
      } catch (error) {
        console.error('Pre-checkout error:', error)
        await answerPreCheckoutQuery(query.id, false, 'Xatolik yuz berdi')
      }

      return NextResponse.json({ ok: true })
    }

    // Handle successful payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment
      const chatId = update.message.chat?.id

      try {
        // Parse short payload format: "shortUserId|shortPackageId|timestamp"
        const payloadParts = payment.invoice_payload.split('|')
        
        // Find the pending transaction with this payload
        const { data: pendingTx } = await supabase
          .from('transactions')
          .select('*')
          .eq('status', 'pending')
          .eq('type', 'purchase')
          .filter('metadata->>payload', 'eq', payment.invoice_payload)
          .single()

        let payload: { userId: string; packageId: string; starsAmount?: number }
        
        if (pendingTx?.metadata) {
          // Use full data from pending transaction
          payload = {
            userId: pendingTx.metadata.userId || pendingTx.user_id,
            packageId: pendingTx.metadata.packageId,
            starsAmount: pendingTx.metadata.starsAmount,
          }
        } else {
          // Fallback: try to find user and package by short IDs
          const shortUserId = payloadParts[0]
          const shortPackageId = payloadParts[1]
          
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .ilike('id', `${shortUserId}%`)
            .single()
            
          const { data: pkg } = await supabase
            .from('star_packages')
            .select('id')
            .ilike('id', `${shortPackageId}%`)
            .single()
            
          if (!user || !pkg) {
            console.error('Could not find user or package from payload:', payment.invoice_payload)
            return NextResponse.json({ ok: true })
          }
          
          payload = { userId: user.id, packageId: pkg.id }
        }
        
        // Get package details
        const { data: pkg } = await supabase
          .from('star_packages')
          .select('*')
          .eq('id', payload.packageId)
          .single()

        if (!pkg) {
          console.error('Package not found for payment:', payload.packageId)
          return NextResponse.json({ ok: true })
        }

        // Calculate total stars with bonus
        const bonusStars = Math.floor(pkg.stars_amount * (pkg.bonus_percent / 100))
        const totalStars = pkg.stars_amount + bonusStars

        // Create completed transaction
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: payload.userId,
            type: 'purchase',
            amount: totalStars,
            fee: 0,
            net_amount: totalStars,
            status: 'completed',
            telegram_payment_id: payment.telegram_payment_charge_id,
            description: `Stars sotib olish: ${pkg.name}${bonusStars > 0 ? ` (+${bonusStars} bonus)` : ''}`,
            metadata: {
              packageId: payload.packageId,
              originalAmount: pkg.stars_amount,
              bonusAmount: bonusStars,
              telegramChargeId: payment.telegram_payment_charge_id,
              providerChargeId: payment.provider_payment_charge_id,
            },
          })
          .select()
          .single()

        if (txError) {
          console.error('Transaction error:', txError)
        }

        // Update wallet balance
        const { error: walletError } = await supabase.rpc('add_stars_to_wallet', {
          p_user_id: payload.userId,
          p_amount: totalStars,
        })

        // If RPC doesn't exist, do manual update
        if (walletError) {
          console.log('RPC not found, doing manual update')
          
          // Get current wallet
          const { data: wallet } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', payload.userId)
            .single()

          if (wallet) {
            await supabase
              .from('wallets')
              .update({
                stars_balance: wallet.stars_balance + totalStars,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', payload.userId)
          } else {
            // Create wallet if doesn't exist
            await supabase
              .from('wallets')
              .insert({
                user_id: payload.userId,
                stars_balance: totalStars,
              })
          }
        }

        // Send confirmation message to user
        if (chatId) {
          const message = `
🎉 <b>To'lov muvaffaqiyatli!</b>

⭐ <b>${totalStars} Stars</b> hisobingizga qo'shildi!
${bonusStars > 0 ? `🎁 Bonus: +${bonusStars} Stars\n` : ''}
💳 Tranzaksiya: <code>${payment.telegram_payment_charge_id}</code>

Ilovaga qaytib, yangi balansni ko'ring!
          `.trim()

          await sendMessage(chatId, message)
        }

        console.log(`Payment successful: ${totalStars} stars added to user ${payload.userId}`)

      } catch (error) {
        console.error('Payment processing error:', error)
      }

      return NextResponse.json({ ok: true })
    }

    // Other updates (ignore)
    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}

// Verify webhook is working
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Tanishuv Payment Webhook',
    timestamp: new Date().toISOString(),
  })
}
