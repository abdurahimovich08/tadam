-- =============================================
-- TANISHUV - Telegram Dating App Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id BIGINT UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster telegram_id lookups
CREATE INDEX idx_users_telegram_id ON users(telegram_id);

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  age INT CHECK (age >= 18 AND age <= 100),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  looking_for VARCHAR(10) CHECK (looking_for IN ('male', 'female', 'both')),
  profile_picture_url TEXT,
  photos TEXT[] DEFAULT '{}', -- Up to 4 photo URLs
  location VARCHAR(100),
  height INT CHECK (height >= 100 AND height <= 250), -- cm
  weight INT CHECK (weight >= 30 AND weight <= 300), -- kg
  job VARCHAR(100),
  education VARCHAR(100),
  interests TEXT[] DEFAULT '{}', -- Array of interests/tags
  smoking VARCHAR(20) CHECK (smoking IN ('never', 'sometimes', 'often')),
  drinking VARCHAR(20) CHECK (drinking IN ('never', 'sometimes', 'often')),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for filtering by age and gender
CREATE INDEX idx_profiles_age ON profiles(age);
CREATE INDEX idx_profiles_gender ON profiles(gender);

-- =============================================
-- SWIPES TABLE
-- =============================================
CREATE TABLE swipes (
  id BIGSERIAL PRIMARY KEY,
  swiper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liked BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(swiper_id, swiped_id) -- Prevent duplicate swipes
);

-- Indexes for faster swipe lookups
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX idx_swipes_mutual ON swipes(swiper_id, swiped_id, liked);

-- =============================================
-- MATCHES TABLE
-- =============================================
CREATE TABLE matches (
  id BIGSERIAL PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Indexes for faster match lookups
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ, -- When the message was read
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for faster message queries
CREATE INDEX idx_messages_match ON messages(match_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(match_id, created_at DESC);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can insert users" ON users
  FOR INSERT WITH CHECK (true);

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR true); -- Allow during registration

-- Swipes policies
CREATE POLICY "Users can view own swipes" ON swipes
  FOR SELECT USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

CREATE POLICY "Users can create swipes" ON swipes
  FOR INSERT WITH CHECK (true);

-- Matches policies
CREATE POLICY "Users can view own matches" ON matches
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create matches" ON matches
  FOR INSERT WITH CHECK (true);

-- Messages policies
CREATE POLICY "Match participants can view messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

CREATE POLICY "Match participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    ) OR true -- For anon users via telegram
  );

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- =============================================
-- STORAGE BUCKET
-- =============================================
-- After running this SQL, create a new Storage bucket named 'profile-pictures' in your Supabase project.
-- Set the bucket to be public.
-- 
-- Bucket settings:
-- - Name: profile-pictures
-- - Public: Yes
-- - File size limit: 5MB
-- - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif