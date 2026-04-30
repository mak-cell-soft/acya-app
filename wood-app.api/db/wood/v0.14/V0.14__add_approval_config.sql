CREATE TABLE approval_configs (
    id                SERIAL PRIMARY KEY,
    enterprise_id     INTEGER NOT NULL REFERENCES enterprises(id),
    threshold_amount  NUMERIC(18,3),
    approver_emails   TEXT,
    approver_roles    TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(enterprise_id)
);
