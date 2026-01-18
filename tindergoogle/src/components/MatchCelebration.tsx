'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { UserWithProfile } from '@/types'

interface MatchCelebrationProps {
  user: UserWithProfile
  matchedUser: UserWithProfile
  onClose: () => void
  onMessage: () => void
}

export function MatchCelebration({ user, matchedUser, onClose, onMessage }: MatchCelebrationProps) {
  const [hearts, setHearts] = useState<Array<{ id: number; left: number; delay: number }>>([])
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; color: string; delay: number }>>([])

  useEffect(() => {
    // Generate floating hearts
    const newHearts = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
    }))
    setHearts(newHearts)

    // Generate confetti
    const colors = ['#ff4d6d', '#ff758f', '#7b2cbf', '#4361ee', '#ffd60a', '#06d6a0']
    const newConfetti = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 1,
    }))
    setConfetti(newConfetti)

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200])
    }
  }, [])

  return (
    <div className="match-overlay">
      {/* Confetti */}
      <div className="confetti">
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="confetti-piece"
            style={{
              left: `${piece.left}%`,
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}s`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        ))}
      </div>

      {/* Floating hearts */}
      <div className="match-hearts">
        {hearts.map((heart) => (
          <div
            key={heart.id}
            className="match-heart"
            style={{
              left: `${heart.left}%`,
              animationDelay: `${heart.delay}s`,
            }}
          >
            💕
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Match Title */}
        <div className="mb-8">
          <h1 className="match-title mb-2">IT'S A MATCH!</h1>
          <p className="text-[var(--app-text-secondary)] text-lg">
            Siz va {matchedUser.name} bir-biringizni yoqtirdingiz
          </p>
        </div>

        {/* Avatars */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {/* Current user */}
          <div className="relative">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[var(--love-pink)] shadow-lg">
              {user.profiles?.profile_picture_url ? (
                <Image
                  src={user.profiles.profile_picture_url}
                  alt={user.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--love-pink)] to-[var(--passion-red)] flex items-center justify-center text-white text-3xl font-bold">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[var(--success-green)] rounded-full flex items-center justify-center text-white text-lg">
              ✓
            </div>
          </div>

          {/* Heart animation */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse">
              💖
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[var(--love-pink)] opacity-30 animate-ping" />
            </div>
          </div>

          {/* Matched user */}
          <div className="relative">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[var(--love-pink)] shadow-lg">
              {matchedUser.profiles?.profile_picture_url ? (
                <Image
                  src={matchedUser.profiles.profile_picture_url}
                  alt={matchedUser.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--trust-purple)] to-[var(--calm-blue)] flex items-center justify-center text-white text-3xl font-bold">
                  {matchedUser.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[var(--success-green)] rounded-full flex items-center justify-center text-white text-lg">
              ✓
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={onMessage}
            className="btn-primary w-full text-lg"
          >
            💬 Xabar yozish
          </button>
          <button
            onClick={onClose}
            className="btn-secondary w-full"
          >
            Davom etish
          </button>
        </div>

        {/* Psychological hint */}
        <p className="mt-8 text-sm text-[var(--app-text-muted)] max-w-xs">
          💡 Birinchi xabar yuborishda erkinroq bo'ling - u ham sizni yoqtirdi!
        </p>
      </div>
    </div>
  )
}
