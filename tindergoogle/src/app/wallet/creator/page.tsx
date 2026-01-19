'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { useTelegram } from '@/hooks/useTelegram'
import { useWallet, usePayments } from '@/hooks/usePayments'
import type { User, CreatorProfile, PaidContent } from '@/types'

export default function CreatorDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null)
  const [myContent, setMyContent] = useState<PaidContent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'settings'>('overview')
  const [showSetupModal, setShowSetupModal] = useState(false)
  
  // Setup form
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false)
  const [subscriptionPrice, setSubscriptionPrice] = useState('')
  const [photoPrice, setPhotoPrice] = useState('50')
  const [storyPrice, setStoryPrice] = useState('20')
  const [messagePrice, setMessagePrice] = useState('10')
  const [tipsEnabled, setTipsEnabled] = useState(true)
  
  const router = useRouter()
  const { hapticFeedback, showAlert } = useTelegram()
  const { wallet } = useWallet(user?.id)
  const { formatStars, formatMoney, starsToUZS } = usePayments()

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      // Fetch creator profile
      const { data: profile } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        setCreatorProfile(profile)
        setSubscriptionEnabled(profile.subscription_enabled)
        setSubscriptionPrice(profile.subscription_price?.toString() || '')
        setPhotoPrice(profile.default_photo_price?.toString() || '50')
        setStoryPrice(profile.default_story_price?.toString() || '20')
        setMessagePrice(profile.default_message_price?.toString() || '10')
        setTipsEnabled(profile.tips_enabled)
      } else {
        setShowSetupModal(true)
      }

      // Fetch my content
      const { data: content } = await supabase
        .from('paid_content')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })

      setMyContent(content || [])
      setLoading(false)
    }

    fetchData()
  }, [user])

  const handleSetupCreator = async () => {
    if (!user) return

    hapticFeedback?.('light')

    const { error } = await supabase.from('creator_profiles').upsert({
      user_id: user.id,
      subscription_enabled: subscriptionEnabled,
      subscription_price: parseInt(subscriptionPrice) || 0,
      default_photo_price: parseInt(photoPrice) || 50,
      default_story_price: parseInt(storyPrice) || 20,
      default_message_price: parseInt(messagePrice) || 10,
      tips_enabled: tipsEnabled,
    })

    if (error) {
      console.error('Error setting up creator:', error)
      showAlert?.('Xatolik yuz berdi')
      hapticFeedback?.('error')
      return
    }

    // Update wallet to creator status
    await supabase
      .from('wallets')
      .update({ is_creator: true })
      .eq('user_id', user.id)

    hapticFeedback?.('success')
    showAlert?.('Kreator profili yaratildi! 🎉')
    setShowSetupModal(false)

    // Refresh data
    const { data: profile } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profile) setCreatorProfile(profile)
  }

  const calculateStats = () => {
    const totalViews = myContent.reduce((sum, c) => sum + c.view_count, 0)
    const totalSales = myContent.reduce((sum, c) => sum + c.purchase_count, 0)
    const totalRevenue = myContent.reduce((sum, c) => sum + (c.purchase_count * c.price * 0.9), 0)
    return { totalViews, totalSales, totalRevenue }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-5xl animate-pulse">👑</div>
      </div>
    )
  }

  const stats = calculateStats()

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
          <h1 className="text-lg font-bold text-white">Kreator Panel</h1>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Creator Badge */}
      <div className="px-4 pt-6">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-3xl">👑</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-lg">{user?.name}</h2>
              {creatorProfile?.creator_verified && (
                <span className="text-blue-400">✓</span>
              )}
            </div>
            <p className="text-purple-400 text-sm">Kreator</p>
          </div>
        </div>
      </div>

      {/* Earnings Card */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-br from-green-600 to-emerald-500 rounded-3xl p-6">
          <p className="text-white/80 text-sm mb-1">Jami daromad</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-white">
              {formatStars(wallet?.total_earned || 0)}
            </span>
            <span className="text-xl">⭐</span>
          </div>
          <p className="text-white/70 text-sm">
            ≈ {formatMoney(starsToUZS(wallet?.total_earned || 0))}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mt-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {creatorProfile?.total_subscribers || 0}
            </div>
            <div className="text-xs text-gray-500">Obunachi</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.totalSales}</div>
            <div className="text-xs text-gray-500">Sotuvlar</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.totalViews}</div>
            <div className="text-xs text-gray-500">Ko'rishlar</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-6">
        <div className="flex bg-white/5 rounded-xl p-1">
          {[
            { id: 'overview', label: 'Umumiy' },
            { id: 'content', label: 'Kontent' },
            { id: 'settings', label: 'Sozlamalar' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                hapticFeedback?.('light')
                setActiveTab(tab.id as any)
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Quick Actions */}
            <h3 className="text-white font-semibold">Yangi kontent qo'shish</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-center">
                <span className="text-3xl block mb-2">📸</span>
                <span className="text-white text-sm">Rasm</span>
              </button>
              <button className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-center">
                <span className="text-3xl block mb-2">📖</span>
                <span className="text-white text-sm">Story</span>
              </button>
              <button className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-center">
                <span className="text-3xl block mb-2">🎬</span>
                <span className="text-white text-sm">Video</span>
              </button>
              <button className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-center">
                <span className="text-3xl block mb-2">🎤</span>
                <span className="text-white text-sm">Ovozli xabar</span>
              </button>
            </div>

            {/* Pricing Info */}
            <div className="mt-6 p-4 rounded-2xl bg-white/5">
              <h3 className="text-white font-semibold mb-3">Joriy narxlar</h3>
              <div className="space-y-2 text-sm">
                {subscriptionEnabled && (
                  <div className="flex justify-between text-gray-400">
                    <span>👑 Obuna (oylik)</span>
                    <span className="text-white">{creatorProfile?.subscription_price || 0} ⭐</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400">
                  <span>📸 Rasm</span>
                  <span className="text-white">{creatorProfile?.default_photo_price || 50} ⭐</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>📖 Story</span>
                  <span className="text-white">{creatorProfile?.default_story_price || 20} ⭐</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>💬 Xabar</span>
                  <span className="text-white">{creatorProfile?.default_message_price || 10} ⭐</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💝</span>
                <div>
                  <div className="text-white font-medium">Tiplar {tipsEnabled ? 'yoqilgan' : 'o\'chirilgan'}</div>
                  <div className="text-gray-400 text-sm">Min: {creatorProfile?.min_tip_amount || 10} ⭐</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-4 animate-fadeIn">
            {myContent.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-5xl block mb-4">📭</span>
                <p className="text-gray-500 mb-4">Hali kontent yo'q</p>
                <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">
                  + Birinchi kontentni qo'shing
                </button>
              </div>
            ) : (
              myContent.map((content) => (
                <div key={content.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5">
                  <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center">
                    <span className="text-2xl">
                      {content.type === 'photo' ? '📸' : 
                       content.type === 'story' ? '📖' : 
                       content.type === 'video' ? '🎬' : '📄'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">{content.title || content.type}</div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{content.price} ⭐</span>
                      <span>{content.purchase_count} sotilgan</span>
                      <span>{content.view_count} ko'rish</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Subscription Settings */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Obuna tizimi</h3>
                <button
                  onClick={() => setSubscriptionEnabled(!subscriptionEnabled)}
                  className={`w-12 h-6 rounded-full transition-all ${
                    subscriptionEnabled ? 'bg-purple-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                    subscriptionEnabled ? 'ml-6' : 'ml-0.5'
                  }`} />
                </button>
              </div>
              
              {subscriptionEnabled && (
                <div className="p-4 rounded-2xl bg-white/5 space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Oylik obuna narxi (Stars)</label>
                    <input
                      type="number"
                      value={subscriptionPrice}
                      onChange={(e) => setSubscriptionPrice(e.target.value)}
                      placeholder="100"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-white font-semibold mb-4">Standart narxlar</h3>
              <div className="p-4 rounded-2xl bg-white/5 space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">📸 Rasm narxi (Stars)</label>
                  <input
                    type="number"
                    value={photoPrice}
                    onChange={(e) => setPhotoPrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">📖 Story narxi (Stars)</label>
                  <input
                    type="number"
                    value={storyPrice}
                    onChange={(e) => setStoryPrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">💬 Xabar narxi (Stars)</label>
                  <input
                    type="number"
                    value={messagePrice}
                    onChange={(e) => setMessagePrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Tips */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">💝 Tiplarni qabul qilish</h3>
                <button
                  onClick={() => setTipsEnabled(!tipsEnabled)}
                  className={`w-12 h-6 rounded-full transition-all ${
                    tipsEnabled ? 'bg-purple-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                    tipsEnabled ? 'ml-6' : 'ml-0.5'
                  }`} />
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSetupCreator}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
            >
              💾 Sozlamalarni saqlash
            </button>
          </div>
        )}
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fadeIn p-4">
          <div className="w-full max-w-md bg-gray-900 rounded-3xl p-6 animate-scaleIn">
            <div className="text-center mb-6">
              <span className="text-6xl mb-4 block">👑</span>
              <h2 className="text-2xl font-bold text-white mb-2">Kreator bo'ling!</h2>
              <p className="text-gray-400">
                Kontentingiz bilan pul ishlashni boshlang
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {/* Subscription toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5">
                <div>
                  <div className="text-white font-medium">Obuna tizimi</div>
                  <div className="text-gray-500 text-sm">Oylik obuna yoqing</div>
                </div>
                <button
                  onClick={() => setSubscriptionEnabled(!subscriptionEnabled)}
                  className={`w-12 h-6 rounded-full transition-all ${
                    subscriptionEnabled ? 'bg-purple-500' : 'bg-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                    subscriptionEnabled ? 'ml-6' : 'ml-0.5'
                  }`} />
                </button>
              </div>

              {subscriptionEnabled && (
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Obuna narxi (Stars/oy)</label>
                  <input
                    type="number"
                    value={subscriptionPrice}
                    onChange={(e) => setSubscriptionPrice(e.target.value)}
                    placeholder="100"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-purple-500 outline-none"
                  />
                </div>
              )}

              <div className="p-4 rounded-2xl bg-green-500/20 border border-green-500/30">
                <div className="text-green-400 font-medium mb-1">✅ Sizga 90% daromad</div>
                <div className="text-gray-400 text-sm">Platformamiz faqat 10% komissiya oladi</div>
              </div>
            </div>

            <button
              onClick={handleSetupCreator}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
            >
              🚀 Boshlash
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
