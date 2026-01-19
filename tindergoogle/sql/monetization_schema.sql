-- =============================================
-- MONETIZATION SYSTEM SCHEMA
-- Premium Content & Stars Economy
-- =============================================

-- =============================================
-- WALLETS TABLE - User's Star Balance
-- =============================================
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars_balance BIGINT DEFAULT 0, -- Current Stars balance
  total_earned BIGINT DEFAULT 0, -- Total Stars earned (lifetime)
  total_spent BIGINT DEFAULT 0, -- Total Stars spent (lifetime)
  total_withdrawn BIGINT DEFAULT 0, -- Total Stars withdrawn
  pending_withdrawal BIGINT DEFAULT 0, -- Stars pending withdrawal
  is_creator BOOLEAN DEFAULT false, -- Can receive payments
  creator_verified BOOLEAN DEFAULT false, -- Verified creator status
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- =============================================
-- STAR PACKAGES - Stars Purchase Options
-- =============================================
CREATE TABLE IF NOT EXISTS star_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  stars_amount BIGINT NOT NULL, -- How many stars
  price_stars BIGINT NOT NULL, -- Price in Telegram Stars
  bonus_percent INT DEFAULT 0, -- Bonus percentage for larger packages
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default packages
INSERT INTO star_packages (name, stars_amount, price_stars, bonus_percent, sort_order) VALUES
  ('Starter', 100, 100, 0, 1),
  ('Popular', 500, 475, 5, 2),
  ('Best Value', 1000, 900, 10, 3),
  ('Premium', 5000, 4000, 20, 4),
  ('VIP', 10000, 7500, 25, 5)
ON CONFLICT DO NOTHING;

-- =============================================
-- TRANSACTIONS - All Financial Movements
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'purchase', -- Buying stars
    'tip', -- Sending tip
    'subscription', -- Subscription payment
    'content_unlock', -- Unlocking paid content
    'story_view', -- Paid story view
    'message_payment', -- Paid message
    'gift', -- Gift purchase
    'earning', -- Receiving payment
    'withdrawal', -- Withdrawing to real money
    'refund', -- Refund
    'bonus' -- Bonus stars
  )),
  amount BIGINT NOT NULL, -- Stars amount
  fee BIGINT DEFAULT 0, -- Platform fee (10%)
  net_amount BIGINT NOT NULL, -- Amount after fee
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN (
    'pending', 'completed', 'failed', 'refunded', 'cancelled'
  )),
  related_user_id UUID REFERENCES users(id), -- Other party in transaction
  content_id UUID, -- Related content if applicable
  content_type VARCHAR(30), -- 'story', 'photo', 'subscription', 'message'
  telegram_payment_id VARCHAR(100), -- Telegram payment charge ID
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- CREATOR PROFILES - Extended Creator Info
-- =============================================
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Subscription pricing
  subscription_enabled BOOLEAN DEFAULT false,
  subscription_price BIGINT DEFAULT 0, -- Monthly subscription in Stars
  subscription_benefits TEXT[], -- List of benefits
  
  -- Content pricing defaults
  default_photo_price BIGINT DEFAULT 50,
  default_story_price BIGINT DEFAULT 20,
  default_message_price BIGINT DEFAULT 10,
  
  -- Tipping
  tips_enabled BOOLEAN DEFAULT true,
  min_tip_amount BIGINT DEFAULT 10,
  
  -- Stats
  total_subscribers INT DEFAULT 0,
  total_content_sold INT DEFAULT 0,
  
  -- Payout settings
  payout_method VARCHAR(30) CHECK (payout_method IN (
    'telegram_stars', 'card', 'crypto'
  )),
  payout_details JSONB DEFAULT '{}', -- Encrypted card/wallet info
  min_payout_amount BIGINT DEFAULT 1000, -- Minimum stars to withdraw
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- =============================================
-- SUBSCRIPTIONS - User Subscriptions
-- =============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price_paid BIGINT NOT NULL, -- Stars paid
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
    'active', 'expired', 'cancelled', 'paused'
  )),
  auto_renew BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  renewed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subscriber_id, creator_id)
);

