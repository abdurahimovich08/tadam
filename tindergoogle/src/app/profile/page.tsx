'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useTelegram } from '@/hooks/useTelegram'
import type { User, Profile } from '@/types'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isNewUser, setIsNewUser] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
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

  useEffect(() => {
    if (!user) return

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setPhotos([data.profile_picture_url, ...(data.photos || [])].filter(Boolean) as string[])
        // Check if profile is complete
        if (!data.age || !data.profile_picture_url) {
          setIsNewUser(true)
        }
      } else {
        setIsNewUser(true)
      }
      setLoading(false)
    }

    fetchProfile()
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-5xl animate-pulse">👤</div>
      </div>
    )
  }

  // If new user or incomplete profile, redirect to edit
  if (isNewUser) {
    router.push('/profile/edit')
    return null
  }

  const completion = () => {
    let total = 0
    if (photos.length > 0) total += 25
    if (profile?.age && profile?.gender) total += 25
    if (profile?.bio) total += 25
    if (profile?.interests && profile.interests.length > 0) total += 25
    return total
  }

  return (
    <div className="min-h-screen bg-black pb-8">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/95 backdrop-blur-lg border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Profilim</h1>
          <Link
            href="/settings"
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
              <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Profile Card Preview */}
      <div className="px-4 py-6">
        <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 to-black">
          {/* Main Photo */}
          {photos[0] ? (
            <Image src={photos[0]} alt="" fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl opacity-30">👤</span>
            </div>
          )}

          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

          {/* Photo count indicator */}
          {photos.length > 1 && (
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
              <span className="text-white text-sm">📷 {photos.length}</span>
            </div>
          )}

          {/* User Info */}
          <div className="absolute bottom-4 left-4 right-4">
            {profile?.verified && (
              <div className="flex items-center gap-1 mb-2">
                <span className="text-blue-400">✓</span>
                <span className="text-blue-400 text-xs">Tasdiqlangan</span>
              </div>
            )}
            
            <h2 className="text-3xl font-bold text-white">
              {user?.name || 'Ism'}, {profile?.age || '??'}
            </h2>
            
            {profile?.location && (
              <p className="text-gray-300 text-sm mt-1">📍 {profile.location}</p>
            )}

            {profile?.job && (
              <p className="text-gray-400 text-sm mt-1">💼 {profile.job}</p>
            )}
          </div>

          {/* Edit button */}
          <Link
            href="/profile/edit"
            className="absolute top-4 left-4 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
              <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
            </svg>
            <span className="text-white text-sm font-medium">Tahrirlash</span>
          </Link>
        </div>

        {/* Profile Completion */}
        {completion() < 100 && (
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">Profil to'liqligi</span>
              <span className="text-pink-500 font-bold">{completion()}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all"
                style={{ width: `${completion()}%` }}
              />
            </div>
            <p className="text-gray-400 text-xs mt-2">
              To'liq profil 3x ko'proq match oladi!
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-white">0</div>
            <div className="text-xs text-gray-500">Likes</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-white">0</div>
            <div className="text-xs text-gray-500">Matches</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-pink-500">{photos.length}</div>
            <div className="text-xs text-gray-500">Rasmlar</div>
          </div>
        </div>
      </div>

      {/* Photos Grid */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Rasmlarim</h3>
          <Link href="/profile/edit" className="text-pink-500 text-sm">
            + Qo'shish
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Link
              key={index}
              href="/profile/edit"
              className="aspect-square rounded-xl overflow-hidden bg-white/5 relative"
            >
              {photos[index] ? (
                <Image src={photos[index]} alt="" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* About Section */}
      {profile?.bio && (
        <div className="px-4 mb-6">
          <h3 className="text-white font-semibold mb-3">Haqimda</h3>
          <div className="bg-white/5 rounded-2xl p-4">
            <p className="text-gray-300 text-sm">{profile.bio}</p>
          </div>
        </div>
      )}

      {/* Interests */}
      {profile?.interests && profile.interests.length > 0 && (
        <div className="px-4 mb-6">
          <h3 className="text-white font-semibold mb-3">Qiziqishlarim</h3>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest, idx) => (
              <span key={idx} className="px-4 py-2 rounded-full bg-white/10 text-white text-sm">
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="px-4 mb-6 space-y-3">
        {profile?.height && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5">
            <span className="text-2xl">📏</span>
            <div>
              <div className="text-white font-medium">{profile.height} cm</div>
              <div className="text-gray-500 text-xs">Bo'y</div>
            </div>
          </div>
        )}
        {profile?.education && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5">
            <span className="text-2xl">🎓</span>
            <div>
              <div className="text-white font-medium">{profile.education}</div>
              <div className="text-gray-500 text-xs">Ta'lim</div>
            </div>
          </div>
        )}
        {profile?.job && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5">
            <span className="text-2xl">💼</span>
            <div>
              <div className="text-white font-medium">{profile.job}</div>
              <div className="text-gray-500 text-xs">Ish</div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 space-y-3">
        <Link
          href="/profile/edit"
          className="block w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold text-center"
        >
          ✏️ Profilni tahrirlash
        </Link>
        
        <Link
          href="/settings"
          className="block w-full py-4 rounded-2xl bg-white/10 text-white font-semibold text-center"
        >
          ⚙️ Sozlamalar
        </Link>
      </div>
    </div>
  )
}
