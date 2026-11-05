CREATE TABLE IF NOT EXISTS provider_availability (
    provider_id UUID PRIMARY KEY,
    is_available BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_availability_available
ON provider_availability(is_available);