'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/hooks/useTelegram'
import { FullPageLoader } from '@/components/LoadingSpinner'
import type { User } from '@/types'

export default function Settings() {
  const [user, setUser] = useState<User | null>(null)
  const [minAge, setMinAge] = useState(18)
  const [maxAge, setMaxAge] = useState(50)
  const [lookingFor, setLookingFor] = useState<'male' | 'female' | 'both'>('both')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { hapticFeedback, showAlert, showConfirm } = useTelegram()

  // Load user
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  // Load settings
  useEffect(() => {
    if (!user) return

    const settings = localStorage.getItem('settings')
    if (settings) {
      const parsed = JSON.parse(settings)
      setMinAge(parsed.minAge || 18)
      setMaxAge(parsed.maxAge || 50)
      setLookingFor(parsed.lookingFor || 'both')
    }
    setLoading(false)
  }, [user])

  const handleSave = () => {
    hapticFeedback('light')
    localStorage.setItem('settings', JSON.stringify({ minAge, maxAge, lookingFor }))
    showAlert ? showAlert('Sozlamalar saqlandi!') : alert('Sozlamalar saqlandi!')
  }

  const handleLogout = () => {
    const doLogout = () => {
      localStorage.removeItem('user')
      localStorage.removeItem('settings')
      hapticFeedback('medium')
      router.push('/')
    }

    if (showConfirm) {
      showConfirm('Rostdan chiqmoqchimisiz?', (confirmed) => {
        if (confirmed) doLogout()
      })
    } else {
      if (confirm('Rostdan chiqmoqchimisiz?')) {
        doLogout()
      }
    }
  }

  if (loading) {
    return <FullPageLoader text="Sozlamalar yuklanmoqda..." />
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-[var(--app-text)]">Sozlamalar</h1>
          <p className="text-sm text-[var(--app-muted)]">Qidiruv parametrlarini sozlang</p>
        </div>

        {/* Age Range */}
        <div className="glass-card rounded-2xl p-5 mb-4">
          <h3 className="font-semibold text-[var(--app-text)] mb-4">Yosh oralig'i</h3>
          
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--app-muted)]">Minimal yosh</span>
              <span className="text-lg font-bold text-[var(--app-accent)]">{minAge}</span>
            </div>
            <input
              type="range"
              min="18"
              max="70"
              value={minAge}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                setMinAge(val)
                if (val > maxAge) setMaxAge(val)
              }}
              className="w-full h-2 bg-[var(--app-secondary)] rounded-full appearance-none cursor-pointer accent-[var(--app-accent)]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--app-muted)]">Maksimal yosh</span>
              <span className="text-lg font-bold text-[var(--app-accent)]">{maxAge}</span>
            </div>
            <input
              type="range"
              min="18"
              max="70"
              value={maxAge}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                setMaxAge(val)
                if (val < minAge) setMinAge(val)
              }}
              className="w-full h-2 bg-[var(--app-secondary)] rounded-full appearance-none cursor-pointer accent-[var(--app-accent)]"
            />
          </div>

          <div className="mt-4 text-center">
            <span className="inline-block rounded-full bg-[var(--app-accent-soft)] px-4 py-2 text-sm font-medium text-[var(--app-accent)]">
              {minAge} - {maxAge} yosh
            </span>
          </div>
        </div>

        {/* Looking For */}
        <div className="glass-card rounded-2xl p-5 mb-4">
          <h3 className="font-semibold text-[var(--app-text)] mb-4">Kimlarni ko'rsatish</h3>
          <div className="space-y-2">
            {[
              { value: 'male', label: 'Faqat erkaklar', icon: '👨' },
              { value: 'female', label: 'Faqat ayollar', icon: '👩' },
              { value: 'both', label: 'Hammasi', icon: '👥' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setLookingFor(option.value as typeof lookingFor)}
                className={`w-full flex items-center gap-3 rounded-xl p-4 text-left transition-all ${
                  lookingFor === option.value
                    ? 'bg-[var(--app-accent)] text-white'
                    : 'bg-[var(--app-secondary)] text-[var(--app-text)] hover:bg-[var(--app-accent-soft)]'
                }`}
              >
                <span className="text-xl">{option.icon}</span>
                <span className="font-medium">{option.label}</span>
                {lookingFor === option.value && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 ml-auto">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full rounded-2xl bg-[var(--app-accent)] py-4 font-semibold text-white transition-all hover:opacity-90"
        >
          Saqlash
        </button>

        {/* Logout */}
        <div className="mt-8 pt-6 border-t border-[var(--app-outline)]">
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl border-2 border-red-500 py-4 font-semibold text-red-500 transition-all hover:bg-red-500 hover:text-white"
          >
            Chiqish
          </button>
        </div>

        {/* App Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[var(--app-muted)]">Tanishuv v1.0.0</p>
          <p className="text-xs text-[var(--app-muted)] mt-1">Telegram Mini App</p>
        </div>
      </div>
    </div>
  )
}
