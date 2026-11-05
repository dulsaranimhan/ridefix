ALTER TABLE requests
    ADD COLUMN IF NOT EXISTS provider_id UUID,
    ADD COLUMN IF NOT EXISTS vehicle_description VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_requests_provider_status_created
    ON requests (provider_id, status, created_at DESC);
