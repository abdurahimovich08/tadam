'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/hooks/useTelegram'
import type { User } from '@/types'

export default function Settings() {
  const [user, setUser] = useState<User | null>(null)
  const [minAge, setMinAge] = useState(18)
  const [maxAge, setMaxAge] = useState(50)
  const [lookingFor, setLookingFor] = useState<'male' | 'female' | 'both'>('both')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { hapticFeedback, showAlert, showConfirm } = useTelegram()

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

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
    hapticFeedback('success')
    localStorage.setItem('settings', JSON.stringify({ minAge, maxAge, lookingFor }))
    showAlert ? showAlert('✨ Sozlamalar saqlandi!') : alert('✨ Sozlamalar saqlandi!')
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
      if (confirm('Rostdan chiqmoqchimisiz?')) doLogout()
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="loading-heart text-5xl">⚙️</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-4 bg-[var(--app-bg)]/95 backdrop-blur-lg">
        <h1 className="text-2xl font-bold text-gradient-love">Sozlamalar</h1>
        <p className="text-sm text-[var(--app-text-muted)]">Qidiruv parametrlarini sozlang</p>
      </header>

      <div className="px-4 space-y-4">
        {/* Age Range */}
        <div className="glass-card-elevated rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[var(--love-pink)] to-[var(--passion-red)] flex items-center justify-center">
              <span className="text-lg">🎂</span>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--app-text)]">Yosh oralig'i</h3>
              <p className="text-xs text-[var(--app-text-muted)]">Kim ko'rsatilsin</p>
            </div>
          </div>

          {/* Visual range display */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--love-pink)]">{minAge}</div>
              <div className="text-xs text-[var(--app-text-muted)]">dan</div>
            </div>
            <div className="flex-1 h-1 bg-gradient-to-r from-[var(--love-pink)] to-[var(--trust-purple)] rounded-full" />
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--trust-purple)]">{maxAge}</div>
              <div className="text-xs text-[var(--app-text-muted)]">gacha</div>
            </div>
          </div>

          {/* Min Age Slider */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-[var(--app-text-muted)] mb-2">
              <span>Minimal</span>
              <span className="font-medium text-[var(--app-text)]">{minAge} yosh</span>
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
                hapticFeedback('light')
              }}
              className="w-full h-2 bg-[var(--app-surface)] rounded-full appearance-none cursor-pointer accent-[var(--love-pink)]"
            />
          </div>

          {/* Max Age Slider */}
          <div>
            <div className="flex justify-between text-sm text-[var(--app-text-muted)] mb-2">
              <span>Maksimal</span>
              <span className="font-medium text-[var(--app-text)]">{maxAge} yosh</span>
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
                hapticFeedback('light')
              }}
              className="w-full h-2 bg-[var(--app-surface)] rounded-full appearance-none cursor-pointer accent-[var(--trust-purple)]"
            />
          </div>
        </div>

        {/* Looking For */}
        <div className="glass-card-elevated rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[var(--trust-purple)] to-[var(--calm-blue)] flex items-center justify-center">
              <span className="text-lg">💕</span>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--app-text)]">Kimlarni ko'rsatish</h3>
              <p className="text-xs text-[var(--app-text-muted)]">Qiziqishingizni tanlang</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { value: 'female', label: 'Ayollar', emoji: '👩', desc: 'Faqat ayollar ko\'rsatilsin' },
              { value: 'male', label: 'Erkaklar', emoji: '👨', desc: 'Faqat erkaklar ko\'rsatilsin' },
              { value: 'both', label: 'Hammasi', emoji: '👥', desc: 'Barcha odamlar ko\'rsatilsin' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setLookingFor(option.value as typeof lookingFor)
                  hapticFeedback('light')
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                  lookingFor === option.value
                    ? 'bg-gradient-to-r from-[var(--love-pink)] to-[var(--trust-purple)] text-white scale-[1.02]'
                    : 'bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-surface-elevated)]'
                }`}
              >
                <span className="text-2xl">{option.emoji}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium">{option.label}</div>
                  <div className={`text-xs ${lookingFor === option.value ? 'text-white/70' : 'text-[var(--app-text-muted)]'}`}>
                    {option.desc}
                  </div>
                </div>
                {lookingFor === option.value && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Psychological tip */}
        <div className="rounded-2xl p-4 bg-gradient-to-r from-[var(--success-green)]/10 to-[var(--calm-blue)]/10 border border-[var(--success-green)]/20">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <h4 className="font-medium text-[var(--app-text)] text-sm">Pro maslahat</h4>
              <p className="text-xs text-[var(--app-text-secondary)] mt-1">
                Yosh oralig'ini kengaytirish ko'proq match olishga yordam beradi. Yangi odamlar bilan tanishing!
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button onClick={handleSave} className="btn-primary w-full text-lg">
          ✨ Saqlash
        </button>

        {/* Divider */}
        <div className="h-px bg-[var(--app-border)] my-6" />

        {/* Account Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--app-text-muted)] px-1">Hisob</h3>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--app-surface)] hover:bg-red-500/10 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500">
                <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-red-500">Chiqish</div>
              <div className="text-xs text-[var(--app-text-muted)]">Hisobdan chiqish</div>
            </div>
          </button>
        </div>

        {/* App info */}
        <div className="text-center pt-8 pb-4">
          <div className="text-2xl mb-2">💕</div>
          <p className="text-sm font-medium text-[var(--app-text)]">Tanishuv</p>
          <p className="text-xs text-[var(--app-text-muted)]">v1.0.0 • Telegram Mini App</p>
          <p className="text-xs text-[var(--app-text-muted)] mt-2">Sevgi topish uchun yaratilgan</p>
        </div>
      </div>
    </div>
  )
}
