-- Sticky Notes Backend Database Schema
-- Run this migration on first deployment

-- Users table for API key authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sticky notes table (prefixed with app name for multi-app server)
CREATE TABLE IF NOT EXISTS stick_notes_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,  -- Encrypted HTML content (AES-256-GCM)
    position JSONB NOT NULL,  -- {"top": "100px", "left": "200px"}
    size JSONB NOT NULL,  -- {"width": "250px", "height": "200px"}
    color VARCHAR(20) NOT NULL,  -- "yellow" | "pink" | "blue" | "green" | "purple" | "white"
    minimized BOOLEAN NOT NULL DEFAULT false,
    url TEXT NOT NULL,  -- Encrypted URL (AES-256-GCM)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_stick_notes_records_user_id ON stick_notes_records(user_id);
CREATE INDEX IF NOT EXISTS idx_stick_notes_records_url ON stick_notes_records(url);
