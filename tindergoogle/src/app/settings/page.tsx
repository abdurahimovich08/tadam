'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function Settings() {
  const [user, setUser] = useState<any>(null)
  const [minAge, setMinAge] = useState(18)
  const [maxAge, setMaxAge] = useState(99)
  const router = useRouter()

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
        // In a real app, you would fetch the user's settings from the database.
        // For this example, we'll just use local storage.
        const settings = localStorage.getItem('settings')
        if (settings) {
            const { minAge, maxAge } = JSON.parse(settings)
            setMinAge(minAge)
            setMaxAge(maxAge)
        }
    }
  }, [user])

  const handleSave = () => {
    localStorage.setItem('settings', JSON.stringify({ minAge, maxAge }))
    alert('Settings saved')
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="mt-4">
          <label className="block font-semibold text-gray-700">
            Age Range
          </label>
          <div className="mt-2 flex items-center justify-between">
            <span>{minAge}</span>
            <input
              type="range"
              min="18"
              max="99"
              value={minAge}
              onChange={(e) => setMinAge(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>{maxAge}</span>
            <input
              type="range"
              min="18"
              max="99"
              value={maxAge}
              onChange={(e) => setMaxAge(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          className="mt-6 w-full rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600"
        >
          Save
        </button>
      </div>
    </div>
  )
}
