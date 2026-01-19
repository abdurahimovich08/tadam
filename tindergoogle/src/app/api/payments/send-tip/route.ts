import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PLATFORM_COMMISSION = 0.10 // 10%

interface SendTipRequest {
  senderId: string
  receiverId: string
  amount: number
  message?: string
  isAnonymous?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: SendTipRequest = await request.json()
    const { senderId, receiverId, amount, message, isAnonymous = false } = body

    if (!senderId || !receiverId || !amount) {
      return NextResponse.json(
        { error: 'senderId, receiverId va amount kerak' },
        { status: 400 }
      )
    }

    if (amount < 10) {
      return NextResponse.json(
        { error: 'Minimal tip: 10 Stars' },
        { status: 400 }
      )
    }

    // Check sender's balance
    const { data: senderWallet } = await supabase
      .from('wallets')
      .select('stars_balance')
      .eq('user_id', senderId)
      .single()

    if (!senderWallet || senderWallet.stars_balance < amount) {
      return NextResponse.json(
        { error: 'Balans yetarli emas' },
        { status: 400 }
      )
    }

    // Calculate fee
    const fee = Math.floor(amount * PLATFORM_COMMISSION)
    const netAmount = amount - fee

    // Start transaction
    // 1. Deduct from sender
    const { error: deductError } = await supabase
      .from('wallets')
      .update({
        stars_balance: senderWallet.stars_balance - amount,
        total_spent: supabase.rpc('increment', { value: amount }),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', senderId)

    if (deductError) {
      // Manual update if rpc fails
      await supabase
        .from('wallets')
        .update({
          stars_balance: senderWallet.stars_balance - amount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', senderId)
    }

    // 2. Add to receiver
    const { data: receiverWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', receiverId)
      .single()

    if (receiverWallet) {
      await supabase
        .from('wallets')
        .update({
          stars_balance: receiverWallet.stars_balance + netAmount,
          total_earned: receiverWallet.total_earned + netAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', receiverId)
    } else {
      await supabase
        .from('wallets')
        .insert({
          user_id: receiverId,
          stars_balance: netAmount,
          total_earned: netAmount,
        })
    }

    // 3. Create sender's transaction
    const { data: senderTx } = await supabase
      .from('transactions')
      .insert({
        user_id: senderId,
        type: 'tip',
        amount,
        fee,
        net_amount: netAmount,
        status: 'completed',
        related_user_id: receiverId,
        description: 'Tip yuborish',
      })
      .select()
      .single()

    // 4. Create receiver's earning transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: receiverId,
        type: 'earning',
        amount: netAmount,
        fee: 0,
        net_amount: netAmount,
        status: 'completed',
        related_user_id: senderId,
        description: 'Tip qabul qilish',
      })

    // 5. Record tip
    await supabase
      .from('tips')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        amount,
        message,
        is_anonymous: isAnonymous,
        transaction_id: senderTx?.id,
      })

    return NextResponse.json({
      success: true,
      amount,
      fee,
      netAmount,
      message: 'Tip muvaffaqiyatli yuborildi!',
    })

  } catch (error) {
    console.error('Send tip error:', error)
    return NextResponse.json(
      { error: 'Server xatoligi' },
      { status: 500 }
    )
  }
}
