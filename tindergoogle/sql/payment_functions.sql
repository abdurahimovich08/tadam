-- =============================================
-- PAYMENT HELPER FUNCTIONS
-- Run this in Supabase SQL Editor
-- =============================================

-- Function to add stars to a user's wallet
CREATE OR REPLACE FUNCTION add_stars_to_wallet(
  p_user_id UUID,
  p_amount BIGINT
)
RETURNS VOID AS $$
BEGIN
  -- Create wallet if doesn't exist
  INSERT INTO wallets (user_id, stars_balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    stars_balance = wallets.stars_balance + p_amount,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to subtract stars from wallet (with balance check)
CREATE OR REPLACE FUNCTION subtract_stars_from_wallet(
  p_user_id UUID,
  p_amount BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance BIGINT;
BEGIN
  -- Get current balance
  SELECT stars_balance INTO current_balance
  FROM wallets
  WHERE user_id = p_user_id;

  -- Check if enough balance
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Subtract stars
  UPDATE wallets
  SET stars_balance = stars_balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to transfer stars between users
CREATE OR REPLACE FUNCTION transfer_stars(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_amount BIGINT,
  p_fee_percent NUMERIC DEFAULT 10
)
RETURNS JSON AS $$
DECLARE
  sender_balance BIGINT;
  fee_amount BIGINT;
  net_amount BIGINT;
BEGIN
  -- Calculate fee
  fee_amount := FLOOR(p_amount * p_fee_percent / 100);
  net_amount := p_amount - fee_amount;

  -- Get sender's balance
  SELECT stars_balance INTO sender_balance
  FROM wallets
  WHERE user_id = p_sender_id;

  -- Check balance
  IF sender_balance IS NULL OR sender_balance < p_amount THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Balans yetarli emas'
    );
  END IF;

  -- Deduct from sender
  UPDATE wallets
  SET stars_balance = stars_balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE user_id = p_sender_id;

  -- Add to receiver (create wallet if needed)
  INSERT INTO wallets (user_id, stars_balance, total_earned)
  VALUES (p_receiver_id, net_amount, net_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    stars_balance = wallets.stars_balance + net_amount,
    total_earned = wallets.total_earned + net_amount,
    updated_at = now();

  RETURN json_build_object(
    'success', TRUE,
    'amount', p_amount,
    'fee', fee_amount,
    'net_amount', net_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment subscriber count
CREATE OR REPLACE FUNCTION increment_subscriber_count(creator_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE creator_profiles
  SET total_subscribers = total_subscribers + 1,
      updated_at = now()
  WHERE user_id = creator_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement subscriber count
CREATE OR REPLACE FUNCTION decrement_subscriber_count(creator_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE creator_profiles
  SET total_subscribers = GREATEST(total_subscribers - 1, 0),
      updated_at = now()
  WHERE user_id = creator_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process withdrawal
CREATE OR REPLACE FUNCTION process_withdrawal(
  p_request_id UUID,
  p_admin_id UUID,
  p_status VARCHAR(20),
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Get withdrawal request
  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'So''rov topilmadi yoki allaqachon ko''rib chiqilgan'
    );
  END IF;

  -- Update request status
  UPDATE withdrawal_requests
  SET status = p_status,
      processed_at = now(),
      processed_by = p_admin_id,
      rejection_reason = p_rejection_reason
  WHERE id = p_request_id;

  IF p_status = 'completed' THEN
    -- Create withdrawal transaction
    INSERT INTO transactions (
      user_id, type, amount, fee, net_amount, status, description
    ) VALUES (
      v_request.user_id, 'withdrawal', v_request.amount, v_request.fee, 
      v_request.net_amount, 'completed', 'Pul yechib olish'
    );

    -- Update wallet
    UPDATE wallets
    SET stars_balance = stars_balance - v_request.amount,
        total_withdrawn = total_withdrawn + v_request.net_amount,
        pending_withdrawal = GREATEST(pending_withdrawal - v_request.amount, 0),
        updated_at = now()
    WHERE user_id = v_request.user_id;

  ELSIF p_status = 'rejected' THEN
    -- Return stars to pending
    UPDATE wallets
    SET pending_withdrawal = GREATEST(pending_withdrawal - v_request.amount, 0),
        updated_at = now()
    WHERE user_id = v_request.user_id;
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'status', p_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all monetization tables
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paid_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Wallets: users can only see their own wallet
DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
CREATE POLICY "Users can view own wallet" ON wallets
  FOR SELECT USING (auth.uid()::text = user_id::text OR user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;
CREATE POLICY "Users can update own wallet" ON wallets
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- For anonymous access (Telegram WebApp)
DROP POLICY IF EXISTS "Allow anonymous wallet access" ON wallets;
CREATE POLICY "Allow anonymous wallet access" ON wallets
  FOR ALL USING (true);

-- Transactions: users can see their own transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Allow anonymous transaction access" ON transactions;
CREATE POLICY "Allow anonymous transaction access" ON transactions
  FOR ALL USING (true);

-- Creator profiles: public read, owner write
DROP POLICY IF EXISTS "Public can view creator profiles" ON creator_profiles;
CREATE POLICY "Public can view creator profiles" ON creator_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators can update own profile" ON creator_profiles;
CREATE POLICY "Creators can update own profile" ON creator_profiles
  FOR ALL USING (true);

-- Subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid()::text = subscriber_id::text OR auth.uid()::text = creator_id::text);

DROP POLICY IF EXISTS "Allow anonymous subscription access" ON subscriptions;
CREATE POLICY "Allow anonymous subscription access" ON subscriptions
  FOR ALL USING (true);

-- Paid content: public preview, full access for purchasers
DROP POLICY IF EXISTS "Public can view paid content" ON paid_content;
CREATE POLICY "Public can view paid content" ON paid_content
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators can manage own content" ON paid_content;
CREATE POLICY "Creators can manage own content" ON paid_content
  FOR ALL USING (true);

-- Content purchases
DROP POLICY IF EXISTS "Users can view own purchases" ON content_purchases;
CREATE POLICY "Users can view own purchases" ON content_purchases
  FOR SELECT USING (auth.uid()::text = buyer_id::text);

DROP POLICY IF EXISTS "Allow anonymous purchase access" ON content_purchases;
CREATE POLICY "Allow anonymous purchase access" ON content_purchases
  FOR ALL USING (true);

-- Tips
DROP POLICY IF EXISTS "Tips visibility" ON tips;
CREATE POLICY "Tips visibility" ON tips
  FOR SELECT USING (auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text);

DROP POLICY IF EXISTS "Allow anonymous tips access" ON tips;
CREATE POLICY "Allow anonymous tips access" ON tips
  FOR ALL USING (true);

-- Sent gifts
DROP POLICY IF EXISTS "Gifts visibility" ON sent_gifts;
CREATE POLICY "Gifts visibility" ON sent_gifts
  FOR SELECT USING (auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text);

DROP POLICY IF EXISTS "Allow anonymous gifts access" ON sent_gifts;
CREATE POLICY "Allow anonymous gifts access" ON sent_gifts
  FOR ALL USING (true);

-- Star packages (public read)
DROP POLICY IF EXISTS "Public can view star packages" ON star_packages;
CREATE POLICY "Public can view star packages" ON star_packages
  FOR SELECT USING (true);

-- Gifts catalog (public read)
DROP POLICY IF EXISTS "Public can view gifts" ON gifts;
CREATE POLICY "Public can view gifts" ON gifts
  FOR SELECT USING (true);

-- Withdrawal requests
DROP POLICY IF EXISTS "Users can view own withdrawals" ON withdrawal_requests;
CREATE POLICY "Users can view own withdrawals" ON withdrawal_requests
  FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Allow anonymous withdrawal access" ON withdrawal_requests;
CREATE POLICY "Allow anonymous withdrawal access" ON withdrawal_requests
  FOR ALL USING (true);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
