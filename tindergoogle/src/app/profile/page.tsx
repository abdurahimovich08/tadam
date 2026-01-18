'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTelegram } from '@/hooks/useTelegram'
import type { User, Profile } from '@/types'

const INTERESTS = [
  { emoji: '📚', label: 'Kitob' },
  { emoji: '🎬', label: 'Kino' },
  { emoji: '🎵', label: 'Musiqa' },
  { emoji: '⚽', label: 'Sport' },
  { emoji: '✈️', label: 'Sayohat' },
  { emoji: '🍳', label: 'Oshpazlik' },
  { emoji: '🎮', label: 'O\'yin' },
  { emoji: '📷', label: 'Fotografiya' },
  { emoji: '🎨', label: 'San\'at' },
  { emoji: '💪', label: 'Fitnes' },
  { emoji: '🐱', label: 'Hayvonlar' },
  { emoji: '🌱', label: 'Tabiat' },
]

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  
  // Form state
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [lookingFor, setLookingFor] = useState<'male' | 'female' | 'both' | ''>('')
  const [location, setLocation] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [job, setJob] = useState('')
  const [education, setEducation] = useState('')
  const [smoking, setSmoking] = useState<'never' | 'sometimes' | 'often' | ''>('')
  const [drinking, setDrinking] = useState<'never' | 'sometimes' | 'often' | ''>('')
  const [interests, setInterests] = useState<string[]>([])
  const [photos, setPhotos] = useState<string[]>([])

  const router = useRouter()
  const { hapticFeedback, showAlert } = useTelegram()

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

  useEffect(() => {
    if (!user) return

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setBio(data.bio || '')
        setAge(data.age?.toString() || '')
        setGender(data.gender || '')
        setLookingFor(data.looking_for || '')
        setLocation(data.location || '')
        setHeight(data.height?.toString() || '')
        setWeight(data.weight?.toString() || '')
        setJob(data.job || '')
        setEducation(data.education || '')
        setSmoking(data.smoking || '')
        setDrinking(data.drinking || '')
        setInterests(data.interests || [])
        setPhotos([data.profile_picture_url, ...(data.photos || [])].filter(Boolean) as string[])
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

    setSaving(true)
    hapticFeedback('light')

    if (name !== user.name) {
      await supabase.from('users').update({ name }).eq('id', user.id)
      localStorage.setItem('user', JSON.stringify({ ...user, name }))
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      bio,
      age: parseInt(age),
      gender: gender || null,
      looking_for: lookingFor || null,
      location,
      height: height ? parseInt(height) : null,
      weight: weight ? parseInt(weight) : null,
      job,
      education,
      smoking: smoking || null,
      drinking: drinking || null,
      interests,
      profile_picture_url: photos[0] || null,
      photos: photos.slice(1),
    })

    if (error) {
      hapticFeedback('error')
      showAlert ? showAlert('Xatolik yuz berdi') : alert('Xatolik yuz berdi')
    } else {
      hapticFeedback('success')
      showAlert ? showAlert('✨ Saqlandi!') : alert('✨ Saqlandi!')
    }

    setSaving(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!user || !e.target.files?.[0]) return
    
    setUploading(true)
    const file = e.target.files[0]
    const fileName = `${user.id}-${Date.now()}-${index}.${file.name.split('.').pop()}`

    const { error } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, file, { upsert: true })

    if (!error) {
      const { data } = supabase.storage.from('profile-pictures').getPublicUrl(fileName)
      const newPhotos = [...photos]
      newPhotos[index] = data.publicUrl
      setPhotos(newPhotos)
      hapticFeedback('success')
    } else {
      hapticFeedback('error')
    }
    setUploading(false)
  }

  const toggleInterest = (interest: string) => {
    hapticFeedback('light')
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest))
    } else if (interests.length < 6) {
      setInterests([...interests, interest])
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-5xl animate-pulse">👤</div>
      </div>
    )
  }

  const tabs = ['Asosiy', 'Haqida', 'Rasmlar']

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/95 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => router.back()} className="text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Profilni tahrirlash</h1>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="text-pink-500 font-semibold"
          >
            {saving ? '...' : 'Saqlash'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {tabs.map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setActiveTab(idx)}
              className={`flex-1 py-3 text-sm font-medium transition-all ${
                activeTab === idx 
                  ? 'text-pink-500 border-b-2 border-pink-500' 
                  : 'text-gray-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        {/* Tab 0: Basic Info */}
        {activeTab === 0 && (
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Ism</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none"
                placeholder="Ismingiz"
              />
            </div>

            {/* Age & Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Yosh</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none"
                  placeholder="25"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Jins</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none appearance-none"
                >
                  <option value="">Tanlang</option>
                  <option value="male">Erkak</option>
                  <option value="female">Ayol</option>
                  <option value="other">Boshqa</option>
                </select>
              </div>
            </div>

            {/* Height & Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Bo'y (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none"
                  placeholder="175"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Vazn (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none"
                  placeholder="70"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">📍 Joylashuv</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none"
                placeholder="Toshkent, Uzbekistan"
              />
            </div>

            {/* Looking For */}
            <div>
              <label className="text-sm text-gray-400 mb-3 block">Qidirayapsiz</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'male', label: '👨 Erkak' },
                  { value: 'female', label: '👩 Ayol' },
                  { value: 'both', label: '👥 Hammasi' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLookingFor(opt.value as any)}
                    className={`p-4 rounded-2xl text-sm font-medium transition-all ${
                      lookingFor === opt.value
                        ? 'bg-pink-500 text-white'
                        : 'bg-white/5 text-white border border-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: About */}
        {activeTab === 1 && (
          <div className="space-y-6">
            {/* Bio */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">O'zingiz haqingizda</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none resize-none"
                placeholder="O'zingiz haqingizda qiziqarli ma'lumot yozing..."
              />
              <p className="text-xs text-gray-500 mt-1 text-right">{bio.length}/500</p>
            </div>

            {/* Job & Education */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">💼 Ish</label>
              <input
                type="text"
                value={job}
                onChange={(e) => setJob(e.target.value)}
                className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none"
                placeholder="Dizayner"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">🎓 Ta'lim</label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none"
                placeholder="TATU"
              />
            </div>

            {/* Interests */}
            <div>
              <label className="text-sm text-gray-400 mb-3 block">
                Qiziqishlar ({interests.length}/6)
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => toggleInterest(item.label)}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      interests.includes(item.label)
                        ? 'bg-pink-500 text-white'
                        : 'bg-white/5 text-white border border-white/10'
                    }`}
                  >
                    {item.emoji} {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Smoking & Drinking */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">🚬 Chekish</label>
                <select
                  value={smoking}
                  onChange={(e) => setSmoking(e.target.value as any)}
                  className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none appearance-none"
                >
                  <option value="">Tanlang</option>
                  <option value="never">Hech qachon</option>
                  <option value="sometimes">Ba'zan</option>
                  <option value="often">Tez-tez</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">🍷 Ichish</label>
                <select
                  value={drinking}
                  onChange={(e) => setDrinking(e.target.value as any)}
                  className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none appearance-none"
                >
                  <option value="">Tanlang</option>
                  <option value="never">Hech qachon</option>
                  <option value="sometimes">Ba'zan</option>
                  <option value="often">Tez-tez</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Photos */}
        {activeTab === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">4 tagacha rasm yuklang. Birinchi rasm asosiy bo'ladi.</p>
            
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((index) => (
                <label
                  key={index}
                  className={`aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer relative ${
                    photos[index] ? '' : 'border-2 border-dashed border-white/20 bg-white/5'
                  }`}
                >
                  {photos[index] ? (
                    <>
                      <Image
                        src={photos[index]}
                        alt=""
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm">O'zgartirish</span>
                      </div>
                      {index === 0 && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-pink-500 rounded-full">
                          <span className="text-xs text-white font-medium">Asosiy</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <span className="text-xs">Rasm {index + 1}</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, index)}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              ))}
            </div>

            {uploading && (
              <div className="text-center py-4">
                <div className="text-pink-500 animate-pulse">Yuklanmoqda...</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
