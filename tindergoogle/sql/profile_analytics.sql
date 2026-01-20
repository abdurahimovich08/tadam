-- ========================================
-- PROFILE ANALYTICS SCHEMA
-- Profile views, likes, followers tracking
-- ========================================

-- Profile Views Table
CREATE TABLE IF NOT EXISTS profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES users(id) ON DELETE SET NULL, -- NULL if anonymous/deleted
  viewer_name text, -- Cache name for display
  viewer_photo text, -- Cache photo URL
  viewed_at timestamptz DEFAULT now(),
  source text DEFAULT 'swipe', -- 'swipe', 'search', 'profile', 'match'
  duration_seconds integer DEFAULT 0, -- How long they viewed
  UNIQUE(profile_id, viewer_id, DATE(viewed_at)) -- One view per day per user
);

-- Profile Likes (who liked you but no match yet)
CREATE TABLE IF NOT EXISTS profile_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  liker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liker_name text,
  liker_photo text,
  liker_age integer,
  liked_at timestamptz DEFAULT now(),
  is_seen boolean DEFAULT false, -- Has profile owner seen this like
  is_super_like boolean DEFAULT false,
  UNIQUE(profile_id, liker_id)
);

-- Followers Table (subscribers to your content)
CREATE TABLE IF NOT EXISTS followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  follower_name text,
  follower_photo text,
  followed_at timestamptz DEFAULT now(),
  notifications_enabled boolean DEFAULT true,
  UNIQUE(profile_id, follower_id)
);

