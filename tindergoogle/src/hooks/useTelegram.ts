'use client'

import { useEffect, useState, useCallback } from 'react'
import type { TelegramWebApp } from '@/types'

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const checkTelegram = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tgWebApp = window.Telegram.WebApp
        setWebApp(tgWebApp)
        tgWebApp.ready()
        setIsReady(true)
        return true
      }
      return false
    }

    // Check immediately
    if (checkTelegram()) return

    // If not available, poll for it (script might still be loading)
    const interval = setInterval(() => {
      if (checkTelegram()) {
        clearInterval(interval)
      }
    }, 100)

    // Cleanup after 5 seconds if still not loaded
    const timeout = setTimeout(() => {
      clearInterval(interval)
      setIsReady(true) // Mark as ready even without Telegram (for browser testing)
    }, 5000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  const showBackButton = useCallback(() => {
    webApp?.BackButton.show()
  }, [webApp])

  const hideBackButton = useCallback(() => {
    webApp?.BackButton.hide()
  }, [webApp])

  const onBackButtonClick = useCallback((callback: () => void) => {
    if (webApp) {
      webApp.BackButton.onClick(callback)
      return () => webApp.BackButton.offClick(callback)
    }
    return () => {}
  }, [webApp])

  const showMainButton = useCallback((text: string, onClick: () => void) => {
    if (webApp) {
      webApp.MainButton.setText(text)
      webApp.MainButton.onClick(onClick)
      webApp.MainButton.show()
    }
  }, [webApp])

  const hideMainButton = useCallback(() => {
    webApp?.MainButton.hide()
  }, [webApp])

  const hapticFeedback = useCallback((type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy') => {
    if (webApp) {
      if (type === 'success' || type === 'error' || type === 'warning') {
        webApp.HapticFeedback.notificationOccurred(type)
      } else {
        webApp.HapticFeedback.impactOccurred(type)
      }
    }
  }, [webApp])

  return {
    webApp,
    isReady,
    user: webApp?.initDataUnsafe?.user,
    colorScheme: webApp?.colorScheme || 'light',
    themeParams: webApp?.themeParams,
    showBackButton,
    hideBackButton,
    onBackButtonClick,
    showMainButton,
    hideMainButton,
    hapticFeedback,
    showAlert: webApp?.showAlert,
    showConfirm: webApp?.showConfirm,
    expand: webApp?.expand,
    close: webApp?.close,
  }
}
