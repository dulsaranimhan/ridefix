-- Whether a provider is accepting work. Provider IDs are Supabase user IDs, not a foreign key.
CREATE TABLE IF NOT EXISTS provider_availability (
    provider_id UUID PRIMARY KEY,
    is_available BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
