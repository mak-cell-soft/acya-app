-- Create the BankTransaction table.
-- Stores bank transactions for rapprochement bancaire.
CREATE TABLE IF NOT EXISTS "tbl_bank_transaction" (
    "Id"              SERIAL PRIMARY KEY,
    "BankId"          INTEGER NOT NULL,
    "TransactionDate" TIMESTAMP NOT NULL,
    "Description"     TEXT NULL,
    "Debit"           NUMERIC(18, 3) NOT NULL,
    "Credit"          NUMERIC(18, 3) NOT NULL,
    "Reference"       VARCHAR(100) NULL,
    "IsReconciled"    BOOLEAN NOT NULL DEFAULT FALSE,
    "CreationDate"    TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdateDate"      TIMESTAMP NOT NULL DEFAULT NOW(),
    "IsDeleted"       BOOLEAN NULL DEFAULT FALSE,
    "UpdatedBy"       INTEGER NULL,
    CONSTRAINT fk_bank_transaction_bank FOREIGN KEY ("BankId") REFERENCES "tbl_bank"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bank_transaction_bankid ON "tbl_bank_transaction" ("BankId");
