'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/hooks/useTelegram'
import type { User } from '@/types'

export default function Home() {
  const router = useRouter()
  const { user: tgUser, isReady } = useTelegram()
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
        let { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', tgUser.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error finding user:', error)
          return
        }

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

          await supabase.from('profiles').insert({ id: user.id })
        }

        localStorage.setItem('user', JSON.stringify(user))
        
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[var(--love-pink)] to-[var(--trust-purple)] animate-pulse flex items-center justify-center">
            <span className="text-5xl">💕</span>
          </div>
          <div className="absolute inset-0 rounded-full bg-[var(--love-pink)]/30 animate-ping" />
        </div>
        <p className="mt-6 text-[var(--app-text-secondary)] animate-pulse">Yuklanmoqda...</p>
      </div>
    )
  }

  if (status === 'authenticating') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="relative">
          <div className="loading-heart text-7xl">💕</div>
        </div>
        <h2 className="mt-6 text-xl font-bold text-[var(--app-text)]">Xush kelibsiz!</h2>
        <p className="mt-2 text-[var(--app-text-secondary)]">Kirish amalga oshirilmoqda...</p>
        
        {/* Progress dots */}
        <div className="flex gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[var(--love-pink)]"
              style={{
                animation: 'pulse 1s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  // No Telegram - Show landing page
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 text-6xl opacity-10 animate-float">💕</div>
          <div className="absolute top-40 right-10 text-4xl opacity-10 animate-float" style={{ animationDelay: '1s' }}>✨</div>
          <div className="absolute bottom-40 left-20 text-5xl opacity-10 animate-float" style={{ animationDelay: '2s' }}>💫</div>
          <div className="absolute bottom-20 right-20 text-4xl opacity-10 animate-float" style={{ animationDelay: '0.5s' }}>💖</div>
        </div>

        {/* Logo */}
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[var(--love-pink)] to-[var(--passion-red)] flex items-center justify-center shadow-2xl">
            <span className="text-6xl">💕</span>
          </div>
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-[var(--love-pink)] to-[var(--trust-purple)] opacity-30 blur-xl animate-pulse" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-gradient-love">Tanishuv</span>
        </h1>
        <p className="text-lg text-[var(--app-text-secondary)] mb-8 max-w-xs">
          Telegram orqali yangi odamlar bilan tanishing
        </p>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-10 max-w-sm">
          {[
            { emoji: '💯', label: 'Xavfsiz' },
            { emoji: '⚡', label: 'Tezkor' },
            { emoji: '💕', label: 'Haqiqiy' },
          ].map((feature, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl mb-2">{feature.emoji}</div>
              <p className="text-xs text-[var(--app-text-muted)]">{feature.label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="glass-card-elevated p-6 rounded-3xl max-w-sm w-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#24A1DE] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.74 3.99-1.74 6.65-2.89 7.99-3.45 3.8-1.6 4.59-1.87 5.1-1.88.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-[var(--app-text)]">Telegram Mini App</h3>
              <p className="text-xs text-[var(--app-text-muted)]">Ilovani Telegram ichida oching</p>
            </div>
          </div>
          
          <p className="text-sm text-[var(--app-text-secondary)] mb-4">
            Bu ilova faqat Telegram ichida ishlaydi. Botga o'ting va ilovani oching.
          </p>

          <div className="p-3 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)]">
            <p className="text-xs text-[var(--app-text-muted)] text-center">
              @tanishuv_bot ga o'ting →
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-xs text-[var(--app-text-muted)]">
          💕 Sevgi topish uchun yaratilgan
        </p>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
