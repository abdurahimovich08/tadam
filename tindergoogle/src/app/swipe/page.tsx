'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/hooks/useTelegram'
import { SwipeCard } from '@/components/SwipeCard'
import { MatchCelebration } from '@/components/MatchCelebration'
import type { User, UserWithProfile } from '@/types'

export default function Swipe() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<UserWithProfile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [matchedUser, setMatchedUser] = useState<UserWithProfile | null>(null)
  const [matchId, setMatchId] = useState<number | null>(null)
  const router = useRouter()
  const { hapticFeedback, showAlert } = useTelegram()

  // Load user
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  // Fetch users to swipe
  useEffect(() => {
    if (!user) return

    const fetchUsers = async () => {
      const settings = localStorage.getItem('settings')
      let minAge = 18, maxAge = 99, lookingFor = 'both'
      
      if (settings) {
        const parsed = JSON.parse(settings)
        minAge = parsed.minAge || 18
        maxAge = parsed.maxAge || 99
        lookingFor = parsed.lookingFor || 'both'
      }

      // Get already swiped user IDs
      const { data: swipedData } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id)

      const swipedIds = swipedData?.map(s => s.swiped_id) || []

      // Build query
      let query = supabase
        .from('users')
        .select('*, profiles!inner(*)')
        .neq('id', user.id)
        .gte('profiles.age', minAge)
        .lte('profiles.age', maxAge)

      if (lookingFor !== 'both') {
        query = query.eq('profiles.gender', lookingFor)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching users:', error)
      } else {
        const filteredUsers = (data || []).filter(u => !swipedIds.includes(u.id))
        // Shuffle for variety
        const shuffled = filteredUsers.sort(() => Math.random() - 0.5)
        setUsers(shuffled)
      }
      
      setLoading(false)
    }

    fetchUsers()
  }, [user])

  const handleSwipe = useCallback(async (liked: boolean) => {
    if (!user || users.length === 0) return

    const swipedUser = users[currentIndex]
    hapticFeedback(liked ? 'medium' : 'light')

    const { error } = await supabase.from('swipes').insert({
      swiper_id: user.id,
      swiped_id: swipedUser.id,
      liked,
    })

    if (error) {
      console.error('Error saving swipe:', error)
      hapticFeedback('error')
      return
    }

    // Check for match
    if (liked) {
      const { data: mutualLike } = await supabase
        .from('swipes')
        .select('*')
        .eq('swiper_id', swipedUser.id)
        .eq('swiped_id', user.id)
        .eq('liked', true)
        .single()

      if (mutualLike) {
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            user1_id: user.id,
            user2_id: swipedUser.id,
          })
          .select()
          .single()

        if (!matchError && match) {
          hapticFeedback('success')
          setMatchedUser(swipedUser)
          setMatchId(match.id)
        }
      }
    }

    setCurrentIndex(prev => prev + 1)
  }, [user, users, currentIndex, hapticFeedback])

  const handleCloseMatch = () => {
    setMatchedUser(null)
    setMatchId(null)
  }

  const handleMessageMatch = () => {
    if (matchId) {
      router.push(`/chat/${matchId}`)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="loading-heart text-6xl">💕</div>
        <p className="mt-4 text-[var(--app-text-secondary)] animate-pulse">
          Sizga mos odamlar qidirilmoqda...
        </p>
      </div>
    )
  }

  const currentUser = users[currentIndex]
  const nextUser = users[currentIndex + 1]

  // No more users
  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-elevated)] flex items-center justify-center">
            <span className="text-6xl">🔍</span>
          </div>
          <div className="absolute inset-0 rounded-full bg-[var(--love-pink)] opacity-20 animate-ping" />
        </div>
        
        <h2 className="text-2xl font-bold text-[var(--app-text)] mb-2">
          Hozircha hammasi shu
        </h2>
        <p className="text-[var(--app-text-secondary)] max-w-xs mb-8">
          Yangi odamlar qo'shilganda sizga xabar beramiz. Sozlamalarni o'zgartirib ko'ring.
        </p>
        
        <button
          onClick={() => router.push('/settings')}
          className="btn-secondary"
        >
          ⚙️ Sozlamalar
        </button>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Match celebration overlay */}
      {matchedUser && user && (
        <MatchCelebration
          user={{ ...user, profiles: null } as UserWithProfile}
          matchedUser={matchedUser}
          onClose={handleCloseMatch}
          onMessage={handleMessageMatch}
        />
      )}

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between p-4">
        <div>
          <h1 className="text-xl font-bold text-gradient-love">Tanishuv</h1>
          <p className="text-xs text-[var(--app-text-muted)]">
            {users.length - currentIndex} ta yangi odam
          </p>
        </div>
        <button 
          onClick={() => router.push('/settings')}
          className="w-10 h-10 rounded-full bg-[var(--app-surface)] flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[var(--app-text-secondary)]">
            <path d="M18.75 12.75h1.5a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5zM12 6a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 0112 6zM12 18a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 0112 18zM3.75 6.75h1.5a.75.75 0 100-1.5h-1.5a.75.75 0 000 1.5zM5.25 18.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 010 1.5zM3 12a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 013 12zM9 3.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zM12.75 12a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0zM9 15.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
          </svg>
        </button>
      </header>

      {/* Cards Stack */}
      <div className="flex-1 flex items-center justify-center px-4 pb-4">
        <div className="relative w-full max-w-[380px] aspect-[3/4]">
          {/* Next card (background) */}
          {nextUser && (
            <div className="absolute inset-0 transform scale-95 opacity-50">
              <SwipeCard
                user={nextUser}
                onSwipe={() => {}}
                isTop={false}
              />
            </div>
          )}
          
          {/* Current card */}
          <SwipeCard
            key={currentUser.id}
            user={currentUser}
            onSwipe={handleSwipe}
            isTop={true}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons pb-6 safe-bottom">
        {/* Dislike */}
        <button
          onClick={() => handleSwipe(false)}
          className="action-btn action-btn-dislike"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Super Like */}
        <button
          onClick={() => handleSwipe(true)}
          className="action-btn action-btn-super"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Like */}
        <button
          onClick={() => handleSwipe(true)}
          className="action-btn action-btn-like"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
