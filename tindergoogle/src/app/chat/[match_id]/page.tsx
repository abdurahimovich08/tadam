'use client'

import { useEffect, useState, useRef, use } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/hooks/useTelegram'
import { FullPageLoader } from '@/components/LoadingSpinner'
import type { User, Message, Match } from '@/types'

export default function Chat({ params }: { params: Promise<{ match_id: string }> }) {
  const { match_id: matchId } = use(params)
  
  const [user, setUser] = useState<User | null>(null)
  const [otherUser, setOtherUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { webApp, hapticFeedback, showBackButton, onBackButtonClick } = useTelegram()

  // Setup back button
  useEffect(() => {
    showBackButton()
    const cleanup = onBackButtonClick(() => {
      router.push('/matches')
    })
    return cleanup
  }, [showBackButton, onBackButtonClick, router])

  // Load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  // Fetch match details and messages
  useEffect(() => {
    if (!user) return

    const fetchMatchAndMessages = async () => {
      // Get match details to find other user
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*, user1:user1_id(*), user2:user2_id(*)')
        .eq('id', matchId)
        .single()

      if (matchError) {
        console.error('Error fetching match:', matchError)
        router.push('/matches')
        return
      }

      const other = match.user1.id === user.id ? match.user2 : match.user1
      setOtherUser(other)

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error('Error fetching messages:', messagesError)
      } else {
        setMessages(messagesData || [])
      }
      
      setLoading(false)
    }

    fetchMatchAndMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${matchId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `match_id=eq.${matchId}` 
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => [...prev, newMsg])
          
          // Haptic feedback for received messages
          if (newMsg.sender_id !== user.id) {
            hapticFeedback('success')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, matchId, router, hapticFeedback])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newMessage.trim()) return

    const messageContent = newMessage.trim()
    setNewMessage('')

    const { error } = await supabase.from('messages').insert({
      match_id: parseInt(matchId),
      sender_id: user.id,
      content: messageContent,
    })

    if (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageContent) // Restore message on error
      hapticFeedback('error')
    } else {
      hapticFeedback('light')
    }
  }

  if (loading) {
    return <FullPageLoader text="Chat yuklanmoqda..." />
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--tg-bg)]">
      {/* Header */}
      <header className="glass-card flex items-center gap-3 border-b border-[var(--app-outline)] px-4 py-3">
        <button 
          onClick={() => router.push('/matches')}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[var(--app-secondary)] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-semibold text-[var(--app-text)]">{otherUser?.name || 'Chat'}</h1>
          <p className="text-xs text-[var(--app-muted)]">Online</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--app-accent-soft)] flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[var(--app-accent)]">
                <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
              </svg>
            </div>
            <p className="text-[var(--app-muted)]">Hali xabarlar yo'q</p>
            <p className="text-sm text-[var(--app-muted)] mt-1">Birinchi xabarni yuboring!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === user?.id
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isOwn
                      ? 'bg-[var(--app-accent)] text-white rounded-br-md'
                      : 'glass-card rounded-bl-md'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-[var(--app-muted)]'}`}>
                    {new Date(message.created_at).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="glass-card border-t border-[var(--app-outline)] p-4 safe-bottom">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 rounded-full bg-[var(--app-secondary)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] placeholder:text-[var(--app-muted)]"
            placeholder="Xabar yozing..."
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--app-accent)] text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
