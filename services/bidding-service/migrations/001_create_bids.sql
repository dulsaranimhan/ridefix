
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    request_id UUID NOT NULL,
    provider_id UUID NOT NULL,

    price NUMERIC(10, 2) NOT NULL
        CHECK (price > 0),

    estimated_time_minutes INTEGER NOT NULL
        CHECK (estimated_time_minutes > 0),

    status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Expired')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_provider_bid_per_request
        UNIQUE (request_id, provider_id)
);

CREATE INDEX idx_bids_request_id ON bids(request_id);
CREATE INDEX idx_bids_provider_id ON bids(provider_id);
