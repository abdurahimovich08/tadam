'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import type { UserWithProfile } from '@/types'

interface SwipeCardProps {
  user: UserWithProfile
  onSwipe: (liked: boolean) => void
  isTop: boolean
}

export function SwipeCard({ user, onSwipe, isTop }: SwipeCardProps) {
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const swipeThreshold = 100
  const rotation = (currentX / 20)
  const opacity = Math.max(0, 1 - Math.abs(currentX) / 300)

  const handleStart = (clientX: number) => {
    if (!isTop) return
    setStartX(clientX)
    setIsDragging(true)
  }

  const handleMove = (clientX: number) => {
    if (!isDragging || !isTop) return
    setCurrentX(clientX - startX)
  }

  const handleEnd = () => {
    if (!isDragging || !isTop) return
    setIsDragging(false)

    if (Math.abs(currentX) > swipeThreshold) {
      const liked = currentX > 0
      setExitDirection(liked ? 'right' : 'left')
      setTimeout(() => onSwipe(liked), 300)
    } else {
      setCurrentX(0)
    }
  }

  const getSwipeIndicator = () => {
    if (currentX > 50) return 'swiping-right'
    if (currentX < -50) return 'swiping-left'
    return ''
  }

  const profile = user.profiles

  return (
    <div
      ref={cardRef}
      className={`swipe-card ${getSwipeIndicator()} ${exitDirection ? `exit-${exitDirection}` : ''} ${isTop ? 'entering' : ''}`}
      style={{
        transform: isDragging 
          ? `translateX(${currentX}px) rotate(${rotation}deg)` 
          : exitDirection 
            ? undefined 
            : 'translateX(0) rotate(0)',
        opacity: exitDirection ? undefined : opacity,
        zIndex: isTop ? 10 : 5,
        pointerEvents: isTop ? 'auto' : 'none',
      }}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      {/* Background Image */}
      {profile?.profile_picture_url ? (
        <Image
          src={profile.profile_picture_url}
          alt={user.name}
          fill
          className="swipe-card-image"
          priority
          draggable={false}
        />
      ) : (
        <div className="swipe-card-image bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-elevated)] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-32 h-32 text-[var(--app-text-muted)]">
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="swipe-card-gradient" />

      {/* Content */}
      <div className="swipe-card-content">
        {/* Trust badges */}
        <div className="flex gap-2 mb-3">
          {profile?.age && (
            <span className="trust-badge">
              <span>📍</span>
              {profile.location || 'Yaqinda'}
            </span>
          )}
        </div>

        {/* Name & Age */}
        <div className="flex items-baseline">
          <h2 className="swipe-card-name">{user.name}</h2>
          {profile?.age && <span className="swipe-card-age">{profile.age}</span>}
        </div>

        {/* Bio */}
        {profile?.bio && (
          <p className="swipe-card-bio">{profile.bio}</p>
        )}

        {/* Compatibility hint - psychological trigger */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex -space-x-1">
            <div className="w-2 h-2 rounded-full bg-[var(--success-green)] animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-[var(--love-pink)] animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-[var(--calm-blue)] animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
          <span className="text-xs text-white/60">Sizga mos kelishi mumkin</span>
        </div>
      </div>

      {/* Like/Dislike indicators */}
      <div 
        className="absolute top-8 left-8 px-4 py-2 border-4 border-[var(--passion-red)] rounded-lg transform -rotate-12 opacity-0 transition-opacity"
        style={{ opacity: currentX < -50 ? Math.min(1, Math.abs(currentX) / 100) : 0 }}
      >
        <span className="text-2xl font-black text-[var(--passion-red)]">YO'Q</span>
      </div>
      
      <div 
        className="absolute top-8 right-8 px-4 py-2 border-4 border-[var(--success-green)] rounded-lg transform rotate-12 opacity-0 transition-opacity"
        style={{ opacity: currentX > 50 ? Math.min(1, currentX / 100) : 0 }}
      >
        <span className="text-2xl font-black text-[var(--success-green)]">HA</span>
      </div>
    </div>
  )
}
