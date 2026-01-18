'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function Profile() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [bio, setBio] = useState('')
  const [age, setAge] = useState('')
  const [uploading, setUploading] = useState(false)
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
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error)
        } else {
          setProfile(data)
          setBio(data?.bio || '')
          setAge(data?.age || '')
        }
      }
      fetchProfile()
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      bio,
      age: parseInt(age),
    })

    if (error) {
      console.error('Error saving profile:', error)
      alert('Error saving profile')
    } else {
      alert('Profile saved successfully')
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const { error } = await supabase.storage
      .from('profile-pictures')
      .upload(user.id, file, { upsert: true })

    if (error) {
      console.error('Error uploading file:', error)
      alert('Error uploading file')
    } else {
        const { data } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(user.id)
        
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ profile_picture_url: data.publicUrl })
            .eq('id', user.id)

        if (updateError) {
            console.error('Error updating profile:', updateError)
            alert('Error updating profile')
        } else {
            setProfile({ ...profile, profile_picture_url: data.publicUrl })
        }
    }
    setUploading(false)
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-2 text-gray-600">Welcome, {user.name}</p>
        <div className="mt-4">
            {profile?.profile_picture_url && (
                <Image
                    src={profile.profile_picture_url}
                    alt="Profile picture"
                    width={100}
                    height={100}
                    className="rounded-full"
                />
            )}
            <label htmlFor="picture" className="block font-semibold text-gray-700">
                Profile Picture
            </label>
            <input
                id="picture"
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
            />
        </div>
        <div className="mt-4">
          <label htmlFor="bio" className="block font-semibold text-gray-700">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mt-4">
          <label htmlFor="age" className="block font-semibold text-gray-700">
            Age
          </label>
          <input
            id="age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleSave}
          className="mt-6 w-full rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600"
        >
          Save
        </button>
        <Link href="/swipe" className="mt-4 block w-full rounded-lg bg-green-500 px-6 py-3 text-center font-semibold text-white hover:bg-green-600">
            Start Swiping
        </Link>
        <Link href="/matches" className="mt-4 block w-full rounded-lg bg-purple-500 px-6 py-3 text-center font-semibold text-white hover:bg-purple-600">
            My Matches
        </Link>
        <Link href="/settings" className="mt-4 block w-full rounded-lg bg-gray-500 px-6 py-3 text-center font-semibold text-white hover:bg-gray-600">
            Settings
        </Link>
      </div>
    </div>
  )
}
