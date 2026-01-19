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
    packageId: string,
    starsAmount: number,
    priceStars: number,
    onSuccess?: () => void
  ) => {
    if (!webApp) {
      showAlert?.('Telegram WebApp mavjud emas')
      return false
    }

    setProcessing(true)
    hapticFeedback?.('light')

    try {
      // In production, you would call your backend to create an invoice
      // and get the invoice URL from Telegram Bot API
      // For now, we'll show a placeholder
      
      // Example of how it would work:
      // const response = await fetch('/api/create-invoice', {
      //   method: 'POST',
      //   body: JSON.stringify({ packageId, starsAmount, priceStars }),
      // })
      // const { invoiceUrl } = await response.json()
      // webApp.openInvoice(invoiceUrl, (status) => { ... })

      // Placeholder for demo
      showAlert?.(`${starsAmount} Stars sotib olish - ${priceStars} Telegram Stars`)
      
      // Simulate success for demo
      onSuccess?.()
      hapticFeedback?.('success')
      return true
    } catch (err) {
      console.error('Purchase error:', err)
      hapticFeedback?.('error')
      showAlert?.('Sotib olishda xatolik yuz berdi')
      return false
    } finally {
      setProcessing(false)
    }
  }, [webApp, hapticFeedback, showAlert])

  // Send tip
  const sendTip = useCallback(async (
    senderId: string,
    receiverId: string,
    amount: number,
    message?: string,
    isAnonymous?: boolean
  ) => {
    setProcessing(true)
    hapticFeedback?.('light')

    const result = await payments.sendTip(senderId, receiverId, amount, message, isAnonymous)

    if (result.success) {
      hapticFeedback?.('success')
    } else {
      hapticFeedback?.('error')
      showAlert?.(result.error || 'Xatolik yuz berdi')
    }

    setProcessing(false)
    return result
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
