'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTelegram } from '@/hooks/useTelegram'
import { MatchCelebration } from '@/components/MatchCelebration'
import type { User, UserWithProfile } from '@/types'

type TabType = 'foryou' | 'nearby'

export default function Swipe() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<UserWithProfile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('foryou')
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [matchedUser, setMatchedUser] = useState<UserWithProfile | null>(null)
  const [matchId, setMatchId] = useState<number | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
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

  // Fetch users
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

      const { data: swipedData } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', user.id)

      const swipedIds = swipedData?.map(s => s.swiped_id) || []

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

      if (!error && data) {
        const filtered = data.filter(u => !swipedIds.includes(u.id))
        setUsers(filtered.sort(() => Math.random() - 0.5))
      }
      setLoading(false)
    }

    fetchUsers()
  }, [user])

  const handleSwipe = useCallback(async (liked: boolean) => {
    if (!user || users.length === 0) return

    const swipedUser = users[currentIndex]
    hapticFeedback(liked ? 'medium' : 'light')

    // Record swipe
    await supabase.from('swipes').insert({
      swiper_id: user.id,
      swiped_id: swipedUser.id,
      liked,
    })

    // Record profile view (for analytics)
    try {
      const storedUser = localStorage.getItem('user')
      const userData = storedUser ? JSON.parse(storedUser) : null
      await supabase.rpc('record_profile_view', {
        p_profile_id: swipedUser.id,
        p_viewer_id: user.id,
        p_viewer_name: userData?.name || null,
        p_viewer_photo: null,
        p_source: 'swipe',
        p_duration: 0
      })
    } catch (e) {
      console.error('Error recording view:', e)
    }

    if (liked) {
      // Record profile like (for analytics)
      try {
        const storedUser = localStorage.getItem('user')
        const userData = storedUser ? JSON.parse(storedUser) : null
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('age, profile_picture_url')
          .eq('id', user.id)
          .single()

        await supabase.rpc('record_profile_like', {
          p_profile_id: swipedUser.id,
          p_liker_id: user.id,
          p_liker_name: userData?.name || null,
          p_liker_photo: myProfile?.profile_picture_url || null,
          p_liker_age: myProfile?.age || null,
          p_is_super_like: false
        })
      } catch (e) {
        console.error('Error recording like:', e)
      }

      const { data: mutualLike } = await supabase
        .from('swipes')
        .select('*')
        .eq('swiper_id', swipedUser.id)
        .eq('swiped_id', user.id)
        .eq('liked', true)
        .single()

      if (mutualLike) {
        const { data: match } = await supabase
          .from('matches')
          .insert({ user1_id: user.id, user2_id: swipedUser.id })
          .select()
          .single()

        if (match) {
          hapticFeedback('success')
          setMatchedUser(swipedUser)
          setMatchId(match.id)
        }
      }
    }

    setCurrentIndex(prev => prev + 1)
    setCurrentPhotoIndex(0)
    setIsExpanded(false)
  }, [user, users, currentIndex, hapticFeedback])

  const currentUser = users[currentIndex]
  
  // Mock photos array (in production, this would come from profile.photos)
  const photos = currentUser ? [
    currentUser.profiles?.profile_picture_url,
    // Add more photos here if available
  ].filter(Boolean) : []

  const handlePhotoTap = (e: React.MouseEvent) => {
    if (isExpanded) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width
    
    if (x < width / 2) {
      // Left side - previous photo
      setCurrentPhotoIndex(prev => Math.max(0, prev - 1))
    } else {
      // Right side - next photo
      setCurrentPhotoIndex(prev => Math.min(photos.length - 1, prev + 1))
    }
    hapticFeedback('light')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-5xl animate-pulse">💕</div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-center">
        <div className="text-6xl mb-6">🔍</div>
        <h2 className="text-2xl font-bold text-white mb-2">Hozircha hammasi shu</h2>
        <p className="text-gray-400 mb-8">Keyinroq qaytib ko'ring</p>
        <button onClick={() => router.push('/settings')} className="px-6 py-3 bg-white/10 rounded-full text-white">
          Sozlamalar
        </button>
      </div>
    )
  }

  const profile = currentUser.profiles

  return (
    <div className="fixed inset-0 bg-black">
      {/* Match Celebration */}
      {matchedUser && user && (
        <MatchCelebration
          user={{ ...user, profiles: null } as UserWithProfile}
          matchedUser={matchedUser}
          onClose={() => { setMatchedUser(null); setMatchId(null) }}
          onMessage={() => matchId && router.push(`/chat/${matchId}`)}
        />
      )}

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Tabs */}
        <div className="flex bg-black/30 backdrop-blur-sm rounded-full p-1">
          <button
            onClick={() => setActiveTab('foryou')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'foryou' ? 'bg-white text-black' : 'text-white'
            }`}
          >
            FOR YOU
          </button>
          <button
            onClick={() => setActiveTab('nearby')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'nearby' ? 'bg-white text-black' : 'text-white'
            }`}
          >
            NEARBY
          </button>
        </div>

        <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
            <path d="M18.75 12.75h1.5a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5zM12 6a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 0112 6zM12 18a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 0112 18zM3.75 6.75h1.5a.75.75 0 100-1.5h-1.5a.75.75 0 000 1.5zM5.25 18.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 010 1.5zM3 12a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 013 12zM9 3.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zM12.75 12a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0zM9 15.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
          </svg>
        </button>
      </header>

      {/* Photo indicators */}
      {photos.length > 1 && (
        <div className="absolute top-20 left-4 right-4 z-20 flex gap-1">
          {photos.map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-1 rounded-full transition-all ${
                idx === currentPhotoIndex ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Main Card - Scrollable */}
      <div 
        ref={cardRef}
        className={`absolute inset-0 overflow-y-auto scroll-smooth ${isExpanded ? 'overflow-y-auto' : 'overflow-hidden'}`}
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {/* Photo Section */}
        <div 
          className="relative w-full h-screen flex-shrink-0"
          style={{ scrollSnapAlign: 'start' }}
          onClick={handlePhotoTap}
        >
          {/* Photo */}
          {photos[currentPhotoIndex] ? (
            <Image
              src={photos[currentPhotoIndex] as string}
              alt={currentUser.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
              <span className="text-[150px] opacity-50">👤</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

          {/* User Info Overlay */}
          <div className="absolute bottom-32 left-0 right-0 px-5">
            {/* Premium badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-400">★</span>
              <span className="text-yellow-400 text-sm font-semibold tracking-wider">PREMIUM</span>
            </div>

            {/* Name & Age */}
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-white">{currentUser.name}</h1>
              <span className="text-3xl text-gray-300">{profile?.age || '?'}</span>
              <button className="ml-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-white/60">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 mt-2 text-gray-300">
              <span className="text-lg">📍</span>
              <span>{profile?.location || 'Uzbekistan'}</span>
            </div>

            {/* Stats badges */}
            <div className="flex gap-2 mt-4">
              <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm flex items-center gap-2">
                <span className="text-pink-400">📍</span>
                <span className="text-white text-sm">2,5 km</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm flex items-center gap-2">
                <span>⚖️</span>
                <span className="text-white text-sm">55 Kg</span>
              </div>
              <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm flex items-center gap-2">
                <span>📏</span>
                <span className="text-white text-sm">178 cm</span>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div 
            className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(true)
              cardRef.current?.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
            }}
          >
            <span className="text-white/60 text-xs mb-1">Ko'proq</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white/60">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        {/* Extended Info Section */}
        <div 
          className="min-h-screen bg-black px-5 py-8"
          style={{ scrollSnapAlign: 'start' }}
        >
          {/* About */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">About</h2>
            <p className="text-gray-300 leading-relaxed">
              {profile?.bio || '👋 Salom! Men yangi do\'stlar izlayapman. Kitob o\'qish va sayohat qilishni yaxshi ko\'raman! 📚✈️'}
            </p>
          </section>

          {/* More Info - Tags */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">More info</h2>
            <div className="flex flex-wrap gap-2">
              {[
                { emoji: '👩', text: 'Women' },
                { emoji: '💃', text: 'Ballet dancer' },
                { emoji: '🎓', text: 'University' },
                { emoji: '🐱', text: 'Have cat' },
                { emoji: '🎨', text: 'Hobby' },
                { emoji: '🎉', text: 'I like it!' },
                { emoji: '🍷', text: 'Sometimes' },
                { emoji: '🚬', text: 'Sometimes' },
              ].map((tag, idx) => (
                <div 
                  key={idx}
                  className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm flex items-center gap-2"
                >
                  <span>{tag.emoji}</span>
                  <span className="text-white text-sm">{tag.text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Gallery */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Archive</h2>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((_, idx) => (
                <div 
                  key={idx}
                  className="aspect-square rounded-2xl bg-white/5 overflow-hidden"
                >
                  {photos[0] && idx === 0 ? (
                    <Image
                      src={photos[0] as string}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">
                      📷
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Spacer for action buttons */}
          <div className="h-32" />
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 bg-gradient-to-t from-black via-black to-transparent">
        <div className="flex items-center justify-center gap-4">
          {/* Pass */}
          <button
            onClick={() => handleSwipe(false)}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-black">
              <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              <path fill="white" d="M7 9l10 6M17 9l-10 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Message */}
          <button
            className="w-14 h-14 rounded-full bg-black border-2 border-white/20 flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
              <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
              <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
            </svg>
          </button>

          {/* Like */}
          <button
            onClick={() => handleSwipe(true)}
            className="w-20 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
