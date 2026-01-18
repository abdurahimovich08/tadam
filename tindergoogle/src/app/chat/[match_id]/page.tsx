'use client'

import { useEffect, useState, useRef, use } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTelegram } from '@/hooks/useTelegram'
import type { User, Message } from '@/types'

export default function Chat({ params }: { params: Promise<{ match_id: string }> }) {
  const { match_id: matchId } = use(params)
  
  const [user, setUser] = useState<User | null>(null)
  const [otherUser, setOtherUser] = useState<User & { profile_picture_url?: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { hapticFeedback, showBackButton, onBackButtonClick } = useTelegram()

  // Setup back button
  useEffect(() => {
    showBackButton()
    const cleanup = onBackButtonClick(() => router.push('/matches'))
    return cleanup
  }, [showBackButton, onBackButtonClick, router])

  // Load user
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  // Fetch match and messages
  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      // Get match with users
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*, user1:user1_id(*), user2:user2_id(*)')
        .eq('id', matchId)
        .single()

      if (matchError || !match) {
        router.push('/matches')
        return
      }

      const other = match.user1.id === user.id ? match.user2 : match.user1
      
      // Get profile picture
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_picture_url')
        .eq('id', other.id)
        .single()

      setOtherUser({ ...other, profile_picture_url: profile?.profile_picture_url })

      // Fetch messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })

      setMessages(messagesData || [])
      setLoading(false)
    }

    fetchData()

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => [...prev, newMsg])
          if (newMsg.sender_id !== user.id) {
            hapticFeedback('success')
            setIsTyping(false)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, matchId, router, hapticFeedback])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newMessage.trim() || sending) return

    const content = newMessage.trim()
    setNewMessage('')
    setSending(true)
    hapticFeedback('light')

    const { error } = await supabase.from('messages').insert({
      match_id: parseInt(matchId),
      sender_id: user.id,
      content,
    })

    if (error) {
      setNewMessage(content)
      hapticFeedback('error')
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Bugun'
    if (date.toDateString() === yesterday.toDateString()) return 'Kecha'
    return date.toLocaleDateString('uz', { day: 'numeric', month: 'long' })
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(message)
    return groups
  }, {} as Record<string, Message[]>)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="loading-heart text-5xl">💬</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--app-bg)]">
      {/* Header */}
      <header className="relative z-10 flex items-center gap-3 px-4 py-3 bg-[var(--app-bg)]/95 backdrop-blur-lg border-b border-[var(--app-border)]">
        <button 
          onClick={() => router.push('/matches')}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--app-surface)] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="relative">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-[var(--app-surface)]">
            {otherUser?.profile_picture_url ? (
              <Image src={otherUser.profile_picture_url} alt="" fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-[var(--app-text-muted)]">
                {otherUser?.name.charAt(0)}
              </div>
            )}
          </div>
          {/* Online indicator */}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--success-green)] rounded-full border-2 border-[var(--app-bg)]" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-[var(--app-text)] truncate">{otherUser?.name}</h1>
          <p className="text-xs text-[var(--success-green)]">
            {isTyping ? 'yozmoqda...' : 'online'}
          </p>
        </div>

        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--app-surface)] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[var(--app-text-secondary)]">
            <path fillRule="evenodd" d="M10.5 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
          </svg>
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--love-pink)] to-[var(--trust-purple)] flex items-center justify-center mb-4">
              <span className="text-4xl">👋</span>
            </div>
            <h3 className="text-lg font-semibold text-[var(--app-text)] mb-2">
              Suhbatni boshlang!
            </h3>
            <p className="text-sm text-[var(--app-text-muted)] max-w-xs">
              Siz va {otherUser?.name} bir-biringizni yoqtirdingiz. Birinchi qadamni tashlang! 💕
            </p>

            {/* Conversation starters */}
            <div className="mt-6 space-y-2 w-full max-w-xs">
              <p className="text-xs text-[var(--app-text-muted)] mb-2">Boshlash uchun g'oyalar:</p>
              {[
                'Salom! Tanishganimdan xursandman 😊',
                'Profilingiz juda qiziq ekan! ✨',
                'Qaysi shahardansiz? 🏙️',
              ].map((starter, i) => (
                <button
                  key={i}
                  onClick={() => setNewMessage(starter)}
                  className="w-full p-3 rounded-xl bg-[var(--app-surface)] text-sm text-[var(--app-text-secondary)] text-left hover:bg-[var(--app-surface-elevated)] transition-colors"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 rounded-full bg-[var(--app-surface)] text-xs text-[var(--app-text-muted)]">
                    {formatDate(msgs[0].created_at)}
                  </span>
                </div>

                {/* Messages */}
                {msgs.map((message, index) => {
                  const isOwn = message.sender_id === user?.id
                  const showAvatar = !isOwn && (index === 0 || msgs[index - 1].sender_id !== message.sender_id)

                  return (
                    <div
                      key={message.id}
                      className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isOwn && (
                        <div className="w-8 mr-2">
                          {showAvatar && (
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--app-surface)]">
                              {otherUser?.profile_picture_url ? (
                                <Image src={otherUser.profile_picture_url} alt="" width={32} height={32} className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                                  {otherUser?.name.charAt(0)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`chat-bubble ${isOwn ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
                        <p className="text-[15px] leading-relaxed">{message.content}</p>
                        <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/60' : 'text-[var(--app-text-muted)]'}`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--app-surface)]">
                  {otherUser?.profile_picture_url && (
                    <Image src={otherUser.profile_picture_url} alt="" width={32} height={32} className="object-cover" />
                  )}
                </div>
                <div className="typing-indicator bg-[var(--app-surface)] rounded-2xl">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-[var(--app-bg)]/95 backdrop-blur-lg border-t border-[var(--app-border)] safe-bottom">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Xabar yozing..."
              className="input-field pr-12"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xl"
              onClick={() => setNewMessage(prev => prev + '😊')}
            >
              😊
            </button>
          </div>

          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-[var(--love-pink)] to-[var(--passion-red)] flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
