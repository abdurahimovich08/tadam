import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

interface CreateInvoiceRequest {
  userId: string
  packageId: string
  telegramUserId: number
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateInvoiceRequest = await request.json()
    const { userId, packageId, telegramUserId } = body

    if (!userId || !packageId || !telegramUserId) {
      return NextResponse.json(
        { error: 'userId, packageId va telegramUserId kerak' },
        { status: 400 }
      )
    }

    // Get package details
    const { data: pkg, error: pkgError } = await supabase
      .from('star_packages')
      .select('*')
      .eq('id', packageId)
      .single()

    if (pkgError || !pkg) {
      return NextResponse.json(
        { error: 'Paket topilmadi' },
        { status: 404 }
      )
    }

    // Create invoice payload for Telegram
    const payload = JSON.stringify({
      userId,
      packageId,
      starsAmount: pkg.stars_amount,
      timestamp: Date.now(),
    })

    // Create invoice via Telegram Bot API
    const invoiceResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${pkg.stars_amount} Stars`,
          description: `${pkg.name} paketi - ${pkg.stars_amount} Stars${pkg.bonus_percent > 0 ? ` (+${pkg.bonus_percent}% bonus)` : ''}`,
          payload: payload,
          currency: 'XTR', // Telegram Stars currency code
          prices: [
            {
              label: `${pkg.stars_amount} Stars`,
              amount: pkg.price_stars, // Amount in Telegram Stars
            },
          ],
        }),
      }
    )

    const invoiceData = await invoiceResponse.json()

    if (!invoiceData.ok) {
      console.error('Telegram API error:', invoiceData)
      return NextResponse.json(
        { error: 'Invoice yaratishda xatolik', details: invoiceData.description },
        { status: 500 }
      )
    }

    // Store pending transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'purchase',
        amount: pkg.stars_amount,
        fee: 0,
        net_amount: pkg.stars_amount,
        status: 'pending',
        description: `Stars sotib olish: ${pkg.name}`,
        metadata: {
          packageId,
          telegramUserId,
          invoicePayload: payload,
        },
      })

    if (txError) {
      console.error('Transaction creation error:', txError)
    }

    return NextResponse.json({
      success: true,
      invoiceUrl: invoiceData.result,
      package: {
        name: pkg.name,
        stars: pkg.stars_amount,
        price: pkg.price_stars,
      },
    })
  } catch (error) {
    console.error('Create invoice error:', error)
    return NextResponse.json(
      { error: 'Server xatoligi' },
      { status: 500 }
    )
  }
}
