# TINDERGOOGLE

Telegram Web App that mirrors Tinder-style swiping, matching, and chat inside Telegram.

## Stack
- Next.js App Router (deploy on Vercel)
- Supabase (database, auth, storage, realtime)
- Telegram Web App + Bot API

## Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` in a browser or inside Telegram Web App.

## Telegram setup
1. Create a bot with BotFather and grab the bot token.
2. Set the Web App URL in BotFather (use your ngrok or Vercel URL).
3. Fill in `.env.local` with the bot name and token.

## Supabase setup
1. Create a Supabase project and copy the project URL + anon key.
2. Create a storage bucket for profile photos (public read).
3. Run the SQL in `supabase/schema.sql` once it is added.

## Environment variables
See `.env.example` for required keys.
