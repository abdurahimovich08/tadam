import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId kerak' },
        { status: 400 }
      )
    }

    // Get or create wallet
    let { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Wallet doesn't exist, create it
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({ user_id: userId })
        .select()
        .single()

      if (createError) {
        return NextResponse.json(
          { error: 'Hamyon yaratishda xatolik' },
          { status: 500 }
        )
      }

      wallet = newWallet
    } else if (error) {
      return NextResponse.json(
        { error: 'Hamyon topishda xatolik' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      wallet: {
        balance: wallet.stars_balance,
        totalEarned: wallet.total_earned,
        totalSpent: wallet.total_spent,
        totalWithdrawn: wallet.total_withdrawn,
        pendingWithdrawal: wallet.pending_withdrawal,
        isCreator: wallet.is_creator,
        creatorVerified: wallet.creator_verified,
      },
    })

  } catch (error) {
    console.error('Balance error:', error)
    return NextResponse.json(
      { error: 'Server xatoligi' },
      { status: 500 }
    )
  }
}
