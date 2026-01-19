'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTelegram } from '@/hooks/useTelegram'
import { useWallet, useStarPackages, useTransactions, usePayments } from '@/hooks/usePayments'
import type { User, StarPackage, Transaction } from '@/types'

export default function WalletPage() {
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<'balance' | 'earn' | 'history'>('balance')
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const router = useRouter()
  const { hapticFeedback } = useTelegram()

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [router])

  const { wallet, loading: walletLoading, refetch: refetchWallet } = useWallet(user?.id)
  const { packages } = useStarPackages()
  const { transactions, loading: txLoading } = useTransactions(user?.id)
  const { formatStars, formatMoney, starsToUZS, purchaseStars } = usePayments()

  if (walletLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-5xl animate-pulse">⭐</div>
      </div>
    )
  }

  const handleBuyPackage = async (pkg: StarPackage) => {
    hapticFeedback?.('light')
    await purchaseStars(pkg.id, pkg.stars_amount, pkg.price_stars, () => {
      refetchWallet()
      setShowBuyModal(false)
    })
  }

  const getTransactionIcon = (type: Transaction['type']) => {
    const icons: Record<string, string> = {
      purchase: '💳',
      tip: '💝',
      subscription: '👑',
      content_unlock: '🔓',
      story_view: '👁️',
      message_payment: '💬',
      gift: '🎁',
      earning: '💰',
      withdrawal: '🏦',
      refund: '↩️',
      bonus: '🎉',
    }
    return icons[type] || '⭐'
  }

  const getTransactionColor = (type: Transaction['type']) => {
    if (['earning', 'purchase', 'bonus', 'refund'].includes(type)) {
      return 'text-green-500'
    }
    return 'text-red-400'
  }

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
          <h1 className="text-lg font-bold text-white">Hamyon</h1>
          <div className="w-6" />
        </div>
      </header>

      {/* Balance Card */}
      <div className="px-4 pt-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-6">
          {/* Decorative elements */}
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-white/10" />
          
          <div className="relative">
            <p className="text-white/80 text-sm mb-1">Joriy balans</p>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-bold text-white">
                {formatStars(wallet?.stars_balance || 0)}
              </span>
              <span className="text-2xl">⭐</span>
            </div>
            
            <p className="text-white/70 text-sm mb-6">
              ≈ {formatMoney(starsToUZS(wallet?.stars_balance || 0))}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBuyModal(true)}
                className="flex-1 py-3 rounded-xl bg-white text-purple-600 font-semibold"
              >
                + Sotib olish
              </button>
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="flex-1 py-3 rounded-xl bg-white/20 text-white font-semibold"
              >
                Yechib olish
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mt-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <div className="text-xl font-bold text-green-500">
              {formatStars(wallet?.total_earned || 0)}
            </div>
            <div className="text-xs text-gray-500">Jami ishlagan</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <div className="text-xl font-bold text-pink-500">
              {formatStars(wallet?.total_spent || 0)}
            </div>
            <div className="text-xs text-gray-500">Sarflangan</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center">
            <div className="text-xl font-bold text-blue-500">
              {formatStars(wallet?.total_withdrawn || 0)}
            </div>
            <div className="text-xs text-gray-500">Yechib olingan</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-6">
        <div className="flex bg-white/5 rounded-xl p-1">
          {[
            { id: 'balance', label: 'Balans' },
            { id: 'earn', label: 'Pul ishlash' },
            { id: 'history', label: 'Tarix' },
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
        {activeTab === 'balance' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-white font-semibold mb-3">Tezkor amallar</h3>
              
              <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
                  <span className="text-xl">🎁</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">Sovg'a yuborish</div>
                  <div className="text-gray-500 text-sm">Do'stlaringizga sovg'a bering</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                  <span className="text-xl">💝</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">Tip yuborish</div>
                  <div className="text-gray-500 text-sm">Yoqqan foydalanuvchiga tip bering</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              <button 
                onClick={() => router.push('/wallet/creator')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-500/50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-xl">👑</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">Kreator bo'ling</div>
                  <div className="text-gray-500 text-sm">Kontentingiz bilan pul ishlang</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-purple-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'earn' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-4">
              <h3 className="text-green-400 font-semibold mb-2">💰 Pul ishlash yo'llari</h3>
              <p className="text-gray-400 text-sm">
                Kontentingiz orqali daromad qiling. Platformamiz faqat 10% komissiya oladi!
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📸</span>
                  <div className="font-medium text-white">Pullik rasmlar</div>
                </div>
                <p className="text-gray-500 text-sm">
                  Eksklyuziv rasmlaringizni pullik qilib joylashtiring
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📖</span>
                  <div className="font-medium text-white">Pullik Stories</div>
                </div>
                <p className="text-gray-500 text-sm">
                  Maxsus stories yarating va pullik qiling
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">👑</span>
                  <div className="font-medium text-white">Obuna tizimi</div>
                </div>
                <p className="text-gray-500 text-sm">
                  Oylik obuna narxini belgilang va doimiy daromad oling
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">💬</span>
                  <div className="font-medium text-white">Pullik xabarlar</div>
                </div>
                <p className="text-gray-500 text-sm">
                  Siz bilan yozishmoqchi bo'lganlar to'lasin
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎁</span>
                  <div className="font-medium text-white">Sovg'alar qabul qilish</div>
                </div>
                <p className="text-gray-500 text-sm">
                  Muxlislaringizdan sovg'a va tip qabul qiling
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/wallet/creator')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
            >
              🚀 Kreator bo'lish
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3 animate-fadeIn">
            {txLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin text-3xl">⭐</div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl block mb-2">📭</span>
                <p className="text-gray-500">Tranzaksiyalar yo'q</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-lg">{getTransactionIcon(tx.type)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium capitalize">
                      {tx.type.replace('_', ' ')}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {new Date(tx.created_at).toLocaleDateString('uz-UZ')}
                    </div>
                  </div>
                  <div className={`font-semibold ${getTransactionColor(tx.type)}`}>
                    {['earning', 'purchase', 'bonus', 'refund'].includes(tx.type) ? '+' : '-'}
                    {tx.amount} ⭐
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Buy Stars Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 animate-fadeIn">
          <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl p-6 animate-slideUp">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Stars sotib olish</h2>
              <button
                onClick={() => setShowBuyModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                <span className="text-white">✕</span>
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleBuyPackage(pkg)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                      <span className="text-xl">⭐</span>
                    </div>
                    <div className="text-left">
                      <div className="text-white font-semibold">
                        {pkg.stars_amount} Stars
                      </div>
                      {pkg.bonus_percent > 0 && (
                        <div className="text-green-400 text-xs">
                          +{pkg.bonus_percent}% bonus
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">
                      {pkg.price_stars} ⭐
                    </div>
                    <div className="text-gray-500 text-xs">Telegram Stars</div>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-gray-500 text-xs text-center">
              To'lov Telegram Stars orqali amalga oshiriladi
            </p>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 animate-fadeIn">
          <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl p-6 animate-slideUp">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Pul yechib olish</h2>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                <span className="text-white">✕</span>
              </button>
            </div>

            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-2xl p-4 mb-6">
              <p className="text-yellow-400 text-sm">
                ⚠️ Minimal yechib olish miqdori: 1000 Stars
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/5">
                <div className="text-gray-400 text-sm mb-1">Mavjud balans</div>
                <div className="text-2xl font-bold text-white">
                  {formatStars(wallet?.stars_balance || 0)} ⭐
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5">
                <div className="text-gray-400 text-sm mb-1">So'mga aylantirilganda</div>
                <div className="text-2xl font-bold text-green-500">
                  {formatMoney(starsToUZS(wallet?.stars_balance || 0))}
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="text-white font-semibold">Yechib olish usuli</h3>
              
              <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-blue-500/50">
                <span className="text-2xl">💳</span>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">Bank kartasi</div>
                  <div className="text-gray-500 text-sm">Humo, Uzcard, Visa, Mastercard</div>
                </div>
              </button>

              <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-purple-500/50">
                <span className="text-2xl">🔷</span>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">Telegram Stars</div>
                  <div className="text-gray-500 text-sm">Stars sifatida qaytarish</div>
                </div>
              </button>

              <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-orange-500/50">
                <span className="text-2xl">💎</span>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">Kripto (TON)</div>
                  <div className="text-gray-500 text-sm">TON Wallet ga o'tkazish</div>
                </div>
              </button>
            </div>

            <p className="text-gray-500 text-xs text-center mb-4">
              So'rov 24 soat ichida ko'rib chiqiladi. Komissiya: 2%
            </p>

            <button
              disabled={(wallet?.stars_balance || 0) < 1000}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Yechib olishni so'rash
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
