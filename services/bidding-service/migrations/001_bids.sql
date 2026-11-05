CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References to data owned by other services. No foreign keys across service boundaries.
    request_id UUID NOT NULL,
    provider_id UUID NOT NULL,
    -- Snapshot shown to the driver until a service owns provider profiles.
    provider_name VARCHAR(120) NOT NULL,

    price_lkr INTEGER NOT NULL,
    eta_minutes INTEGER NOT NULL,
    distance_km DOUBLE PRECISION,
    note VARCHAR(500),

    status VARCHAR(20) NOT NULL DEFAULT 'Submitted',
    expires_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT bids_price_check CHECK (price_lkr > 0),
    CONSTRAINT bids_eta_check CHECK (eta_minutes > 0),
    CONSTRAINT bids_distance_check CHECK (distance_km IS NULL OR distance_km >= 0),
    CONSTRAINT bids_status_check
        CHECK (status IN ('Submitted', 'Accepted', 'Rejected', 'Expired', 'Withdrawn'))
);

-- A provider can have one open bid per request, and a request can have one accepted bid.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bids_open_per_provider
    ON bids (request_id, provider_id) WHERE status = 'Submitted';
CREATE UNIQUE INDEX IF NOT EXISTS uq_bids_accepted_per_request
    ON bids (request_id) WHERE status = 'Accepted';

CREATE INDEX IF NOT EXISTS idx_bids_request ON bids (request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_provider ON bids (provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_open_expiry ON bids (expires_at) WHERE status = 'Submitted';
