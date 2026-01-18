'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { User, Match } from '@/types'

interface MatchWithUsers extends Match {
  user1: User
  user2: User
  profile_picture_url?: string
  last_message?: {
    content: string
    created_at: string
    sender_id: string
  }
  unread_count?: number
}

export default function Matches() {
  const [user, setUser] = useState<User | null>(null)
  const [matches, setMatches] = useState<MatchWithUsers[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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

    const fetchMatches = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*, user1:user1_id(*), user2:user2_id(*)')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching matches:', error)
        setLoading(false)
        return
      }

      // Enrich with profile pictures and last messages
      const enriched = await Promise.all(
        (data || []).map(async (match) => {
          const otherUserId = match.user1.id === user.id ? match.user2.id : match.user1.id

          const [profileRes, messageRes] = await Promise.all([
            supabase.from('profiles').select('profile_picture_url').eq('id', otherUserId).single(),
            supabase.from('messages').select('content, created_at, sender_id').eq('match_id', match.id).order('created_at', { ascending: false }).limit(1).single(),
          ])

          return {
            ...match,
            profile_picture_url: profileRes.data?.profile_picture_url,
            last_message: messageRes.data || undefined,
          }
        })
      )

      // Sort by last message time
      enriched.sort((a, b) => {
        const timeA = a.last_message?.created_at || a.created_at
        const timeB = b.last_message?.created_at || b.created_at
        return new Date(timeB).getTime() - new Date(timeA).getTime()
      })

      setMatches(enriched)
      setLoading(false)
    }

    fetchMatches()

    // Subscribe to new messages for badge updates
    const channel = supabase
      .channel('matches-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchMatches()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => {
        fetchMatches()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'hozir'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}s`
    if (diffDays < 7) return `${diffDays}k`
    return date.toLocaleDateString('uz', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="loading-heart text-5xl">💬</div>
      </div>
    )
  }

  // Separate new matches (no messages) from conversations
  const newMatches = matches.filter(m => !m.last_message)
  const conversations = matches.filter(m => m.last_message)

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-4 bg-[var(--app-bg)]/95 backdrop-blur-lg">
        <h1 className="text-2xl font-bold text-gradient-love">Xabarlar</h1>
        <p className="text-sm text-[var(--app-text-muted)]">
          {matches.length > 0 ? `${matches.length} ta match` : 'Hali matchlar yo\'q'}
        </p>
      </header>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[var(--love-pink)]/20 to-[var(--trust-purple)]/20 flex items-center justify-center">
              <span className="text-5xl">💕</span>
            </div>
            <div className="absolute inset-0 rounded-full bg-[var(--love-pink)]/20 animate-ping" />
          </div>
          
          <h2 className="text-xl font-bold text-[var(--app-text)] mb-2">
            Matchlar kutmoqda
          </h2>
          <p className="text-[var(--app-text-secondary)] max-w-xs mb-6">
            Ko'proq like bosing va o'zaro yoqtirish bo'lsa match bo'lasiz!
          </p>
          
          <Link href="/swipe" className="btn-primary">
            💕 Tanishuvga o'tish
          </Link>
        </div>
      ) : (
        <div className="px-4">
          {/* New Matches Row */}
          {newMatches.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[var(--app-text-muted)] mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--love-pink)] animate-pulse" />
                Yangi matchlar
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                {newMatches.map((match) => {
                  const otherUser = match.user1.id === user?.id ? match.user2 : match.user1
                  return (
                    <Link
                      key={match.id}
                      href={`/chat/${match.id}`}
                      className="flex-shrink-0 text-center group"
                    >
                      <div className="relative">
                        {/* Animated border */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--love-pink)] to-[var(--trust-purple)] animate-spin" style={{ animationDuration: '3s', padding: '3px' }}>
                          <div className="w-full h-full rounded-full bg-[var(--app-bg)]" />
                        </div>
                        
                        <div className="relative w-20 h-20 rounded-full overflow-hidden border-3 border-[var(--app-bg)]">
                          {match.profile_picture_url ? (
                            <Image
                              src={match.profile_picture_url}
                              alt={otherUser.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[var(--love-pink)] to-[var(--trust-purple)] flex items-center justify-center text-white text-xl font-bold">
                              {otherUser.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* New badge */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[var(--love-pink)] rounded-full">
                          <span className="text-[10px] font-bold text-white">YANGI</span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm font-medium text-[var(--app-text)] truncate max-w-[80px]">
                        {otherUser.name}
                      </p>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Conversations */}
          {conversations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--app-text-muted)] mb-3">
                Suhbatlar
              </h3>
              <div className="space-y-2">
                {conversations.map((match) => {
                  const otherUser = match.user1.id === user?.id ? match.user2 : match.user1
                  const isUnread = match.last_message && match.last_message.sender_id !== user?.id

                  return (
                    <Link
                      key={match.id}
                      href={`/chat/${match.id}`}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--app-surface)] hover:bg-[var(--app-surface-elevated)] transition-all active:scale-[0.98]"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-full overflow-hidden">
                          {match.profile_picture_url ? (
                            <Image
                              src={match.profile_picture_url}
                              alt={otherUser.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[var(--trust-purple)] to-[var(--calm-blue)] flex items-center justify-center text-white text-lg font-bold">
                              {otherUser.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        {/* Online dot */}
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[var(--success-green)] rounded-full border-2 border-[var(--app-surface)]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-semibold truncate ${isUnread ? 'text-[var(--app-text)]' : 'text-[var(--app-text)]'}`}>
                            {otherUser.name}
                          </h4>
                          <span className={`text-xs ${isUnread ? 'text-[var(--love-pink)]' : 'text-[var(--app-text-muted)]'}`}>
                            {match.last_message && formatTime(match.last_message.created_at)}
                          </span>
                        </div>
                        <p className={`text-sm truncate mt-0.5 ${isUnread ? 'text-[var(--app-text)] font-medium' : 'text-[var(--app-text-muted)]'}`}>
                          {match.last_message?.sender_id === user?.id && (
                            <span className="text-[var(--app-text-muted)]">Siz: </span>
                          )}
                          {match.last_message?.content}
                        </p>
                      </div>

                      {isUnread && (
                        <div className="w-3 h-3 rounded-full bg-[var(--love-pink)]" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
