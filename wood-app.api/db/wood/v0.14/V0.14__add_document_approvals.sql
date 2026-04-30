CREATE TABLE document_approvals (
    id                    SERIAL PRIMARY KEY,
    document_id           INTEGER NOT NULL REFERENCES documents(id),
    submitted_by_user_id  INTEGER NOT NULL REFERENCES app_users(id),
    decided_by_user_id    INTEGER REFERENCES app_users(id),
    decision              INTEGER NOT NULL DEFAULT 1, -- 1=Pending, 2=Approved, 3=Rejected
    rejection_reason      TEXT,
    submitted_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    decided_at            TIMESTAMP
);

CREATE INDEX idx_document_approvals_document_id ON document_approvals(document_id);
CREATE INDEX idx_document_approvals_decision    ON document_approvals(decision);
