'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FullPageLoader } from '@/components/LoadingSpinner'
import type { User, Match } from '@/types'

interface MatchWithUsers extends Match {
  user1: User
  user2: User
  last_message?: {
    content: string
    created_at: string
  }
}

export default function Matches() {
  const [user, setUser] = useState<User | null>(null)
  const [matches, setMatches] = useState<MatchWithUsers[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load user
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  // Fetch matches
  useEffect(() => {
    if (!user) return

    const fetchMatches = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          user1:user1_id(id, name, telegram_id),
          user2:user2_id(id, name, telegram_id)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching matches:', error)
      } else {
        // Fetch profile pictures for matches
        const matchesWithProfiles = await Promise.all(
          (data || []).map(async (match) => {
            const otherUserId = match.user1.id === user.id ? match.user2.id : match.user1.id
            
            // Get profile picture
            const { data: profile } = await supabase
              .from('profiles')
              .select('profile_picture_url')
              .eq('id', otherUserId)
              .single()

            // Get last message
            const { data: lastMessage } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('match_id', match.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            const otherUser = match.user1.id === user.id ? match.user2 : match.user1
            return {
              ...match,
              user1: match.user1.id === user.id ? match.user1 : { ...otherUser, profile_picture_url: profile?.profile_picture_url },
              user2: match.user1.id === user.id ? { ...otherUser, profile_picture_url: profile?.profile_picture_url } : match.user2,
              last_message: lastMessage || undefined,
            }
          })
        )
        setMatches(matchesWithProfiles)
      }
      setLoading(false)
    }

    fetchMatches()

    // Subscribe to new matches
    const channel = supabase
      .channel('matches')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `user1_id=eq.${user.id}`,
        },
        () => fetchMatches()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `user2_id=eq.${user.id}`,
        },
        () => fetchMatches()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  if (loading) {
    return <FullPageLoader text="Matchlar yuklanmoqda..." />
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--app-text)]">Matchlar</h1>
        <p className="text-sm text-[var(--app-muted)]">
          {matches.length > 0 ? `${matches.length} ta match` : 'Hali matchlar yo\'q'}
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--app-secondary)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-[var(--app-muted)]">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-[var(--app-text)]">
            Hali matchlar yo'q
          </h2>
          <p className="mt-2 max-w-xs text-[var(--app-muted)]">
            Ko'proq odamlarga like bosing va o'zaro like bo'lsa match bo'lasiz!
          </p>
          <Link
            href="/swipe"
            className="mt-6 rounded-xl bg-[var(--app-accent)] px-6 py-3 font-semibold text-white transition-all hover:opacity-90"
          >
            Tanishuvga o'tish
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const otherUser = match.user1.id === user?.id ? match.user2 : match.user1
            const profilePicture = (otherUser as any).profile_picture_url

            return (
              <Link
                key={match.id}
                href={`/chat/${match.id}`}
                className="glass-card flex items-center gap-4 rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-[var(--app-secondary)]">
                  {profilePicture ? (
                    <Image
                      src={profilePicture}
                      alt={otherUser.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-[var(--app-muted)]">
                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--app-text)]">{otherUser.name}</h3>
                  {match.last_message ? (
                    <p className="truncate text-sm text-[var(--app-muted)]">
                      {match.last_message.content}
                    </p>
                  ) : (
                    <p className="text-sm text-[var(--app-accent)]">
                      Yangi match! Salom ayting 👋
                    </p>
                  )}
                </div>
                {match.last_message && (
                  <span className="text-xs text-[var(--app-muted)]">
                    {formatTime(match.last_message.created_at)}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'hozir'
  if (diffMins < 60) return `${diffMins} min`
  if (diffHours < 24) return `${diffHours} soat`
  if (diffDays < 7) return `${diffDays} kun`
  
  return date.toLocaleDateString('uz', { day: 'numeric', month: 'short' })
}
