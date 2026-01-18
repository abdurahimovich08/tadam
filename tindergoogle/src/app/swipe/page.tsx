'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTelegram } from '@/hooks/useTelegram'
import { FullPageLoader } from '@/components/LoadingSpinner'
import type { User, UserWithProfile } from '@/types'

export default function Swipe() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<UserWithProfile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [swiping, setSwiping] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const router = useRouter()
  const { webApp, hapticFeedback, showAlert } = useTelegram()

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
      // Get settings
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

      // Build query for users
      let query = supabase
        .from('users')
        .select('*, profiles!inner(*)')
        .neq('id', user.id)
        .gte('profiles.age', minAge)
        .lte('profiles.age', maxAge)

      // Filter by gender preference
      if (lookingFor !== 'both') {
        query = query.eq('profiles.gender', lookingFor)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching users:', error)
      } else {
        // Filter out already swiped users
        const filteredUsers = (data || []).filter(u => !swipedIds.includes(u.id))
        setUsers(filteredUsers)
      }
      
      setLoading(false)
    }

    fetchUsers()
  }, [user])

  const handleSwipe = useCallback(async (liked: boolean) => {
    if (!user || users.length === 0 || swiping) return

    setSwiping(true)
    setSwipeDirection(liked ? 'right' : 'left')
    hapticFeedback(liked ? 'medium' : 'light')

    const swipedUser = users[currentIndex]

    // Animate out
    await new Promise(resolve => setTimeout(resolve, 300))

    const { error } = await supabase.from('swipes').insert({
      swiper_id: user.id,
      swiped_id: swipedUser.id,
      liked,
    })

    if (error) {
      console.error('Error saving swipe:', error)
      hapticFeedback('error')
      setSwiping(false)
      setSwipeDirection(null)
      return
    }

    // Check for match if liked
    if (liked) {
      const { data: mutualLike } = await supabase
        .from('swipes')
        .select('*')
        .eq('swiper_id', swipedUser.id)
        .eq('swiped_id', user.id)
        .eq('liked', true)
        .single()

      if (mutualLike) {
        // It's a match!
        const { error: matchError } = await supabase.from('matches').insert({
          user1_id: user.id,
          user2_id: swipedUser.id,
        })

        if (!matchError) {
          hapticFeedback('success')
          if (showAlert) {
            showAlert(`🎉 ${swipedUser.name} bilan match bo'ldingiz!`)
          } else {
            alert(`🎉 ${swipedUser.name} bilan match bo'ldingiz!`)
          }
        }
      }
    }

    setCurrentIndex(prev => prev + 1)
    setSwiping(false)
    setSwipeDirection(null)
  }, [user, users, currentIndex, swiping, hapticFeedback, showAlert])

  if (loading) {
    return <FullPageLoader text="Foydalanuvchilar yuklanmoqda..." />
  }

  const currentUser = users[currentIndex]

  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--app-secondary)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-[var(--app-muted)]">
              <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
              <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-[var(--app-text)]">
            Hozircha boshqa foydalanuvchilar yo'q
          </h2>
          <p className="mt-2 text-[var(--app-muted)]">
            Keyinroq qaytib ko'ring yoki sozlamalarni o'zgartiring
          </p>
          <button
            onClick={() => router.push('/settings')}
            className="mt-6 rounded-xl bg-[var(--app-accent)] px-6 py-3 font-semibold text-white transition-all hover:opacity-90"
          >
            Sozlamalarga o'tish
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col p-4">
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="font-display text-xl font-bold text-[var(--app-text)]">Tanishuv</h1>
        <p className="text-sm text-[var(--app-muted)]">
          {users.length - currentIndex} ta foydalanuvchi qoldi
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className={`glass-card relative w-full max-w-sm overflow-hidden rounded-3xl transition-all duration-300 ${
            swipeDirection === 'left' ? '-translate-x-full rotate-[-20deg] opacity-0' :
            swipeDirection === 'right' ? 'translate-x-full rotate-[20deg] opacity-0' : ''
          }`}
        >
          {/* Photo */}
          <div className="relative aspect-[3/4] w-full bg-[var(--app-secondary)]">
            {currentUser.profiles?.profile_picture_url ? (
              <Image
                src={currentUser.profiles.profile_picture_url}
                alt={currentUser.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-24 h-24 text-[var(--app-muted)]">
                  <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h2 className="font-display text-2xl font-bold">
                {currentUser.name}
                {currentUser.profiles?.age && (
                  <span className="font-normal">, {currentUser.profiles.age}</span>
                )}
              </h2>
              {currentUser.profiles?.location && (
                <p className="mt-1 flex items-center gap-1 text-sm text-white/80">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                  </svg>
                  {currentUser.profiles.location}
                </p>
              )}
              {currentUser.profiles?.bio && (
                <p className="mt-3 text-sm text-white/90 line-clamp-3">
                  {currentUser.profiles.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-center gap-6 pb-4">
        <button
          onClick={() => handleSwipe(false)}
          disabled={swiping}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500 bg-white text-red-500 shadow-lg transition-all hover:scale-110 hover:bg-red-500 hover:text-white active:scale-95 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </button>
        
        <button
          onClick={() => handleSwipe(true)}
          disabled={swiping}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--app-accent)] to-pink-500 text-white shadow-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
