'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/hooks/useTelegram'

export default function Chat({ params }: { params: { match_id: string } }) {
  const [user, setUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const router = useRouter()
  const matchId = params.match_id
  const webApp = useTelegram()

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/')
      return
    }
    setUser(JSON.parse(user))
  }, [router])

  useEffect(() => {
    if (user) {
      const fetchMessages = async () => {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error fetching messages:', error)
        } else {
          setMessages(data)
        }
      }
      fetchMessages()

      const channel = supabase
        .channel(`chat:${matchId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
          (payload) => {
            setMessages((messages) => [...messages, payload.new])
            if (webApp && payload.new.sender_id !== user.id) {
                webApp.HapticFeedback.notificationOccurred('success')
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user, matchId, webApp])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newMessage.trim()) return

    const { error } = await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: user.id,
      content: newMessage,
    })

    if (error) {
      console.error('Error sending message:', error)
    } else {
      setNewMessage('')
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`my-2 flex ${
              message.sender_id === user.id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`rounded-lg px-4 py-2 ${
                message.sender_id === user.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSendMessage} className="flex items-center bg-white p-4">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:outline-none"
          placeholder="Type a message..."
        />
        <button
          type="submit"
          className="ml-4 rounded-full bg-blue-500 px-6 py-2 font-semibold text-white"
        >
          Send
        </button>
      </form>
    </div>
  )
}
