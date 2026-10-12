-- Migration: v0.38 / 01_preserve_socofeb_arabic_print_identity.sql
-- Description: Preserves SOCOFEB's existing Arabic printing identity in tenant_socofeb.tbl_appvariable.
-- Ensures that existing SOCOFEB configuration remains completely intact after moving to generic empty defaults for new tenants.
-- Fully idempotent and multi-tenant safe: strictly targets tenant_socofeb without modifying any other tenant schemas.

DO $$
BEGIN
    -- Verify if tenant_socofeb schema exists
    IF EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'tenant_socofeb'
    ) THEN
        -- Verify if tbl_appvariable exists in tenant_socofeb
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'tenant_socofeb' AND table_name = 'tbl_appvariable'
        ) THEN
            -- Only insert if tenant_socofeb does not already have an Impression configuration
            IF NOT EXISTS (
                SELECT 1 FROM tenant_socofeb.tbl_appvariable 
                WHERE nature = 'Impression' AND isdeleted = false
            ) THEN
                INSERT INTO tenant_socofeb.tbl_appvariable (
                    nature, 
                    name, 
                    valuetext, 
                    isactive, 
                    isdefault, 
                    iseditable, 
                    isdeleted
                )
                VALUES (
                    'Impression',
                    'print-locale',
                    '{
  "originalLabel": {
    "bl": "ORIGINAL CLIENT",
    "invoice": "FACTURE ORIGINAL"
  },
  "originalLabelTransfer": "TRANSFERT STOCK",
  "companyArabicName": "الشركة التجارية للحديد و الخشب",
  "companyArabicCapital": "شركة خفية الإسم رأس مالها 20.000 د.ت",
  "companyArabicAddress": "مقرها الاجتماعي: طريق رواد كلم 4 اريانة",
  "stampImageBase64": "",
  "labels": {
    "client": "Client :",
    "address": "Adresse :",
    "tvaCode": "Code TVA :",
    "date": "DATE",
    "docNumberBL": "N° BL",
    "docNumberInvoice": "N° BL/FAC",
    "accountNumber": "N° COMPTE",
    "designations": "DESIGNATIONS",
    "unit": "UN",
    "qty": "QTE",
    "unitPriceHT": "P.U.H.T",
    "tva": "TVA",
    "discount": "RM",
    "amountHT": "MONTANT HT",
    "taxe": "Taxe",
    "base": "Base",
    "percent": "%",
    "value": "Valeur",
    "arreteLaSomme": "ARRETE LA PRESENTE A LA SOMME DE :",
    "totalHT": "TOTAL H.T.V.A",
    "totalTVA": "TOTAL TVA",
    "totalTTC": "TOTAL TTC",
    "stampTax": "TIMBRE FISCAL",
    "withholdingTax": "RETENUE SOURCE",
    "netPayable": "NET A PAYER",
    "signClient": "SIGN. CLIENT",
    "truckNumber": "N° CAMION",
    "driverName": "NOM CHAUFFEUR",
    "cin": "C.I.N :",
    "controlBL": "CONTROL BL",
    "controlExit": "CONTROL SORTIE"
  }
}',
                    true,
                    false,
                    true,
                    false
                );
            END IF;
        END IF;
    END IF;
END $$;
