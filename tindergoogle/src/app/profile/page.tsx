'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTelegram } from '@/hooks/useTelegram'
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
  const [activeSection, setActiveSection] = useState<'basic' | 'about' | 'preferences'>('basic')
  const router = useRouter()
  const { hapticFeedback, showAlert } = useTelegram()

  // Calculate profile completion
  const getProfileCompletion = () => {
    let completed = 0
    const total = 6
    if (name) completed++
    if (age) completed++
    if (gender) completed++
    if (lookingFor) completed++
    if (bio) completed++
    if (profile?.profile_picture_url) completed++
    return Math.round((completed / total) * 100)
  }

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

    if (name !== user.name) {
      await supabase.from('users').update({ name }).eq('id', user.id)
      const updatedUser = { ...user, name }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }

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
      showAlert ? showAlert('✨ Profil saqlandi!') : alert('✨ Profil saqlandi!')
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
    } else {
      const { data } = supabase.storage.from('profile-pictures').getPublicUrl(fileName)

      await supabase.from('profiles').update({ profile_picture_url: data.publicUrl }).eq('id', user.id)
      setProfile(prev => prev ? { ...prev, profile_picture_url: data.publicUrl } : null)
      hapticFeedback('success')
    }
    setUploading(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="loading-heart text-6xl">💕</div>
      </div>
    )
  }

  const completion = getProfileCompletion()

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-to-br from-[var(--love-pink)] via-[var(--passion-red)] to-[var(--trust-purple)]">
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Back pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-6xl">💕</div>
          <div className="absolute top-12 right-8 text-4xl">✨</div>
          <div className="absolute bottom-16 left-12 text-3xl">💫</div>
        </div>

        {/* Profile Picture */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="relative">
            {/* Animated ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--love-pink)] to-[var(--trust-purple)] animate-spin" style={{ animationDuration: '3s', padding: '4px' }}>
              <div className="w-full h-full rounded-full bg-[var(--app-bg)]" />
            </div>
            
            {/* Avatar */}
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--app-bg)]">
              {profile?.profile_picture_url ? (
                <Image
                  src={profile.profile_picture_url}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[var(--app-surface)] flex items-center justify-center">
                  <span className="text-5xl">{name.charAt(0) || '?'}</span>
                </div>
              )}
            </div>

            {/* Upload button */}
            <label className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-[var(--love-pink)] flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                  <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                  <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3H4.5a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM12 12.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd" />
                </svg>
              )}
              <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-20 px-4">
        {/* Completion indicator */}
        <div className="max-w-md mx-auto mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--app-text-secondary)]">Profil to'ldirilganligi</span>
            <span className="text-sm font-bold text-[var(--love-pink)]">{completion}%</span>
          </div>
          <div className="h-2 bg-[var(--app-surface)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[var(--love-pink)] to-[var(--trust-purple)] transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
          {completion < 100 && (
            <p className="mt-2 text-xs text-[var(--app-text-muted)]">
              💡 To'liq profil 3x ko'proq match oladi
            </p>
          )}
        </div>

        {/* Section tabs */}
        <div className="max-w-md mx-auto flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'basic', label: '👤 Asosiy', emoji: '👤' },
            { id: 'about', label: '✨ Haqida', emoji: '✨' },
            { id: 'preferences', label: '💕 Qidiruv', emoji: '💕' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeSection === tab.id
                  ? 'bg-[var(--love-pink)] text-white'
                  : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form sections */}
        <div className="max-w-md mx-auto space-y-4">
          {activeSection === 'basic' && (
            <>
              {/* Name */}
              <div className="glass-card-elevated p-4">
                <label className="block text-sm text-[var(--app-text-muted)] mb-2">Ismingiz</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Ismingizni kiriting"
                />
              </div>

              {/* Age */}
              <div className="glass-card-elevated p-4">
                <label className="block text-sm text-[var(--app-text-muted)] mb-2">Yoshingiz</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="input-field"
                  placeholder="25"
                />
              </div>

              {/* Gender */}
              <div className="glass-card-elevated p-4">
                <label className="block text-sm text-[var(--app-text-muted)] mb-3">Jinsingiz</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'male', label: 'Erkak', emoji: '👨' },
                    { value: 'female', label: 'Ayol', emoji: '👩' },
                    { value: 'other', label: 'Boshqa', emoji: '🧑' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setGender(option.value as typeof gender)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        gender === option.value
                          ? 'bg-[var(--love-pink)] text-white scale-105'
                          : 'bg-[var(--app-surface)] text-[var(--app-text)]'
                      }`}
                    >
                      <div className="text-2xl mb-1">{option.emoji}</div>
                      <div className="text-xs font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="glass-card-elevated p-4">
                <label className="block text-sm text-[var(--app-text-muted)] mb-2">📍 Shahar</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input-field"
                  placeholder="Toshkent"
                />
              </div>
            </>
          )}

          {activeSection === 'about' && (
            <>
              {/* Bio */}
              <div className="glass-card-elevated p-4">
                <label className="block text-sm text-[var(--app-text-muted)] mb-2">O'zingiz haqingizda</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="input-field resize-none"
                  placeholder="O'zingizni qiziqarli qilib tasvirlang... 💫"
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-[var(--app-text-muted)]">
                    💡 Qiziqish va xobbilar haqida yozing
                  </p>
                  <p className="text-xs text-[var(--app-text-muted)]">{bio.length}/500</p>
                </div>
              </div>

              {/* Bio tips */}
              <div className="bg-[var(--app-surface)] rounded-2xl p-4 border border-[var(--app-border)]">
                <h4 className="font-semibold text-[var(--app-text)] mb-3">✨ Yaxshi bio yozish sirlari:</h4>
                <ul className="space-y-2 text-sm text-[var(--app-text-secondary)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--success-green)]">✓</span>
                    Xobbiylaringizni aytib bering
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--success-green)]">✓</span>
                    Hazil bilan yozing - kulguli bio 2x ko'p match oladi
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--success-green)]">✓</span>
                    Nimani qidirayotganingizni ayting
                  </li>
                </ul>
              </div>
            </>
          )}

          {activeSection === 'preferences' && (
            <>
              {/* Looking For */}
              <div className="glass-card-elevated p-4">
                <label className="block text-sm text-[var(--app-text-muted)] mb-3">Qidirayapsiz</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'male', label: 'Erkak', emoji: '👨' },
                    { value: 'female', label: 'Ayol', emoji: '👩' },
                    { value: 'both', label: 'Hammasi', emoji: '👥' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLookingFor(option.value as typeof lookingFor)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        lookingFor === option.value
                          ? 'bg-[var(--love-pink)] text-white scale-105'
                          : 'bg-[var(--app-surface)] text-[var(--app-text)]'
                      }`}
                    >
                      <div className="text-2xl mb-1">{option.emoji}</div>
                      <div className="text-xs font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Psychological nudge */}
              <div className="bg-gradient-to-r from-[var(--love-pink)]/10 to-[var(--trust-purple)]/10 rounded-2xl p-4 border border-[var(--love-pink)]/20">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h4 className="font-semibold text-[var(--app-text)]">Bilasizmi?</h4>
                    <p className="text-sm text-[var(--app-text-secondary)] mt-1">
                      To'liq profilga ega foydalanuvchilar 3 barobar ko'proq match oladi va suhbatlar uzoqroq davom etadi.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Save Button */}
        <div className="max-w-md mx-auto mt-8 px-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full text-lg"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saqlanmoqda...
              </span>
            ) : (
              '✨ Saqlash'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
