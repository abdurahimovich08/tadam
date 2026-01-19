import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

interface CreateInvoiceRequest {
  userId: string
  packageId: string
  telegramUserId: number
}

export async function POST(request: NextRequest) {
  try {
    // Check if bot token is configured
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN is not set')
      return NextResponse.json(
        { error: 'Bot token sozlanmagan. Admin bilan bog\'laning.' },
        { status: 500 }
      )
    }

    const body: CreateInvoiceRequest = await request.json()
    const { userId, packageId, telegramUserId } = body

    console.log('Create invoice request:', { userId, packageId, telegramUserId })

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

    if (pkgError) {
      console.error('Package fetch error:', pkgError)
      return NextResponse.json(
        { error: `Paket topilmadi: ${pkgError.message}` },
        { status: 404 }
      )
    }

    if (!pkg) {
      return NextResponse.json(
        { error: 'Paket topilmadi' },
        { status: 404 }
      )
    }

    console.log('Package found:', pkg)

    // Create invoice payload for Telegram (max 128 bytes!)
    // Format: "userId|packageId" - short and simple
    const shortUserId = userId.split('-')[0] // First part of UUID
    const shortPackageId = packageId.split('-')[0]
    const payload = `${shortUserId}|${shortPackageId}|${Date.now()}`
    
    // Store full data in metadata for webhook to use
    const invoiceMetadata = {
      userId,
      packageId,
      starsAmount: pkg.stars_amount,
      timestamp: Date.now(),
      payload, // Reference to match webhook
    }
    
    console.log('Payload (must be <128 bytes):', payload, 'Length:', payload.length)

    // Create invoice via Telegram Bot API
    const invoiceBody = {
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
    }

    console.log('Sending to Telegram:', invoiceBody)

    const invoiceResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceBody),
      }
    )

    const invoiceData = await invoiceResponse.json()
    console.log('Telegram response:', invoiceData)

    if (!invoiceData.ok) {
      console.error('Telegram API error:', invoiceData)
      return NextResponse.json(
        { 
          error: 'Invoice yaratishda xatolik', 
          details: invoiceData.description,
          telegramError: invoiceData
        },
        { status: 500 }
      )
    }

    // Store pending transaction with full metadata (optional, don't fail if it errors)
    try {
      await supabase
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
            ...invoiceMetadata,
            telegramUserId,
          },
        })
    } catch (txError) {
      console.error('Transaction creation error (non-fatal):', txError)
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
      { error: 'Server xatoligi', details: String(error) },
      { status: 500 }
    )
  }
}

// GET endpoint to check if packages exist
export async function GET() {
  try {
    const { data: packages, error } = await supabase
      .from('star_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    return NextResponse.json({
      success: true,
      botTokenSet: !!TELEGRAM_BOT_TOKEN,
      packagesCount: packages?.length || 0,
      packages: packages || [],
      error: error?.message
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    })
  }
}