-- Profile Stats Cache (for fast loading)
CREATE TABLE IF NOT EXISTS profile_stats (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_views integer DEFAULT 0,
  views_today integer DEFAULT 0,
  views_this_week integer DEFAULT 0,
  views_this_month integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  likes_today integer DEFAULT 0,
  unseen_likes integer DEFAULT 0,
  total_matches integer DEFAULT 0,
  total_followers integer DEFAULT 0,
  total_following integer DEFAULT 0,
  profile_score integer DEFAULT 0, -- Popularity score
  last_active timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_profile_views_profile ON profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_date ON profile_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_profile_likes_profile ON profile_likes(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_likes_liker ON profile_likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_profile_likes_unseen ON profile_likes(profile_id, is_seen) WHERE NOT is_seen;
CREATE INDEX IF NOT EXISTS idx_followers_profile ON followers(profile_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to record a profile view
CREATE OR REPLACE FUNCTION record_profile_view(
  p_profile_id uuid,
  p_viewer_id uuid,
  p_viewer_name text DEFAULT NULL,
  p_viewer_photo text DEFAULT NULL,
  p_source text DEFAULT 'swipe',
  p_duration integer DEFAULT 0
) RETURNS void AS $$
BEGIN
  -- Insert or update view (one per day per user)
  INSERT INTO profile_views (profile_id, viewer_id, viewer_name, viewer_photo, source, duration_seconds)
  VALUES (p_profile_id, p_viewer_id, p_viewer_name, p_viewer_photo, p_source, p_duration)
  ON CONFLICT (profile_id, viewer_id, DATE(viewed_at)) 
  DO UPDATE SET 
    duration_seconds = profile_views.duration_seconds + EXCLUDED.duration_seconds,
    viewed_at = now();
    
  -- Update stats cache
  INSERT INTO profile_stats (profile_id, total_views, views_today)
  VALUES (p_profile_id, 1, 1)
  ON CONFLICT (profile_id) DO UPDATE SET
    total_views = profile_stats.total_views + 1,
    views_today = CASE 
      WHEN DATE(profile_stats.updated_at) = CURRENT_DATE THEN profile_stats.views_today + 1
      ELSE 1 
    END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to record a profile like
CREATE OR REPLACE FUNCTION record_profile_like(
  p_profile_id uuid,
  p_liker_id uuid,
  p_liker_name text DEFAULT NULL,
  p_liker_photo text DEFAULT NULL,
  p_liker_age integer DEFAULT NULL,
  p_is_super_like boolean DEFAULT false
) RETURNS void AS $$
BEGIN
  -- Insert like
  INSERT INTO profile_likes (profile_id, liker_id, liker_name, liker_photo, liker_age, is_super_like)
  VALUES (p_profile_id, p_liker_id, p_liker_name, p_liker_photo, p_liker_age, p_is_super_like)
  ON CONFLICT (profile_id, liker_id) DO UPDATE SET
    liked_at = now(),
    is_super_like = EXCLUDED.is_super_like;
    
  -- Update stats cache
  INSERT INTO profile_stats (profile_id, total_likes, unseen_likes)
  VALUES (p_profile_id, 1, 1)
  ON CONFLICT (profile_id) DO UPDATE SET
    total_likes = profile_stats.total_likes + 1,
    unseen_likes = profile_stats.unseen_likes + 1,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to follow a profile
CREATE OR REPLACE FUNCTION follow_profile(
  p_profile_id uuid,
  p_follower_id uuid,
  p_follower_name text DEFAULT NULL,
  p_follower_photo text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO followers (profile_id, follower_id, follower_name, follower_photo)
  VALUES (p_profile_id, p_follower_id, p_follower_name, p_follower_photo)
  ON CONFLICT (profile_id, follower_id) DO NOTHING;
  
  -- Update stats
  UPDATE profile_stats 
  SET total_followers = total_followers + 1, updated_at = now()
  WHERE profile_id = p_profile_id;
  
  UPDATE profile_stats 
  SET total_following = total_following + 1, updated_at = now()
  WHERE profile_id = p_follower_id;
END;
$$ LANGUAGE plpgsql;

-- Function to unfollow a profile
CREATE OR REPLACE FUNCTION unfollow_profile(
  p_profile_id uuid,
  p_follower_id uuid
) RETURNS void AS $$
BEGIN
  DELETE FROM followers 
  WHERE profile_id = p_profile_id AND follower_id = p_follower_id;
  
  -- Update stats
  UPDATE profile_stats 
  SET total_followers = GREATEST(0, total_followers - 1), updated_at = now()
  WHERE profile_id = p_profile_id;
  
  UPDATE profile_stats 
  SET total_following = GREATEST(0, total_following - 1), updated_at = now()
  WHERE profile_id = p_follower_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get profile analytics
CREATE OR REPLACE FUNCTION get_profile_analytics(p_profile_id uuid)
RETURNS TABLE (
  total_views bigint,
  views_today bigint,
  views_this_week bigint,
  total_likes bigint,
  unseen_likes bigint,
  total_followers bigint,
  total_matches bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ps.total_views, 0)::bigint,
    (SELECT COUNT(*) FROM profile_views WHERE profile_id = p_profile_id AND viewed_at > CURRENT_DATE)::bigint,
    (SELECT COUNT(*) FROM profile_views WHERE profile_id = p_profile_id AND viewed_at > CURRENT_DATE - INTERVAL '7 days')::bigint,
    COALESCE(ps.total_likes, 0)::bigint,
    COALESCE(ps.unseen_likes, 0)::bigint,
    COALESCE(ps.total_followers, 0)::bigint,
    (SELECT COUNT(*) FROM matches WHERE user1_id = p_profile_id OR user2_id = p_profile_id)::bigint
  FROM profile_stats ps
  WHERE ps.profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql;

-- Mark likes as seen
CREATE OR REPLACE FUNCTION mark_likes_seen(p_profile_id uuid) 
RETURNS void AS $$
BEGIN
  UPDATE profile_likes SET is_seen = true WHERE profile_id = p_profile_id AND NOT is_seen;
  UPDATE profile_stats SET unseen_likes = 0, updated_at = now() WHERE profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_stats ENABLE ROW LEVEL SECURITY;

-- Profile views: can see own views
CREATE POLICY "Users can view their own profile views" ON profile_views
  FOR SELECT USING (profile_id = auth.uid() OR viewer_id = auth.uid());

-- Profile likes: can see likes on own profile
CREATE POLICY "Users can view likes on their profile" ON profile_likes
  FOR SELECT USING (profile_id = auth.uid());

-- Followers: can see own followers/following
CREATE POLICY "Users can view their followers" ON followers
  FOR SELECT USING (profile_id = auth.uid() OR follower_id = auth.uid());

CREATE POLICY "Users can manage their following" ON followers
  FOR ALL USING (follower_id = auth.uid());

-- Stats: can see own stats
CREATE POLICY "Users can view their own stats" ON profile_stats
  FOR SELECT USING (profile_id = auth.uid());

-- ========================================
-- TRIGGERS
-- ========================================

-- Auto-create profile_stats when profile is created
CREATE OR REPLACE FUNCTION create_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profile_stats (profile_id) VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_profile_stats ON profiles;
CREATE TRIGGER trigger_create_profile_stats
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_stats();

-- Daily stats reset job (run via cron)
CREATE OR REPLACE FUNCTION reset_daily_stats()
RETURNS void AS $$
BEGIN
  UPDATE profile_stats SET 
    views_today = 0,
    likes_today = 0,
    updated_at = now()
  WHERE DATE(updated_at) < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
