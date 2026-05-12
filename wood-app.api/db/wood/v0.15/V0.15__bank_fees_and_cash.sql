-- Phase 1: Gestion des Versements en Banque & Caisses

-- 1. Mise à jour de la table Banks pour les coûts d'opérations et solde initial
ALTER TABLE "tbl_bank"
  ADD COLUMN IF NOT EXISTS "ChequeDepositFeeHT"  NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "TraiteDepositFeeHT"   NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "WireTransferFeeHT"    NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "MiscFeeHT"            NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "InitialBalance"        NUMERIC(14,3) DEFAULT 0;

-- 2. Table BankDeposits (versements effectués en banque)
CREATE TABLE IF NOT EXISTS "tbl_bank_deposits" (
  "id"               SERIAL PRIMARY KEY,
  "BankId"           INT NOT NULL REFERENCES "tbl_bank"("id"),
  "DepositDate"      TIMESTAMP NOT NULL DEFAULT NOW(),
  "DepositType"      VARCHAR(20) NOT NULL,  -- ESPECE | CHEQUE | TRAITE | VIREMENT
  "AmountHT"         NUMERIC(14,3) NOT NULL,
  "FeeHT"            NUMERIC(10,3) NOT NULL DEFAULT 0,
  "TaxRate"          NUMERIC(5,3)  NOT NULL DEFAULT 0, -- Lu depuis AppVariable (TVA)
  "FeeWithTax"       NUMERIC(10,3) NOT NULL DEFAULT 0, -- FeeHT * (1 + TaxRate/100)
  "NetAmount"        NUMERIC(14,3) NOT NULL,           -- AmountHT - FeeWithTax (Montant réellement crédité)
  "Reference"        VARCHAR(100),
  "Notes"            VARCHAR(500),
  "PaymentInstrumentId" INT REFERENCES "tbl_payment_instrument"("id"), -- Lien vers chèque/traite si applicable
  "SalesSiteId"      INT REFERENCES "tbl_sales_sites"("id"), -- Caisse source (pour versement espèces)
  "CreatedByUserId"  INT REFERENCES "tbl_app_user"("id"),
  "CreatedAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
  "IsDeleted"        BOOLEAN NOT NULL DEFAULT FALSE
);

-- 3. Table CaisseMovements (flux de trésorerie par point de vente)
CREATE TABLE IF NOT EXISTS "tbl_caisse_movements" (
  "id"               SERIAL PRIMARY KEY,
  "SalesSiteId"      INT NOT NULL REFERENCES "tbl_sales_sites"("id"),
  "MovementDate"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "Type"             VARCHAR(20) NOT NULL,   -- ENTREE | SORTIE
  "Reason"           VARCHAR(50) NOT NULL,   -- ENCAISSEMENT | VERSEMENT_BANQUE | DEPENSE | INIT | RECTIFICATION
  "Amount"           NUMERIC(14,3) NOT NULL,
  "Reference"        VARCHAR(100),
  "Notes"            VARCHAR(500),
  "BankDepositId"    INT REFERENCES "tbl_bank_deposits"("id"), -- Si sortie liée à un versement
  "PaymentId"        INT REFERENCES "tbl_payments"("id"), -- Lien vers le paiement (Vente)
  "CreatedByUserId"  INT REFERENCES "tbl_app_user"("id"),
  "CreatedAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
  "IsDeleted"        BOOLEAN NOT NULL DEFAULT FALSE
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS "idx_bankdeposits_bankid" ON "tbl_bank_deposits"("BankId");
CREATE INDEX IF NOT EXISTS "idx_caissemovements_sitid" ON "tbl_caisse_movements"("SalesSiteId");
