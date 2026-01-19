# 💳 Tanishuv - To'lov Tizimi Sozlamalari

## 🔑 Environment Variables

Quyidagi o'zgaruvchilarni `.env.local` fayliga qo'shing:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://gfvdxjqhuvmwrbhwtaqa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token
```

---

## 📱 1-Qadam: Telegram Bot Sozlash

### 1.1 Bot yaratish (agar yo'q bo'lsa)

1. Telegram'da [@BotFather](https://t.me/BotFather) ni oching
2. `/newbot` yuborib yangi bot yarating
3. Bot nomini kiriting
4. Bot username'ni kiriting (oxiri `_bot` bilan tugashi kerak)
5. **Bot token**ni nusxalang

### 1.2 To'lovlarni yoqish

1. @BotFather'ga `/mybots` yuboring
2. Botingizni tanlang
3. **Payments** tugmasini bosing
4. **Telegram Stars** ni tanlang
5. To'lov provayderini ulang

### 1.3 Bot sozlamalari

```bash
# Bot description
/setdescription
# "Tanishuv - sevgi topish uchun ilova"

# Bot about
/setabouttext  
# "Premium kontentlar va to'lovlar uchun bot"

# Menu button (ilovaga havola)
/setmenubutton
# URL: https://t.me/your_bot/app
```

---

## 🗄️ 2-Qadam: Supabase Sozlash

### 2.1 SQL'larni ishga tushirish

Supabase Dashboard > SQL Editor:

1. **monetization_schema.sql** - jadvallar
2. **payment_functions.sql** - funksiyalar va RLS

### 2.2 Service Role Key olish

1. Supabase Dashboard > Settings > API
2. **service_role** kalitini nusxalang (maxfiy saqlang!)

---

## 🌐 3-Qadam: Vercel Sozlash

### 3.1 Environment Variables

Vercel Dashboard > Settings > Environment Variables:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `TELEGRAM_BOT_TOKEN` | Bot token |

### 3.2 Webhook o'rnatish

Deploy qilgandan so'ng, webhook'ni sozlang:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://your-domain.vercel.app/api/payments/webhook"
```

Tekshirish:
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

---

## 💰 4-Qadam: Stars Sotib Olish Test

### Test qilish

1. Mini App'ni oching
2. **Hamyon** sahifasiga o'ting
3. **Stars sotib olish** tugmasini bosing
4. Paketni tanlang
5. Telegram to'lov oynasi ochiladi
6. To'lovni amalga oshiring

### Webhook log'larini ko'rish

```bash
# Vercel logs
vercel logs --follow
```

---

## 🔄 To'lov Oqimi

```
┌─────────────────────────────────────────────────────────────┐
│  1. User "Stars sotib olish" ni bosadi                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Frontend → /api/payments/create-invoice                 │
│     {userId, packageId, telegramUserId}                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Backend → Telegram Bot API (createInvoiceLink)          │
│     Returns: invoiceUrl                                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Frontend → webApp.openInvoice(invoiceUrl)               │
│     Telegram to'lov oynasi ochiladi                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  5. User to'lov qiladi (Telegram Stars)                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Telegram → /api/payments/webhook                        │
│     pre_checkout_query → Tekshirish                         │
│     successful_payment → Stars qo'shish                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Stars user wallet'ga qo'shiladi                         │
│     + Telegram'da tasdiqlash xabari yuboriladi              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Xavfsizlik

### Production uchun:

1. **SUPABASE_SERVICE_ROLE_KEY** - faqat backend'da ishlating
2. **Webhook verification** - Telegram update'larni tekshiring
3. **Rate limiting** - API so'rovlarni cheklang
4. **Error logging** - xatolarni kuzatib boring

### Webhook tekshirish (ixtiyoriy):

```typescript
import crypto from 'crypto'

function verifyTelegramWebhook(body: string, secretToken: string): boolean {
  // Telegram secret_token tekshirish
  // https://core.telegram.org/bots/api#setwebhook
}
```

---

## ❓ Tez-tez so'raladigan savollar

**Q: Stars qachon hisobga tushadi?**
A: To'lov muvaffaqiyatli bo'lgandan so'ng darhol (1-2 sekund)

**Q: Webhook ishlamayapti?**
A: 
1. Webhook URL'ni tekshiring
2. Bot token to'g'ri ekanligini tekshiring
3. Vercel logs'ni ko'ring

**Q: "Invoice yaratishda xatolik" xatosi?**
A: Bot'da to'lovlar yoqilmagandir. @BotFather > Payments ni tekshiring

---

## 📞 Yordam

Muammo bo'lsa:
1. Vercel logs'ni tekshiring
2. Supabase logs'ni tekshiring
3. Telegram Bot API xatolarini ko'ring
