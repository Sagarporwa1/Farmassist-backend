-- ============================================
-- Kisan App - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Mandi Prices Table (stores data from data.gov.in)
CREATE TABLE IF NOT EXISTS mandi_prices (
    id BIGSERIAL PRIMARY KEY,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    market TEXT NOT NULL,
    commodity TEXT NOT NULL,
    variety TEXT,
    grade TEXT,
    min_price NUMERIC(12, 2) DEFAULT 0,
    max_price NUMERIC(12, 2) DEFAULT 0,
    modal_price NUMERIC(12, 2) DEFAULT 0,
    arrival_date TEXT NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint to prevent duplicate records
    UNIQUE(commodity, market, arrival_date)
);

-- Indexes for fast filtering & search
CREATE INDEX IF NOT EXISTS idx_mandi_commodity ON mandi_prices (commodity);
CREATE INDEX IF NOT EXISTS idx_mandi_state ON mandi_prices (state);
CREATE INDEX IF NOT EXISTS idx_mandi_market ON mandi_prices (market);
CREATE INDEX IF NOT EXISTS idx_mandi_arrival_date ON mandi_prices (arrival_date DESC);
CREATE INDEX IF NOT EXISTS idx_mandi_commodity_market ON mandi_prices (commodity, market);


-- 2. User Stocks Table (user's crop inventory)
CREATE TABLE IF NOT EXISTS user_stocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL DEFAULT 'quintal',
    purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price > 0),
    purchase_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_stocks_user_id ON user_stocks (user_id);


-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Mandi prices: publicly readable and insertable since we are operating without a service_role key
ALTER TABLE mandi_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read mandi prices"
    ON mandi_prices
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert/update mandi prices"
    ON mandi_prices
    FOR ALL
    USING (true)
    WITH CHECK (true);


-- User stocks: only the owner can access their stocks
ALTER TABLE user_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stocks"
    ON user_stocks
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stocks"
    ON user_stocks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stocks"
    ON user_stocks
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stocks"
    ON user_stocks
    FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Residue Pickups Table (Waste management feature)
CREATE TABLE IF NOT EXISTS residue_pickups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    crop_detail TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    pickup_date TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_pickups_user_id ON residue_pickups (user_id);

ALTER TABLE residue_pickups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pickups"
    ON residue_pickups
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pickups"
    ON residue_pickups
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pickups"
    ON residue_pickups
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pickups"
    ON residue_pickups
    FOR DELETE
    USING (auth.uid() = user_id);
