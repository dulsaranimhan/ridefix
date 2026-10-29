CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    driver_id UUID NOT NULL,
    vehicle_id UUID,

    service_type VARCHAR(50) NOT NULL,
    problem_description TEXT NOT NULL,

    location_latitude DOUBLE PRECISION NOT NULL,
    location_longitude DOUBLE PRECISION NOT NULL,
    location_address TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'Created',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT requests_service_type_check
        CHECK (
            service_type IN (
                'Roadside Assistance',
                'Book a Garage',
                'Towing Service',
                'Battery Service'
            )
        ),

    CONSTRAINT requests_status_check
        CHECK (
            status IN (
                'Created',
                'Matching',
                'Open for bids',
                'Awaiting payment',
                'Booked',
                'On the way',
                'In progress',
                'Completed',
                'Cancelled',
                'Expired',
                'Disputed'
            )
        ),

    CONSTRAINT requests_latitude_check
        CHECK (location_latitude BETWEEN -90 AND 90),

    CONSTRAINT requests_longitude_check
        CHECK (location_longitude BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS idx_requests_driver_created
    ON requests (driver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_status
    ON requests (status);