-- =============================================
-- PAID CONTENT - Unlockable Content
-- =============================================
CREATE TABLE IF NOT EXISTS paid_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'photo', 'photo_set', 'story', 'video', 'message', 'voice'
  )),
  title VARCHAR(100),
  description TEXT,
  price BIGINT NOT NULL, -- Price in Stars
  preview_url TEXT, -- Blurred/partial preview
  content_urls TEXT[], -- Actual content (for buyers)
  is_free_for_subscribers BOOLEAN DEFAULT false,
  view_count INT DEFAULT 0,
  purchase_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- For stories
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- CONTENT PURCHASES - Who bought what
-- =============================================
CREATE TABLE IF NOT EXISTS content_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES paid_content(id) ON DELETE CASCADE,
  price_paid BIGINT NOT NULL,
  transaction_id UUID REFERENCES transactions(id),
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(buyer_id, content_id)
);

-- =============================================
-- TIPS - Direct Tips to Users
-- =============================================
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  message TEXT,
  transaction_id UUID REFERENCES transactions(id),
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- WITHDRAWAL REQUESTS
-- =============================================
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL, -- Stars amount
  fee BIGINT DEFAULT 0, -- Withdrawal fee
  net_amount BIGINT NOT NULL, -- After fee
  method VARCHAR(30) NOT NULL CHECK (method IN (
    'telegram_stars', 'card', 'crypto'
  )),
  payout_details JSONB NOT NULL, -- Where to send
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'rejected', 'cancelled'
  )),
  processed_at TIMESTAMPTZ,
  processed_by UUID, -- Admin who processed
  rejection_reason TEXT,
  transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- GIFTS - Virtual Gifts
-- =============================================
CREATE TABLE IF NOT EXISTS gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  description TEXT,
  price BIGINT NOT NULL, -- Price in Stars
  animation_url TEXT, -- Gift animation
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- Insert default gifts
INSERT INTO gifts (name, emoji, description, price, sort_order) VALUES
  ('Rose', '🌹', 'Klassik atirgul', 10, 1),
  ('Heart', '❤️', 'Sevgi belgisi', 20, 2),
  ('Star', '⭐', 'Yulduz', 50, 3),
  ('Diamond', '💎', 'Qimmatbaho tosh', 100, 4),
  ('Crown', '👑', 'Qirollik toji', 200, 5),
  ('Rocket', '🚀', 'Kosmik sovg''a', 500, 6),
  ('Unicorn', '🦄', 'Sehrli yedinog', 1000, 7)
ON CONFLICT DO NOTHING;

-- =============================================
-- SENT GIFTS - Gift History
-- =============================================
CREATE TABLE IF NOT EXISTS sent_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gift_id UUID NOT NULL REFERENCES gifts(id),
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_paid_content_creator ON paid_content(creator_id);
CREATE INDEX IF NOT EXISTS idx_content_purchases_buyer ON content_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    -- Update spender's wallet
    IF NEW.type IN ('tip', 'subscription', 'content_unlock', 'story_view', 'message_payment', 'gift') THEN
      UPDATE wallets 
      SET stars_balance = stars_balance - NEW.amount,
          total_spent = total_spent + NEW.amount,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
    
    -- Update earner's wallet
    IF NEW.type = 'earning' THEN
      UPDATE wallets 
      SET stars_balance = stars_balance + NEW.net_amount,
          total_earned = total_earned + NEW.net_amount,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
    
    -- Update on purchase
    IF NEW.type = 'purchase' THEN
      UPDATE wallets 
      SET stars_balance = stars_balance + NEW.amount,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
    
    -- Update on withdrawal
    IF NEW.type = 'withdrawal' THEN
      UPDATE wallets 
      SET stars_balance = stars_balance - NEW.amount,
          total_withdrawn = total_withdrawn + NEW.amount,
          pending_withdrawal = pending_withdrawal - NEW.amount,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for wallet updates
DROP TRIGGER IF EXISTS trigger_update_wallet ON transactions;
CREATE TRIGGER trigger_update_wallet
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance();

-- Function to create wallet for new users
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create wallet on user creation
DROP TRIGGER IF EXISTS trigger_create_wallet ON users;
CREATE TRIGGER trigger_create_wallet
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_wallet();

-- =============================================
-- PLATFORM SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO platform_settings (key, value, description) VALUES
  ('commission_rate', '{"percent": 10}', 'Platform commission percentage'),
  ('min_withdrawal', '{"stars": 1000}', 'Minimum stars for withdrawal'),
  ('withdrawal_fee', '{"percent": 2, "min_stars": 50}', 'Withdrawal fee'),
  ('stars_to_uzs', '{"rate": 1000}', 'Stars to UZS conversion rate'),
  ('stars_to_usd', '{"rate": 0.01}', 'Stars to USD conversion rate')
ON CONFLICT (key) DO NOTHING;
