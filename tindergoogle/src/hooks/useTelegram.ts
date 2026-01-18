import { useEffect, useState } from 'react'

declare global {
  interface Window {
    Telegram: {
      WebApp: any
    }
  }
}

export function useTelegram() {
  const [webApp, setWebApp] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      setWebApp(window.Telegram.WebApp)
    }
  }, [])

  return webApp
}
