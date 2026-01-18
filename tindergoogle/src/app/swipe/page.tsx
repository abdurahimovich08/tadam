'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTelegram } from '@/hooks/useTelegram'

export default function Swipe() {
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [currentUserIndex, setCurrentUserIndex] = useState(0)
  const router = useRouter()
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
      const fetchUsers = async () => {
        const settings = localStorage.getItem('settings')
        let minAge = 18
        let maxAge = 99
        if (settings) {
            const { minAge: storedMinAge, maxAge: storedMaxAge } = JSON.parse(settings)
            minAge = storedMinAge
            maxAge = storedMaxAge
        }

        const { data, error } = await supabase
          .from('users')
          .select('*, profiles!inner(*)')
          .neq('id', user.id)
          .gte('profiles.age', minAge)
          .lte('profiles.age', maxAge)

        if (error) {
          console.error('Error fetching users:', error)
        } else {
          setUsers(data)
        }
      }
      fetchUsers()
    }
  }, [user])

  const handleSwipe = async (liked: boolean) => {
    if (!user || users.length === 0) return

    const swipedUser = users[currentUserIndex]

    const { error } = await supabase.from('swipes').insert({
      swiper_id: user.id,
      swiped_id: swipedUser.id,
      liked,
    })

    if (error) {
      console.error('Error saving swipe:', error)
      alert('Error saving swipe')
    }

    if (liked) {
        // Check for a match
        const { data, error } = await supabase
            .from('swipes')
            .select('*')
            .eq('swiper_id', swipedUser.id)
            .eq('swiped_id', user.id)
            .eq('liked', true)
            .single()

        if (data && !error) {
            // It's a match!
            const { error: matchError } = await supabase.from('matches').insert({
                user1_id: user.id,
                user2_id: swipedUser.id,
            })
            if (matchError) {
                console.error('Error creating match:', matchError)
            } else {
                if (webApp) {
                    webApp.showAlert("It's a match!")
                } else {
                    alert("It's a match!")
                }
            }
        }
    }

    setCurrentUserIndex(currentUserIndex + 1)
  }

  const currentUser = users[currentUserIndex]

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        {currentUser ? (
            <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
                {currentUser.profiles?.profile_picture_url && (
                    <Image
                        src={currentUser.profiles.profile_picture_url}
                        alt="Profile picture"
                        width={200}
                        height={200}
                        className="mx-auto rounded-full"
                    />
                )}
                <h1 className="mt-4 text-center text-2xl font-bold">{currentUser.name}</h1>
                <div className="mt-4 flex justify-around">
                <button
                    onClick={() => handleSwipe(false)}
                    className="rounded-full bg-red-500 p-4 text-white"
                >
                    Dislike
                </button>
                <button
                    onClick={() => handleSwipe(true)}
                    className="rounded-full bg-green-500 p-4 text-white"
                >
                    Like
                </button>
                </div>
            </div>
        ) : (
            <p>No more users to swipe.</p>
        )}
    </div>
  )
}
