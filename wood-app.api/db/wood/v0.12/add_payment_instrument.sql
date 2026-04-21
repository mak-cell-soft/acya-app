-- Table des instruments de paiement (traites, chèques à échéances)
CREATE TABLE IF NOT EXISTS tbl_payment_instrument (
    id              SERIAL PRIMARY KEY,
    paymentid       INTEGER NOT NULL REFERENCES tbl_payments(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL DEFAULT 'TRAITE',
    instrumentnumber VARCHAR(100),
    bank            VARCHAR(200),
    owner           VARCHAR(200),
    issuedate       TIMESTAMP,
    duedate         TIMESTAMP,        -- ★ Date d'échéance
    expirationdate  TIMESTAMP,
    banksettlementstatus VARCHAR(30) DEFAULT 'PENDING',
    paidatbankdate  TIMESTAMP,
    ispaidatbank    BOOLEAN NOT NULL DEFAULT FALSE,
    notes           TEXT,
    createdat       TIMESTAMP DEFAULT NOW(),
    createdby       VARCHAR(255),
    updatedat       TIMESTAMP,
    updatedbyid     INTEGER
);

-- Index sur la date d'échéance pour les requêtes de timeline
CREATE INDEX IF NOT EXISTS idx_payment_instrument_duedate ON tbl_payment_instrument(duedate);
CREATE INDEX IF NOT EXISTS idx_payment_instrument_paymentid ON tbl_payment_instrument(paymentid);
