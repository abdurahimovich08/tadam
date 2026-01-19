'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTelegram } from '@/hooks/useTelegram'
import type { User, Profile } from '@/types'

const INTERESTS = [
  '🎵 Musiqa', '🎬 Kino', '📚 Kitob', '✈️ Sayohat', '🍳 Ovqat pishirish',
  '💪 Sport', '🎮 O\'yin', '📸 Fotografiya', '🎨 San\'at', '🐕 Hayvonlar',
  '🎭 Teatr', '☕ Kofe', '🌿 Tabiat', '💃 Raqs', '🏋️ Fitnes',
  '🎸 Gitara', '🧘 Yoga', '🏊 Suzish', '⚽ Futbol', '🎾 Tennis'
]

export default function EditProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [step, setStep] = useState(1)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  
  // Form fields
  const [name, setName] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [lookingFor, setLookingFor] = useState('')
  const [location, setLocation] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [job, setJob] = useState('')
  const [education, setEducation] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [smoking, setSmoking] = useState('')
  const [drinking, setDrinking] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { hapticFeedback, showAlert } = useTelegram()

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }
    const userData = JSON.parse(storedUser)
    setUser(userData)
    setName(userData.name || '')
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
        setInterests(data.interests || [])
        setSmoking(data.smoking || '')
        setDrinking(data.drinking || '')
        setPhotos([data.profile_picture_url, ...(data.photos || [])].filter(Boolean) as string[])

        // Check if profile is incomplete
        if (!data.age || !data.profile_picture_url) {
          setIsNewUser(true)
        }
      } else {
        setIsNewUser(true)
      }
      setLoading(false)
    }

    fetchProfile()
  }, [user])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !user) return

    const file = e.target.files[0]
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      showAlert ? showAlert('Rasm hajmi 5MB dan oshmasligi kerak') : alert('Rasm hajmi 5MB dan oshmasligi kerak')
      return
    }

    setUploadingPhoto(true)
    hapticFeedback('light')

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}_${Date.now()}.${fileExt}`
    const filePath = `profiles/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      showAlert ? showAlert(`Rasm yuklashda xatolik: ${uploadError.message}`) : alert(`Rasm yuklashda xatolik: ${uploadError.message}`)
      setUploadingPhoto(false)
      return
    }

    const { data } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath)

    if (data?.publicUrl) {
      setPhotos(prev => [...prev, data.publicUrl])
      hapticFeedback('success')
    }
    setUploadingPhoto(false)
  }

  const removePhoto = (index: number) => {
    hapticFeedback('light')
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const toggleInterest = (interest: string) => {
    hapticFeedback('light')
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest].slice(0, 6)
    )
  }

  const handleSave = async () => {
    if (!user) return

    if (!photos.length) {
      showAlert ? showAlert('Kamida 1 ta rasm yuklang') : alert('Kamida 1 ta rasm yuklang')
      return
    }
    if (!age || parseInt(age) < 18) {
      showAlert ? showAlert('Yosh kamida 18 bo\'lishi kerak') : alert('Yosh kamida 18 bo\'lishi kerak')
      return
    }

    setSaving(true)
    hapticFeedback('light')

    // Update user name if changed
    if (name !== user.name) {
      const { error: nameError } = await supabase
        .from('users')
        .update({ name })
        .eq('id', user.id)

      if (nameError) {
        console.error('Name update error:', nameError)
        showAlert ? showAlert(`Ismni saqlashda xatolik: ${nameError.message}`) : alert(`Ismni saqlashda xatolik: ${nameError.message}`)
        setSaving(false)
        return
      }
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
      console.error('Profile save error:', error)
      showAlert ? showAlert(`Profilni saqlashda xatolik: ${error.message}`) : alert(`Profilni saqlashda xatolik: ${error.message}`)
    } else {
      hapticFeedback('success')
      showAlert ? showAlert('Profil muvaffaqiyatli saqlandi!') : alert('Profil muvaffaqiyatli saqlandi!')
      router.push('/swipe')
    }

    setSaving(false)
  }

  const nextStep = () => {
    hapticFeedback('light')
    setStep(prev => Math.min(prev + 1, 4))
  }

  const prevStep = () => {
    hapticFeedback('light')
    setStep(prev => Math.max(prev - 1, 1))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-5xl animate-pulse">✨</div>
      </div>
    )
  }

  // Existing user - show edit form
  if (!isNewUser) {
    return (
      <div className="min-h-screen bg-black pb-24">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-black/95 backdrop-blur-lg border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white">Profilni tahrirlash</h1>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-pink-500 font-semibold disabled:opacity-50"
            >
              {saving ? '...' : 'Saqlash'}
            </button>
          </div>
        </header>

        {/* Photos Section */}
        <div className="px-4 py-6">
          <h3 className="text-white font-semibold mb-3">Rasmlar</h3>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="aspect-square rounded-xl overflow-hidden bg-white/5 relative">
                {photos[index] ? (
                  <>
                    <Image src={photos[index]} alt="" fill className="object-cover" />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center"
                    >
                      <span className="text-white text-xs">✕</span>
                    </button>
                    {index === 0 && (
                      <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded-full bg-pink-500 text-white text-xs">
                        Asosiy
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full flex items-center justify-center text-gray-600 hover:bg-white/10"
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <p className="text-gray-500 text-xs mt-2">
            Birinchi rasm asosiy rasm sifatida ko'rinadi
          </p>
        </div>

        {/* Basic Info */}
        <div className="px-4 mb-6">
          <h3 className="text-white font-semibold mb-3">Asosiy ma'lumotlar</h3>
          <div className="space-y-3">
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Ism</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Yosh</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Jinsi</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none"
                >
                  <option value="">Tanlang</option>
                  <option value="male">Erkak</option>
                  <option value="female">Ayol</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Joylashuv</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Masalan: Toshkent"
                className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none placeholder:text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="px-4 mb-6">
          <h3 className="text-white font-semibold mb-3">Haqingizda</h3>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="O'zingiz haqingizda qisqacha..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none resize-none placeholder:text-gray-600"
          />
          <p className="text-gray-500 text-xs mt-1 text-right">{bio.length}/300</p>
        </div>

        {/* Looking For */}
        <div className="px-4 mb-6">
          <h3 className="text-white font-semibold mb-3">Kimni izlayapsiz?</h3>
          <div className="flex gap-2">
            {[
              { value: 'male', label: '👨 Erkak' },
              { value: 'female', label: '👩 Ayol' },
              { value: 'both', label: '👫 Hammasi' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setLookingFor(option.value)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                  lookingFor === option.value
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                    : 'bg-white/5 text-gray-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Physical Info */}
        <div className="px-4 mb-6">
          <h3 className="text-white font-semibold mb-3">Jismoniy ma'lumotlar</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Bo'y (cm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="170"
                className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Vazn (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="65"
                className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none placeholder:text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Career */}
        <div className="px-4 mb-6">
          <h3 className="text-white font-semibold mb-3">Ish va ta'lim</h3>
          <div className="space-y-3">
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Ish joyi</label>
              <input
                type="text"
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="Dasturchi, Google'da"
                className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">Ta'lim</label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="TDTU, Informatika"
                className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none placeholder:text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Interests */}
        <div className="px-4 mb-6">
          <h3 className="text-white font-semibold mb-1">Qiziqishlar</h3>
          <p className="text-gray-500 text-xs mb-3">6 tagacha tanlang</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  interests.includes(interest)
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                    : 'bg-white/5 text-gray-400'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* Lifestyle */}
        <div className="px-4 mb-8">
          <h3 className="text-white font-semibold mb-3">Turmush tarzi</h3>
          <div className="space-y-4">
            <div>
              <label className="text-gray-500 text-xs mb-2 block">🚬 Chekish</label>
              <div className="flex gap-2">
                {[
                  { value: 'never', label: 'Hech qachon' },
                  { value: 'sometimes', label: 'Ba\'zan' },
                  { value: 'often', label: 'Tez-tez' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSmoking(option.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                      smoking === option.value
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                        : 'bg-white/5 text-gray-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-2 block">🍷 Ichish</label>
              <div className="flex gap-2">
                {[
                  { value: 'never', label: 'Hech qachon' },
                  { value: 'sometimes', label: 'Ba\'zan' },
                  { value: 'often', label: 'Tez-tez' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDrinking(option.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                      drinking === option.value
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                        : 'bg-white/5 text-gray-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/95 backdrop-blur-lg border-t border-white/10">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold disabled:opacity-50"
          >
            {saving ? 'Saqlanmoqda...' : '💾 O\'zgarishlarni saqlash'}
          </button>
        </div>
      </div>
    )
  }

  // New user - show wizard
  return (
    <div className="min-h-screen bg-black">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-lg pt-2 px-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                s <= step ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="pt-8 pb-32">
        {/* Step 1: Photos */}
        {step === 1 && (
          <div className="px-4 py-8 animate-fadeIn">
            <div className="text-center mb-8">
              <span className="text-6xl mb-4 block">📸</span>
              <h2 className="text-2xl font-bold text-white mb-2">
                Rasmlaringizni qo'shing
              </h2>
              <p className="text-gray-400">
                Yaxshi rasmlar 10x ko'proq match oladi!
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-8">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="aspect-square rounded-xl overflow-hidden bg-white/5 relative">
                  {photos[index] ? (
                    <>
                      <Image src={photos[index]} alt="" fill className="object-cover" />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center"
                      >
                        <span className="text-white text-xs">✕</span>
                      </button>
                      {index === 0 && (
                        <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded-full bg-pink-500 text-white text-xs">
                          Asosiy
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-full flex flex-col items-center justify-center text-gray-600 hover:bg-white/10"
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <span className="animate-spin text-2xl">⏳</span>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          {index === 0 && <span className="text-xs mt-1">Asosiy</span>}
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <div className="px-4 py-8 animate-fadeIn">
            <div className="text-center mb-8">
              <span className="text-6xl mb-4 block">👤</span>
              <h2 className="text-2xl font-bold text-white mb-2">
                O'zingiz haqingizda
              </h2>
              <p className="text-gray-400">
                Asosiy ma'lumotlarni to'ldiring
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Ismingiz</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ismingizni kiriting"
                  className="w-full px-4 py-4 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none text-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Yoshingiz</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="18"
                    className="w-full px-4 py-4 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none text-lg"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Jinsingiz</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-4 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none text-lg"
                  >
                    <option value="">Tanlang</option>
                    <option value="male">Erkak</option>
                    <option value="female">Ayol</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Shahar</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Toshkent"
                  className="w-full px-4 py-4 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none text-lg"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Kimni izlayapsiz?</label>
                <div className="flex gap-2">
                  {[
                    { value: 'male', label: '👨 Erkak' },
                    { value: 'female', label: '👩 Ayol' },
                    { value: 'both', label: '👫 Hammasi' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLookingFor(option.value)}
                      className={`flex-1 py-4 rounded-xl text-base font-medium transition-all ${
                        lookingFor === option.value
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                          : 'bg-white/5 text-gray-400 border border-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: About & Interests */}
        {step === 3 && (
          <div className="px-4 py-8 animate-fadeIn">
            <div className="text-center mb-8">
              <span className="text-6xl mb-4 block">✨</span>
              <h2 className="text-2xl font-bold text-white mb-2">
                Shaxsiyatingiz
              </h2>
              <p className="text-gray-400">
                Qiziqishlaringiz va o'zingiz haqingizda
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Haqingizda qisqacha</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="O'zingizni qisqacha tasvirlab bering..."
                  className="w-full px-4 py-4 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none resize-none"
                />
                <p className="text-gray-600 text-xs mt-1 text-right">{bio.length}/300</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Qiziqishlaringiz (6 tagacha)</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        interests.includes(interest)
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                          : 'bg-white/5 text-gray-400 border border-white/10'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Additional Info */}
        {step === 4 && (
          <div className="px-4 py-8 animate-fadeIn">
            <div className="text-center mb-8">
              <span className="text-6xl mb-4 block">📋</span>
              <h2 className="text-2xl font-bold text-white mb-2">
                Qo'shimcha ma'lumotlar
              </h2>
              <p className="text-gray-400">
                Ixtiyoriy, lekin foydali
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Bo'y (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="170"
                    className="w-full px-4 py-4 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Vazn (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="65"
                    className="w-full px-4 py-4 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">💼 Ish joyi</label>
                <input
                  type="text"
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  placeholder="Kompaniya va lavozim"
                  className="w-full px-4 py-4 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">🎓 Ta'lim</label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="Universitet, mutaxassislik"
                  className="w-full px-4 py-4 rounded-xl bg-white/5 text-white border border-white/10 focus:border-pink-500 outline-none"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">🚬 Chekish</label>
                <div className="flex gap-2">
                  {[
                    { value: 'never', label: 'Hech qachon' },
                    { value: 'sometimes', label: 'Ba\'zan' },
                    { value: 'often', label: 'Tez-tez' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSmoking(option.value)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                        smoking === option.value
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                          : 'bg-white/5 text-gray-400 border border-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">🍷 Ichish</label>
                <div className="flex gap-2">
                  {[
                    { value: 'never', label: 'Hech qachon' },
                    { value: 'sometimes', label: 'Ba\'zan' },
                    { value: 'often', label: 'Tez-tez' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDrinking(option.value)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                        drinking === option.value
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                          : 'bg-white/5 text-gray-400 border border-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Card */}
        {photos.length > 0 && (
          <div className="px-4 mt-4">
            <p className="text-gray-400 text-center text-sm mb-3">📱 Profilingiz shunday ko'rinadi:</p>
            <div className="relative aspect-[3/4] max-w-[200px] mx-auto rounded-2xl overflow-hidden shadow-2xl">
              <Image src={photos[0]} alt="" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-bold text-lg">
                  {name || 'Ism'}, {age || '??'}
                </p>
                {location && <p className="text-gray-300 text-xs">📍 {location}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/95 backdrop-blur-lg border-t border-white/10">
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="flex-1 py-4 rounded-2xl bg-white/10 text-white font-semibold"
            >
              ← Orqaga
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={nextStep}
              disabled={step === 1 && photos.length === 0}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold disabled:opacity-50"
            >
              Davom etish →
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || !photos.length || !age}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold disabled:opacity-50"
            >
              {saving ? 'Saqlanmoqda...' : '🚀 Boshlash'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
