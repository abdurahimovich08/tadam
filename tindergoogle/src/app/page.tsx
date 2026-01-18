'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/hooks/useTelegram'
import { FullPageLoader } from '@/components/LoadingSpinner'
import type { User } from '@/types'

export default function Home() {
  const router = useRouter()
  const { webApp, user: tgUser, isReady } = useTelegram()
  const [status, setStatus] = useState<'loading' | 'no-telegram' | 'authenticating'>('loading')

  useEffect(() => {
    if (!isReady) return

    if (!tgUser) {
      setStatus('no-telegram')
      return
    }

    setStatus('authenticating')
    
    const handleLogin = async () => {
      try {
        // Check if user exists
        let { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', tgUser.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error finding user:', error)
          return
        }

        // Create user if doesn't exist
        if (!user) {
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              telegram_id: tgUser.id,
              name: `${tgUser.first_name} ${tgUser.last_name || ''}`.trim(),
            })
            .select()
            .single()

          if (insertError) {
            console.error('Error creating user:', insertError)
            return
          }
          user = newUser as User

          // Create empty profile for new user
          await supabase.from('profiles').insert({
            id: user.id,
          })
        }

        localStorage.setItem('user', JSON.stringify(user))
        
        // Check if profile is complete
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!profile?.age || !profile?.gender) {
          router.push('/profile')
        } else {
          router.push('/swipe')
        }
      } catch (err) {
        console.error('Login error:', err)
      }
    }

    handleLogin()
  }, [isReady, tgUser, router])

  if (status === 'loading') {
    return <FullPageLoader text="Ilovaga ulanmoqda..." />
  }

  if (status === 'authenticating') {
    return <FullPageLoader text="Kirish amalga oshirilmoqda..." />
  }

  // No Telegram WebApp detected
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="glass-card w-full max-w-sm rounded-2xl p-8 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--app-accent-soft)]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-[var(--app-accent)]">
            <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-[var(--app-text)]">
          Tanishuv
        </h1>
        <p className="mt-3 text-[var(--app-muted)]">
          Bu ilova faqat Telegram ichida ishlaydi. Iltimos, ilovani Telegram Mini App sifatida oching.
        </p>
        <div className="mt-6 rounded-xl bg-[var(--app-secondary)] p-4">
          <p className="text-sm text-[var(--app-muted)]">
            Telegram botga o'ting va "Start" tugmasini bosing
          </p>
        </div>
      </div>
    </div>
  )
}
