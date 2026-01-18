-- Create the users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create the profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES users(id),
  bio TEXT,
  age INT,
  profile_picture_url TEXT
);

-- Create the swipes table
CREATE TABLE swipes (
  id BIGSERIAL PRIMARY KEY,
  swiper_id UUID NOT NULL REFERENCES users(id),
  swiped_id UUID NOT NULL REFERENCES users(id),
  liked BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create the matches table
CREATE TABLE matches (
  id BIGSERIAL PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES users(id),
  user2_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create the messages table
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES matches(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- After running this SQL, create a new Storage bucket named 'profile-pictures' in your Supabase project.
-- Set the bucket to be public.
