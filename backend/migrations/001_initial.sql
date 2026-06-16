-- Sticky Notes Backend Database Schema

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stick_notes_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    position JSONB NOT NULL,
    size JSONB NOT NULL,
    color VARCHAR(20) NOT NULL,
    minimized BOOLEAN NOT NULL DEFAULT false,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stick_notes_records_user_id ON stick_notes_records(user_id);
CREATE INDEX IF NOT EXISTS idx_stick_notes_records_user_url ON stick_notes_records(user_id, url);
CREATE INDEX IF NOT EXISTS idx_stick_notes_records_updated_at ON stick_notes_records(updated_at DESC);
