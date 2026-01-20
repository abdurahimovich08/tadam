'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useTelegram } from '@/hooks/useTelegram'
import type { User, Profile, ProfileView, ProfileLike, ProfileStats, ProfileAnalytics } from '@/types'

type TabType = 'posts' | 'likes' | 'insights'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isNewUser, setIsNewUser] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('posts')
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [recentViews, setRecentViews] = useState<ProfileView[]>([])
  const [recentLikes, setRecentLikes] = useState<ProfileLike[]>([])
  const [showViewers, setShowViewers] = useState(false)
  const [showLikers, setShowLikers] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const router = useRouter()
  const { hapticFeedback } = useTelegram()

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  const fetchProfileData = useCallback(async () => {
    if (!user) return

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      setPhotos([profileData.profile_picture_url, ...(profileData.photos || [])].filter(Boolean) as string[])
      if (!profileData.age || !profileData.profile_picture_url) {
        setIsNewUser(true)
      }
    } else {
      setIsNewUser(true)
    }

    // Fetch stats
    const { data: statsData } = await supabase
      .from('profile_stats')
      .select('*')
      .eq('profile_id', user.id)
      .single()
    
    if (statsData) {
      setStats(statsData)
    }

    // Fetch recent views
    const { data: viewsData } = await supabase
      .from('profile_views')
      .select('*')
      .eq('profile_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(20)
    
    if (viewsData) {
      setRecentViews(viewsData)
    }

    // Fetch recent likes
    const { data: likesData } = await supabase
      .from('profile_likes')
      .select('*')
      .eq('profile_id', user.id)
      .order('liked_at', { ascending: false })
      .limit(20)
    
    if (likesData) {
      setRecentLikes(likesData)
    }

    // Fetch match count
    const { count: matchesCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    
    setMatchCount(matchesCount || 0)

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchProfileData()
  }, [fetchProfileData])

  // Mark likes as seen when viewing likes tab
  useEffect(() => {
    if (activeTab === 'likes' && user && stats?.unseen_likes && stats.unseen_likes > 0) {
      supabase.rpc('mark_likes_seen', { p_profile_id: user.id })
    }
  }, [activeTab, user, stats?.unseen_likes])

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Hozir"
    if (diffMins < 60) return `${diffMins} daqiqa oldin`
    if (diffHours < 24) return `${diffHours} soat oldin`
    if (diffDays < 7) return `${diffDays} kun oldin`
    return date.toLocaleDateString('uz-UZ')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-5xl animate-pulse">👤</div>
      </div>
    )
  }

  if (isNewUser) {
    router.push('/profile/edit')
    return null
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header - Instagram style */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{user?.name}</h1>
            {profile?.verified && (
              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/wallet/creator" className="p-2 rounded-full hover:bg-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </Link>
            <Link href="/settings" className="p-2 rounded-full hover:bg-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Profile Header */}
      <div className="px-4 pt-4">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-pink-500 ring-offset-2 ring-offset-black">
              {photos[0] ? (
                <Image src={photos[0]} alt="" fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <span className="text-3xl">👤</span>
                </div>
              )}
            </div>
            {/* Story indicator */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white text-xs border-2 border-black">
              +
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 flex justify-around">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{photos.length}</div>
              <div className="text-xs text-gray-400">Postlar</div>
            </div>
            <button 
              onClick={() => { setShowLikers(true); hapticFeedback?.('light') }}
              className="text-center"
            >
              <div className="text-xl font-bold text-white">
                {stats?.total_likes || 0}
                {stats?.unseen_likes && stats.unseen_likes > 0 && (
                  <span className="ml-1 text-xs text-pink-500">+{stats.unseen_likes}</span>
                )}
              </div>
              <div className="text-xs text-gray-400">Yoqtirishlar</div>
            </button>
            <button 
              onClick={() => { setShowViewers(true); hapticFeedback?.('light') }}
              className="text-center"
            >
              <div className="text-xl font-bold text-white">{stats?.total_views || 0}</div>
              <div className="text-xs text-gray-400">Ko'rishlar</div>
            </button>
          </div>
        </div>

        {/* Bio */}
        <div className="mt-4">
          <div className="text-white font-semibold">{user?.name}, {profile?.age}</div>
          {profile?.bio && (
            <p className="text-gray-300 text-sm mt-1">{profile.bio}</p>
          )}
          {profile?.location && (
            <p className="text-gray-400 text-sm mt-1">📍 {profile.location}</p>
          )}
          {profile?.job && (
            <p className="text-gray-400 text-sm">💼 {profile.job}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Link
            href="/profile/edit"
            className="flex-1 py-2 rounded-lg bg-white/10 text-white text-sm font-semibold text-center"
          >
            Profilni tahrirlash
          </Link>
          <Link
            href="/wallet"
            className="flex-1 py-2 rounded-lg bg-white/10 text-white text-sm font-semibold text-center"
          >
            Hamyon
          </Link>
          <button className="px-4 py-2 rounded-lg bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </button>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-xl p-3 text-center border border-pink-500/30">
            <div className="text-lg font-bold text-pink-500">{matchCount}</div>
            <div className="text-[10px] text-gray-400">Matchlar</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-3 text-center border border-purple-500/30">
            <div className="text-lg font-bold text-purple-500">{stats?.views_today || 0}</div>
            <div className="text-[10px] text-gray-400">Bugun</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-3 text-center border border-blue-500/30">
            <div className="text-lg font-bold text-blue-500">{stats?.total_followers || 0}</div>
            <div className="text-[10px] text-gray-400">Obunachilar</div>
          </div>
          <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl p-3 text-center border border-amber-500/30">
            <div className="text-lg font-bold text-amber-500">{stats?.profile_score || 0}</div>
            <div className="text-[10px] text-gray-400">Reyting</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mt-6">
        <button
          onClick={() => { setActiveTab('posts'); hapticFeedback?.('light') }}
          className={`flex-1 py-3 text-center relative ${activeTab === 'posts' ? 'text-white' : 'text-gray-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
        </button>
        <button
          onClick={() => { setActiveTab('likes'); hapticFeedback?.('light') }}
          className={`flex-1 py-3 text-center relative ${activeTab === 'likes' ? 'text-white' : 'text-gray-500'}`}
        >
          <div className="relative inline-block">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            {stats?.unseen_likes && stats.unseen_likes > 0 && (
              <div className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-pink-500 text-[10px] text-white flex items-center justify-center">
                {stats.unseen_likes > 9 ? '9+' : stats.unseen_likes}
              </div>
            )}
          </div>
          {activeTab === 'likes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
        </button>
        <button
          onClick={() => { setActiveTab('insights'); hapticFeedback?.('light') }}
          className={`flex-1 py-3 text-center relative ${activeTab === 'insights' ? 'text-white' : 'text-gray-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          {activeTab === 'insights' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-fadeIn">
        {/* Posts Tab - Photo Grid */}
        {activeTab === 'posts' && (
          <div className="grid grid-cols-3 gap-0.5">
            {photos.map((photo, index) => (
              <Link
                key={index}
                href="/profile/edit"
                className="aspect-square relative group"
              >
                <Image src={photo} alt="" fill className="object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm">❤️ {Math.floor(Math.random() * 50)}</span>
                </div>
              </Link>
            ))}
            {/* Add more photos button */}
            <Link
              href="/profile/edit"
              className="aspect-square bg-white/5 flex flex-col items-center justify-center text-gray-500 hover:bg-white/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-xs mt-1">Qo'shish</span>
            </Link>
          </div>
        )}

        {/* Likes Tab */}
        {activeTab === 'likes' && (
          <div className="px-4 py-4">
            {recentLikes.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl block mb-4">💝</span>
                <p className="text-gray-400">Hali yoqtirishlar yo'q</p>
                <p className="text-gray-500 text-sm mt-2">Profilingizni yaxshilang va ko'proq like oling!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-white font-semibold mb-4">Sizni yoqtirganlar</h3>
                {recentLikes.map((like) => (
                  <div
                    key={like.id}
                    className={`flex items-center gap-3 p-3 rounded-xl ${like.is_seen ? 'bg-white/5' : 'bg-pink-500/20 border border-pink-500/30'}`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800">
                        {like.liker_photo ? (
                          <Image src={like.liker_photo} alt="" fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                        )}
                      </div>
                      {like.is_super_like && (
                        <div className="absolute -bottom-1 -right-1 text-sm">⭐</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{like.liker_name || 'Anonim'}</span>
                        {like.liker_age && (
                          <span className="text-gray-400">{like.liker_age}</span>
                        )}
                        {!like.is_seen && (
                          <span className="px-2 py-0.5 rounded-full bg-pink-500 text-white text-[10px]">Yangi</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs">{formatTimeAgo(like.liked_at)}</p>
                    </div>
                    <div className="text-2xl">{like.is_super_like ? '⭐' : '❤️'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="px-4 py-4 space-y-6">
            {/* Views Chart Placeholder */}
            <div className="bg-white/5 rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-4">📊 Ko'rishlar statistikasi</h3>
              <div className="flex items-end justify-around h-32 gap-2">
                {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((day, i) => (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <div 
                      className="w-8 bg-gradient-to-t from-pink-500 to-purple-500 rounded-t"
                      style={{ height: `${Math.random() * 80 + 20}%` }}
                    />
                    <span className="text-gray-500 text-xs">{day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Viewers */}
            <div className="bg-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">👁️ So'nggi ko'rganlar</h3>
                <button
                  onClick={() => setShowViewers(true)}
                  className="text-pink-500 text-sm"
                >
                  Barchasini ko'rish
                </button>
              </div>
              {recentViews.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Hali ko'rishlar yo'q</p>
              ) : (
                <div className="flex -space-x-2">
                  {recentViews.slice(0, 8).map((view) => (
                    <div
                      key={view.id}
                      className="w-10 h-10 rounded-full overflow-hidden border-2 border-black bg-gray-800"
                    >
                      {view.viewer_photo ? (
                        <Image src={view.viewer_photo} alt="" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                      )}
                    </div>
                  ))}
                  {recentViews.length > 8 && (
                    <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-black flex items-center justify-center text-white text-xs">
                      +{recentViews.length - 8}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Performance */}
            <div className="bg-white/5 rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-4">🎯 Samaradorlik</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Ko'rishdan Like ga</span>
                    <span className="text-white">
                      {stats?.total_views && stats.total_views > 0 
                        ? Math.round((stats.total_likes / stats.total_views) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                      style={{ 
                        width: `${stats?.total_views && stats.total_views > 0 
                          ? Math.round((stats.total_likes / stats.total_views) * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Like dan Match ga</span>
                    <span className="text-white">
                      {stats?.total_likes && stats.total_likes > 0 
                        ? Math.round((matchCount / stats.total_likes) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      style={{ 
                        width: `${stats?.total_likes && stats.total_likes > 0 
                          ? Math.round((matchCount / stats.total_likes) * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl p-4 border border-amber-500/30">
              <h3 className="text-white font-semibold mb-2">💡 Maslahatlar</h3>
              <ul className="text-gray-300 text-sm space-y-2">
                <li>• Ko'proq rasm qo'shing - 6 ta rasm optimal</li>
                <li>• Bio yozing - bu sizni boshqalardan ajratadi</li>
                <li>• Qiziqishlaringizni qo'shing</li>
                <li>• Har kuni faol bo'ling</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Viewers Modal */}
      {showViewers && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 animate-fadeIn"
          onClick={() => setShowViewers(false)}
        >
          <div 
            className="h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Profilingizni ko'rganlar</h2>
              <button
                onClick={() => setShowViewers(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {recentViews.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-6xl block mb-4">👁️</span>
                  <p className="text-gray-400">Hali ko'rganlar yo'q</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentViews.map((view) => (
                    <div key={view.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800">
                        {view.viewer_photo ? (
                          <Image src={view.viewer_photo} alt="" fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{view.viewer_name || 'Anonim'}</div>
                        <p className="text-gray-500 text-xs">{formatTimeAgo(view.viewed_at)}</p>
                      </div>
                      <div className="text-gray-400 text-xs">
                        {view.source === 'swipe' && '📱 Swipe'}
                        {view.source === 'profile' && '👤 Profil'}
                        {view.source === 'search' && '🔍 Qidiruv'}
                        {view.source === 'match' && '💕 Match'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Likers Modal */}
      {showLikers && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 animate-fadeIn"
          onClick={() => setShowLikers(false)}
        >
          <div 
            className="h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Sizni yoqtirganlar</h2>
              <button
                onClick={() => setShowLikers(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {recentLikes.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-6xl block mb-4">💝</span>
                  <p className="text-gray-400">Hali yoqtirishlar yo'q</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentLikes.map((like) => (
                    <div 
                      key={like.id} 
                      className={`flex items-center gap-3 p-3 rounded-xl ${like.is_seen ? 'bg-white/5' : 'bg-pink-500/20'}`}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800">
                          {like.liker_photo ? (
                            <Image src={like.liker_photo} alt="" fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                          )}
                        </div>
                        {like.is_super_like && (
                          <div className="absolute -bottom-1 -right-1 text-sm">⭐</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{like.liker_name || 'Anonim'}</span>
                          {like.liker_age && (
                            <span className="text-gray-400">{like.liker_age}</span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs">{formatTimeAgo(like.liked_at)}</p>
                      </div>
                      <div className="text-2xl">{like.is_super_like ? '⭐' : '❤️'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
