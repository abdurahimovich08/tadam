'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Matches() {
  const [user, setUser] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(user))
  }, [router])

  useEffect(() => {
    if (user) {
      const fetchMatches = async () => {
        const { data, error } = await supabase
          .from('matches')
          .select('*, user1:user1_id(id, name), user2:user2_id(id, name)')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

        if (error) {
          console.error('Error fetching matches:', error)
        } else {
          setMatches(data)
        }
      }
      fetchMatches()
    }
  }, [user])

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 p-8">
      <h1 className="text-2xl font-bold">Matches</h1>
      <div className="mt-4 w-full max-w-sm">
        {matches.map((match) => {
          const otherUser = match.user1.id === user.id ? match.user2 : match.user1
          return (
            <Link key={match.id} href={`/chat/${match.id}`} className="block rounded-lg bg-white p-4 shadow-md hover:bg-gray-100">
                <p className="font-semibold">{otherUser.name}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
