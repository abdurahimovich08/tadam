'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTelegram } from './useTelegram'
import * as payments from '@/utils/payments'
import type { Wallet, StarPackage, Transaction, Gift } from '@/types'

export function useWallet(userId: string | undefined) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWallet = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await payments.getOrCreateWallet(userId)
      setWallet(data)
    } catch (err) {
      setError('Hamyonni yuklashda xatolik')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchWallet()
  }, [fetchWallet])

  return { wallet, loading, error, refetch: fetchWallet }
}

export function useStarPackages() {
  const [packages, setPackages] = useState<StarPackage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    payments.getStarPackages().then(data => {
      setPackages(data)
      setLoading(false)
    })
  }, [])

  return { packages, loading }
}

export function useTransactions(userId: string | undefined) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    const data = await payments.getTransactionHistory(userId)
    setTransactions(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  return { transactions, loading, refetch: fetchTransactions }
}

export function useGifts() {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    payments.getGifts().then(data => {
      setGifts(data)
      setLoading(false)
    })
  }, [])

  return { gifts, loading }
}

export function usePayments() {
  const { webApp, hapticFeedback, showAlert } = useTelegram()
  const [processing, setProcessing] = useState(false)

  // Purchase Stars via Telegram
  const purchaseStars = useCallback(async (
    userId: string,
    packageId: string,
    telegramUserId: number,
    onSuccess?: () => void
  ) => {
    if (!webApp) {
      showAlert?.('Telegram WebApp mavjud emas')
      return false
    }

    setProcessing(true)
    hapticFeedback?.('light')

    try {
      // Call backend to create invoice
      const response = await fetch('/api/payments/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, packageId, telegramUserId }),
      })

      const data = await response.json()

      if (!data.success) {
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Invoice yaratishda xatolik'
        throw new Error(errorMsg)
      }

      // Open Telegram payment
      webApp.openInvoice(data.invoiceUrl, (status) => {
        if (status === 'paid') {
          hapticFeedback?.('success')
          showAlert?.(`🎉 ${data.package.stars} Stars muvaffaqiyatli sotib olindi!`)
          onSuccess?.()
        } else if (status === 'cancelled') {
          hapticFeedback?.('light')
        } else if (status === 'failed') {
          hapticFeedback?.('error')
          showAlert?.('To\'lov amalga oshmadi')
        }
        setProcessing(false)
      })

      return true
    } catch (err) {
      console.error('Purchase error:', err)
      hapticFeedback?.('error')
      showAlert?.(err instanceof Error ? err.message : 'Sotib olishda xatolik yuz berdi')
      setProcessing(false)
      return false
    }
  }, [webApp, hapticFeedback, showAlert])

  // Send tip via API
  const sendTip = useCallback(async (
    senderId: string,
    receiverId: string,
    amount: number,
    message?: string,
    isAnonymous?: boolean
  ) => {
    setProcessing(true)
    hapticFeedback?.('light')

    try {
      const response = await fetch('/api/payments/send-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId, receiverId, amount, message, isAnonymous }),
      })

      const result = await response.json()

      if (result.success) {
        hapticFeedback?.('success')
        showAlert?.('💝 Tip muvaffaqiyatli yuborildi!')
        return { success: true }
      } else {
        hapticFeedback?.('error')
        showAlert?.(result.error || 'Xatolik yuz berdi')
        return { success: false, error: result.error }
      }
    } catch (err) {
      hapticFeedback?.('error')
      showAlert?.('Server xatoligi')
      return { success: false, error: 'Server xatoligi' }
    } finally {
      setProcessing(false)
    }
  }, [hapticFeedback, showAlert])

  // Send gift
  const sendGift = useCallback(async (
    senderId: string,
    receiverId: string,
    giftId: string,
    message?: string,
    isAnonymous?: boolean
  ) => {
    setProcessing(true)
    hapticFeedback?.('light')

    const result = await payments.sendGift(senderId, receiverId, giftId, message, isAnonymous)

    if (result.success) {
      hapticFeedback?.('success')
    } else {
      hapticFeedback?.('error')
      showAlert?.(result.error || 'Xatolik yuz berdi')
    }

    setProcessing(false)
    return result
  }, [hapticFeedback, showAlert])

  // Purchase content
  const purchaseContent = useCallback(async (
    buyerId: string,
    contentId: string
  ) => {
    setProcessing(true)
    hapticFeedback?.('light')

    const result = await payments.purchaseContent(buyerId, contentId)

    if (result.success) {
      hapticFeedback?.('success')
    } else {
      hapticFeedback?.('error')
      showAlert?.(result.error || 'Xatolik yuz berdi')
    }

    setProcessing(false)
    return result
  }, [hapticFeedback, showAlert])

  // Subscribe to creator
  const subscribe = useCallback(async (
    subscriberId: string,
    creatorId: string,
    price: number
  ) => {
    setProcessing(true)
    hapticFeedback?.('light')

    const result = await payments.subscribeToCreator(subscriberId, creatorId, price)

    if (result.success) {
      hapticFeedback?.('success')
      showAlert?.('Muvaffaqiyatli obuna bo\'ldingiz! 🎉')
    } else {
      hapticFeedback?.('error')
      showAlert?.(result.error || 'Xatolik yuz berdi')
    }

    setProcessing(false)
    return result
  }, [hapticFeedback, showAlert])

  // Request withdrawal
  const requestWithdrawal = useCallback(async (
    userId: string,
    amount: number,
    method: 'telegram_stars' | 'card' | 'crypto',
    payoutDetails: Record<string, unknown>
  ) => {
    setProcessing(true)
    hapticFeedback?.('light')

    const result = await payments.requestWithdrawal(userId, amount, method, payoutDetails)

    if (result.success) {
      hapticFeedback?.('success')
      showAlert?.('So\'rov yuborildi! 24 soat ichida ko\'rib chiqiladi.')
    } else {
      hapticFeedback?.('error')
      showAlert?.(result.error || 'Xatolik yuz berdi')
    }

    setProcessing(false)
    return result
  }, [hapticFeedback, showAlert])

  return {
    processing,
    purchaseStars,
    sendTip,
    sendGift,
    purchaseContent,
    subscribe,
    requestWithdrawal,
    // Utility functions
    formatStars: payments.formatStars,
    formatMoney: payments.formatMoney,
    starsToUZS: payments.starsToUZS,
    starsToUSD: payments.starsToUSD,
  }
}

// Check if user has access to content
export function useContentAccess(userId: string | undefined, contentId: string) {
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !contentId) {
      setLoading(false)
      return
    }

    payments.hasUserPurchasedContent(userId, contentId).then(access => {
      setHasAccess(access)
      setLoading(false)
    })
  }, [userId, contentId])

  return { hasAccess, loading }
}

// Check subscription status
export function useSubscription(subscriberId: string | undefined, creatorId: string) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!subscriberId || !creatorId) {
      setLoading(false)
      return
    }

    payments.isUserSubscribed(subscriberId, creatorId).then(subscribed => {
      setIsSubscribed(subscribed)
      setLoading(false)
    })
  }, [subscriberId, creatorId])

  return { isSubscribed, loading }
}
