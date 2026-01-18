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
  { emoji: '📷', label: 'Foto' },
  { emoji: '🎨', label: 'San\'at' },
  { emoji: '💪', label: 'Fitnes' },
  { emoji: '🐱', label: 'Hayvonlar' },
  { emoji: '🌱', label: 'Tabiat' },
]

const STEPS = ['Rasmlar', 'Asosiy', 'Haqida', 'Tayyor']

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0)
  const [isScrolledInPreview, setIsScrolledInPreview] = useState(false)
  
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

  // Calculate completion percentage
  const getCompletion = () => {
    let total = 0
    if (photos.length > 0) total += 25
    if (name && age && gender) total += 25
    if (bio || job || education) total += 25
    if (lookingFor && interests.length > 0) total += 25
    return total
  }

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

    try {
      // Update user name if changed
      if (name !== user.name) {
        const { error: userError } = await supabase
          .from('users')
          .update({ name })
          .eq('id', user.id)
        
        if (userError) {
          console.error('User update error:', userError)
        } else {
          localStorage.setItem('user', JSON.stringify({ ...user, name }))
        }
      }

      // Prepare profile data - only include basic fields that exist in schema
      const profileData: any = {
        id: user.id,
        bio: bio || null,
        age: parseInt(age),
        gender: gender || null,
        looking_for: lookingFor || null,
        location: location || null,
        profile_picture_url: photos[0] || null,
        photos: photos.slice(1) || [],
      }

      // Add optional fields if they have values
      if (height) profileData.height = parseInt(height)
      if (weight) profileData.weight = parseInt(weight)
      if (job) profileData.job = job
      if (education) profileData.education = education
      if (smoking) profileData.smoking = smoking
      if (drinking) profileData.drinking = drinking
      if (interests.length > 0) profileData.interests = interests

      console.log('Saving profile:', profileData)

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()

      console.log('Save result:', { data, error })

      if (error) {
        console.error('Profile save error:', error)
        hapticFeedback('error')
        const errorMsg = `Xatolik: ${error.message}`
        showAlert ? showAlert(errorMsg) : alert(errorMsg)
      } else {
        hapticFeedback('success')
        router.push('/swipe')
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      hapticFeedback('error')
      showAlert ? showAlert('Kutilmagan xatolik yuz berdi') : alert('Kutilmagan xatolik yuz berdi')
    }

    setSaving(false)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!user || !e.target.files?.[0]) return
    
    setUploading(true)
    hapticFeedback('light')
    const file = e.target.files[0]
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showAlert ? showAlert('Rasm hajmi 5MB dan oshmasligi kerak') : alert('Rasm hajmi 5MB dan oshmasligi kerak')
      setUploading(false)
      return
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${user.id}/${Date.now()}-${index}.${fileExt}`

    console.log('Uploading file:', fileName)

    const { data: uploadData, error } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, file, { 
        upsert: true,
        contentType: file.type 
      })

    console.log('Upload result:', { uploadData, error })

    if (error) {
      console.error('Upload error:', error)
      hapticFeedback('error')
      const errorMsg = error.message || 'Rasm yuklashda xatolik'
      showAlert ? showAlert(errorMsg) : alert(errorMsg)
      setUploading(false)
      return
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName)

    console.log('Public URL:', urlData.publicUrl)

    if (urlData.publicUrl) {
      const newPhotos = [...photos]
      newPhotos[index] = urlData.publicUrl
      setPhotos(newPhotos.filter(Boolean))
      hapticFeedback('success')
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

  const nextStep = () => {
    hapticFeedback('light')
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    hapticFeedback('light')
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (loading) {
  return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-5xl animate-pulse">✨</div>
      </div>
    )
  }

  // Preview Card Component
  const PreviewCard = () => (
    <div 
      className="relative w-full h-full bg-black rounded-3xl overflow-hidden"
      onClick={() => setIsScrolledInPreview(!isScrolledInPreview)}
    >
      {/* Photo */}
      <div className={`absolute inset-0 transition-all duration-500 ${isScrolledInPreview ? 'h-1/2' : 'h-full'}`}>
        {photos[previewPhotoIndex] ? (
                <Image
            src={photos[previewPhotoIndex]}
            alt=""
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
            <div className="text-center text-white/40">
              <span className="text-6xl">📷</span>
              <p className="mt-2 text-sm">Rasm yuklang</p>
            </div>
          </div>
        )}
        
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        
        {/* Photo indicators */}
        {photos.length > 1 && (
          <div className="absolute top-4 left-4 right-4 flex gap-1">
            {photos.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setPreviewPhotoIndex(idx) }}
                className={`flex-1 h-1 rounded-full transition-all ${
                  idx === previewPhotoIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
        
        {/* User info overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          {/* Premium badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-yellow-400 text-xs font-semibold">PREMIUM</span>
          </div>
          
          {/* Name & Age */}
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-bold text-white">{name || 'Ism'}</h2>
            <span className="text-xl text-gray-300">{age || '??'}</span>
          </div>
          
          {/* Location */}
          <div className="flex items-center gap-1 mt-1 text-gray-300 text-sm">
            <span>📍</span>
            <span>{location || 'Joylashuv'}</span>
          </div>
          
          {/* Stats */}
          <div className="flex gap-2 mt-3">
            {height && (
              <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs">
                📏 {height} cm
              </span>
            )}
            {weight && (
              <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs">
                ⚖️ {weight} kg
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Extended info (when scrolled) */}
      {isScrolledInPreview && (
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-black p-4 overflow-y-auto">
          {/* About */}
          {bio && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white mb-2">About</h3>
              <p className="text-gray-400 text-sm">{bio}</p>
            </div>
          )}
          
          {/* Job & Education */}
          {(job || education) && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white mb-2">More info</h3>
              <div className="flex flex-wrap gap-2">
                {job && (
                  <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs">
                    💼 {job}
                  </span>
                )}
                {education && (
                  <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs">
                    🎓 {education}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Interests */}
          {interests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => {
                const item = INTERESTS.find(i => i.label === interest)
                return (
                  <span key={interest} className="px-3 py-1 rounded-full bg-white/10 text-white text-xs">
                    {item?.emoji} {interest}
                  </span>
                )
              })}
            </div>
          )}
          
          <p className="text-center text-gray-600 text-xs mt-4">
            Yana bosing - yopiladi
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-lg border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevStep} className={`text-white ${currentStep === 0 ? 'opacity-0' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Profil yaratish</h1>
          <button 
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              showPreview ? 'bg-pink-500 text-white' : 'bg-white/10 text-white'
            }`}
          >
            👁 Preview
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="flex gap-1">
          {STEPS.map((step, idx) => (
            <div
              key={step}
              className={`flex-1 h-1 rounded-full transition-all ${
                idx <= currentStep ? 'bg-pink-500' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((step, idx) => (
            <span 
              key={step}
              className={`text-xs ${idx <= currentStep ? 'text-pink-500' : 'text-gray-600'}`}
            >
              {step}
            </span>
          ))}
        </div>
      </header>

      {/* Main content - Split view */}
      <div className={`flex ${showPreview ? 'flex-col lg:flex-row' : ''}`}>
        {/* Preview Panel */}
        {showPreview && (
          <div className="lg:w-1/2 p-4 lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)]">
            <div className="relative aspect-[9/16] max-h-[500px] mx-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <PreviewCard />
            </div>
            <p className="text-center text-gray-500 text-xs mt-3">
              Profilingiz boshqalarga shunday ko'rinadi
            </p>
          </div>
        )}

        {/* Form Panel */}
        <div className={`${showPreview ? 'lg:w-1/2' : 'w-full'} p-4 pb-32`}>
          {/* Completion badge */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">Profil to'liqligi</span>
              <span className="text-pink-500 font-bold">{getCompletion()}%</span>
            </div>
            <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                style={{ width: `${getCompletion()}%` }}
              />
            </div>
          </div>

          {/* Step 0: Photos */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">📸 Rasmlaringiz</h2>
                <p className="text-gray-400 text-sm">4 tagacha rasm yuklang. Birinchisi asosiy.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <label
                    key={index}
                    className={`aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer relative transition-all hover:scale-[1.02] ${
                      photos[index] ? '' : 'border-2 border-dashed border-white/20 bg-white/5'
                    }`}
                  >
                    {photos[index] ? (
                      <>
                        <Image src={photos[index]} alt="" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">O'zgartirish</span>
                        </div>
                        {index === 0 && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-pink-500 rounded-full">
                            <span className="text-xs text-white font-medium">Asosiy</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </div>
                        <span className="text-xs">{index === 0 ? 'Asosiy rasm' : `Rasm ${index + 1}`}</span>
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
                  <div className="text-pink-500 animate-pulse">⏳ Yuklanmoqda...</div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-sm text-gray-400">
                  💡 <span className="text-white">Maslahat:</span> Yuzingiz aniq ko'rinadigan, tabiiy rasmlar ko'proq like oladi!
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">👤 Asosiy ma'lumotlar</h2>
                <p className="text-gray-400 text-sm">O'zingiz haqingizda ayting</p>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Ismingiz</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 bg-white/5 rounded-2xl text-white text-lg border border-white/10 focus:border-pink-500 focus:outline-none"
                  placeholder="Ism"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Yoshingiz</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
                    className="w-full p-4 bg-white/5 rounded-2xl text-white text-lg border border-white/10 focus:border-pink-500 focus:outline-none"
                    placeholder="25"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Jinsingiz</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGender('male')}
                      className={`p-4 rounded-2xl text-center transition-all ${
                        gender === 'male' ? 'bg-pink-500 text-white' : 'bg-white/5 text-white border border-white/10'
                      }`}
                    >
                      👨
                    </button>
                    <button
                      onClick={() => setGender('female')}
                      className={`p-4 rounded-2xl text-center transition-all ${
                        gender === 'female' ? 'bg-pink-500 text-white' : 'bg-white/5 text-white border border-white/10'
                      }`}
                    >
                      👩
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">📏 Bo'yingiz (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none"
                    placeholder="175"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">⚖️ Vazningiz (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none"
                    placeholder="70"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">📍 Joylashuvingiz</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none"
                  placeholder="Toshkent, Uzbekistan"
                />
              </div>
            </div>
          )}

          {/* Step 2: About */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">✨ O'zingiz haqingizda</h2>
                <p className="text-gray-400 text-sm">Qiziqishlaringizni ulashing</p>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none resize-none"
                  placeholder="O'zingiz haqingizda qisqacha..."
                />
                <p className="text-xs text-gray-600 mt-1 text-right">{bio.length}/300</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-3 block">
                  🎯 Qiziqishlar ({interests.length}/6)
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => toggleInterest(item.label)}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        interests.includes(item.label)
                          ? 'bg-pink-500 text-white scale-105'
                          : 'bg-white/5 text-white border border-white/10 hover:border-pink-500/50'
                      }`}
                    >
                      {item.emoji} {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">🚬 Chekish</label>
                  <select
                    value={smoking}
                    onChange={(e) => setSmoking(e.target.value as any)}
                    className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none appearance-none"
                  >
                    <option value="" className="bg-black">Tanlang</option>
                    <option value="never" className="bg-black">Hech qachon</option>
                    <option value="sometimes" className="bg-black">Ba'zan</option>
                    <option value="often" className="bg-black">Tez-tez</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">🍷 Ichish</label>
                  <select
                    value={drinking}
                    onChange={(e) => setDrinking(e.target.value as any)}
                    className="w-full p-4 bg-white/5 rounded-2xl text-white border border-white/10 focus:border-pink-500 focus:outline-none appearance-none"
                  >
                    <option value="" className="bg-black">Tanlang</option>
                    <option value="never" className="bg-black">Hech qachon</option>
                    <option value="sometimes" className="bg-black">Ba'zan</option>
                    <option value="often" className="bg-black">Tez-tez</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preferences & Complete */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">💕 Kim qidiryapsiz?</h2>
                <p className="text-gray-400 text-sm">Oxirgi qadam!</p>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-3 block">Qidirayapsiz</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'male', label: 'Erkak', emoji: '👨' },
                    { value: 'female', label: 'Ayol', emoji: '👩' },
                    { value: 'both', label: 'Hammasi', emoji: '👥' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLookingFor(opt.value as any)}
                      className={`p-4 rounded-2xl text-center transition-all ${
                        lookingFor === opt.value
                          ? 'bg-pink-500 text-white scale-105'
                          : 'bg-white/5 text-white border border-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-1">{opt.emoji}</div>
                      <div className="text-sm">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="mt-8 p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20">
                <h3 className="font-semibold text-white mb-3">📋 Profil xulosasi</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rasmlar</span>
                    <span className={photos.length > 0 ? 'text-green-500' : 'text-red-500'}>
                      {photos.length > 0 ? `✓ ${photos.length} ta` : '✗ Yuklanmagan'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Asosiy ma'lumotlar</span>
                    <span className={name && age && gender ? 'text-green-500' : 'text-yellow-500'}>
                      {name && age && gender ? '✓ To\'liq' : '⚠ To\'liqsiz'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bio</span>
                    <span className={bio ? 'text-green-500' : 'text-gray-500'}>
                      {bio ? '✓ Yozilgan' : '○ Ixtiyoriy'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Qiziqishlar</span>
                    <span className={interests.length > 0 ? 'text-green-500' : 'text-gray-500'}>
                      {interests.length > 0 ? `✓ ${interests.length} ta` : '○ Ixtiyoriy'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-sm text-gray-400 text-center">
                  🎉 Profilingiz tayyor! "Boshlash" tugmasini bosing va tanishing!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/95 backdrop-blur-lg border-t border-white/10">
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={prevStep}
              className="flex-1 py-4 rounded-2xl bg-white/10 text-white font-semibold"
            >
              ← Orqaga
            </button>
          )}
          
          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={nextStep}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold"
            >
              Keyingi →
            </button>
          ) : (
        <button
          onClick={handleSave}
              disabled={saving || photos.length === 0}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold disabled:opacity-50"
        >
              {saving ? '⏳ Saqlanmoqda...' : '🚀 Boshlash!'}
        </button>
          )}
        </div>
      </div>
    </div>
  )
}
