'use client'

import { useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/hooks/useTelegram'

export default function Login() {
  const router = useRouter()
  const webApp = useTelegram()

  useEffect(() => {
    if (webApp?.initDataUnsafe?.user) {
      const { id, first_name, last_name } = webApp.initDataUnsafe.user
      const handleLogin = async () => {
        let { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error finding user:', error)
          return
        }

        if (!user) {
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              telegram_id: id,
              name: `${first_name} ${last_name || ''}`.trim(),
            })
            .select()
            .single()

          if (insertError) {
            console.error('Error creating user:', insertError)
            return
          }
          user = newUser
        }

        localStorage.setItem('user', JSON.stringify(user))
        router.push('/profile')
      }
      handleLogin()
    }
  }, [webApp, router])

  if (!webApp?.initDataUnsafe?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
          <h1 className="text-2xl font-bold">Tinder for Telegram</h1>
          <p className="mt-2 text-gray-600">
            Please open this app inside Telegram.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <p>Logging in...</p>
    </div>
  )
}
