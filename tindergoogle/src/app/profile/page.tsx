'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTelegram } from '@/hooks/useTelegram'
import { FullPageLoader, LoadingSpinner } from '@/components/LoadingSpinner'
import type { User, Profile } from '@/types'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [lookingFor, setLookingFor] = useState<'male' | 'female' | 'both' | ''>('')
  const [location, setLocation] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { hapticFeedback, showAlert, showMainButton, hideMainButton } = useTelegram()

  // Load user
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }
    const parsedUser = JSON.parse(storedUser)
    setUser(parsedUser)
    setName(parsedUser.name || '')
  }, [router])

  // Fetch profile
  useEffect(() => {
    if (!user) return

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
      } else if (data) {
        setProfile(data)
        setBio(data.bio || '')
        setAge(data.age?.toString() || '')
        setGender(data.gender || '')
        setLookingFor(data.looking_for || '')
        setLocation(data.location || '')
      }
      setLoading(false)
    }

    fetchProfile()
  }, [user])

  const handleSave = async () => {
    if (!user) return

    // Validation
    if (!age || parseInt(age) < 18) {
      showAlert ? showAlert('Yosh kamida 18 bo\'lishi kerak') : alert('Yosh kamida 18 bo\'lishi kerak')
      return
    }
    if (!gender) {
      showAlert ? showAlert('Jinsingizni tanlang') : alert('Jinsingizni tanlang')
      return
    }
    if (!lookingFor) {
      showAlert ? showAlert('Qidirayotganingizni tanlang') : alert('Qidirayotganingizni tanlang')
      return
    }

    setSaving(true)
    hapticFeedback('light')

    // Update user name if changed
    if (name !== user.name) {
      await supabase
        .from('users')
        .update({ name })
        .eq('id', user.id)
      
      const updatedUser = { ...user, name }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }

    // Upsert profile
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      bio,
      age: parseInt(age),
      gender,
      looking_for: lookingFor,
      location,
    })

    if (error) {
      console.error('Error saving profile:', error)
      hapticFeedback('error')
      showAlert ? showAlert('Xatolik yuz berdi') : alert('Xatolik yuz berdi')
    } else {
      hapticFeedback('success')
      showAlert ? showAlert('Profil saqlandi!') : alert('Profil saqlandi!')
    }

    setSaving(false)
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    hapticFeedback('light')

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      hapticFeedback('error')
      showAlert ? showAlert('Rasm yuklashda xatolik') : alert('Rasm yuklashda xatolik')
    } else {
      const { data } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: data.publicUrl })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        hapticFeedback('error')
      } else {
        setProfile(prev => prev ? { ...prev, profile_picture_url: data.publicUrl } : null)
        hapticFeedback('success')
      }
    }
    setUploading(false)
  }

  if (loading) {
    return <FullPageLoader text="Profil yuklanmoqda..." />
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-[var(--app-text)]">Profilim</h1>
          <p className="text-sm text-[var(--app-muted)]">Ma'lumotlaringizni to'ldiring</p>
        </div>

        {/* Profile Picture */}
        <div className="mb-6 flex flex-col items-center">
          <div className="relative">
            <div className="h-28 w-28 overflow-hidden rounded-full bg-[var(--app-secondary)] ring-4 ring-[var(--app-accent-soft)]">
              {profile?.profile_picture_url ? (
                <Image
                  src={profile.profile_picture_url}
                  alt="Profile"
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-[var(--app-muted)]">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[var(--app-accent)] text-white shadow-lg transition-transform hover:scale-110">
              {uploading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div className="glass-card rounded-2xl p-4">
            <label className="block text-sm font-medium text-[var(--app-muted)] mb-2">
              Ismingiz
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-[var(--app-text)] text-lg font-semibold focus:outline-none placeholder:text-[var(--app-muted)]"
              placeholder="Ismingizni kiriting"
            />
          </div>

          {/* Age */}
          <div className="glass-card rounded-2xl p-4">
            <label className="block text-sm font-medium text-[var(--app-muted)] mb-2">
              Yoshingiz
            </label>
            <input
              type="number"
              min="18"
              max="100"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-transparent text-[var(--app-text)] text-lg font-semibold focus:outline-none placeholder:text-[var(--app-muted)]"
              placeholder="18"
            />
          </div>

          {/* Gender */}
          <div className="glass-card rounded-2xl p-4">
            <label className="block text-sm font-medium text-[var(--app-muted)] mb-3">
              Jinsingiz
            </label>
            <div className="flex gap-2">
              {[
                { value: 'male', label: 'Erkak', icon: '👨' },
                { value: 'female', label: 'Ayol', icon: '👩' },
                { value: 'other', label: 'Boshqa', icon: '🧑' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setGender(option.value as typeof gender)}
                  className={`flex-1 rounded-xl py-3 text-sm font-medium transition-all ${
                    gender === option.value
                      ? 'bg-[var(--app-accent)] text-white'
                      : 'bg-[var(--app-secondary)] text-[var(--app-text)] hover:bg-[var(--app-accent-soft)]'
                  }`}
                >
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Looking For */}
          <div className="glass-card rounded-2xl p-4">
            <label className="block text-sm font-medium text-[var(--app-muted)] mb-3">
              Qidirayapsiz
            </label>
            <div className="flex gap-2">
              {[
                { value: 'male', label: 'Erkak', icon: '👨' },
                { value: 'female', label: 'Ayol', icon: '👩' },
                { value: 'both', label: 'Hammasi', icon: '👥' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLookingFor(option.value as typeof lookingFor)}
                  className={`flex-1 rounded-xl py-3 text-sm font-medium transition-all ${
                    lookingFor === option.value
                      ? 'bg-[var(--app-accent)] text-white'
                      : 'bg-[var(--app-secondary)] text-[var(--app-text)] hover:bg-[var(--app-accent-soft)]'
                  }`}
                >
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="glass-card rounded-2xl p-4">
            <label className="block text-sm font-medium text-[var(--app-muted)] mb-2">
              Shahar
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-transparent text-[var(--app-text)] text-lg font-semibold focus:outline-none placeholder:text-[var(--app-muted)]"
              placeholder="Toshkent"
            />
          </div>

          {/* Bio */}
          <div className="glass-card rounded-2xl p-4">
            <label className="block text-sm font-medium text-[var(--app-muted)] mb-2">
              O'zingiz haqingizda
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full bg-transparent text-[var(--app-text)] focus:outline-none placeholder:text-[var(--app-muted)] resize-none"
              placeholder="O'zingiz haqingizda qisqacha yozing..."
            />
            <p className="mt-1 text-right text-xs text-[var(--app-muted)]">
              {bio.length}/500
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full rounded-2xl bg-[var(--app-accent)] py-4 font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <LoadingSpinner size="sm" />
              Saqlanmoqda...
            </>
          ) : (
            'Saqlash'
          )}
        </button>
      </div>
    </div>
  )
}
