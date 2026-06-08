import re
import os

filepath = "/home/ubuntu/acya-app/wood-app.api/db/FullDb_Migration/full_migration.sql"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove duplicate APPENDED CUSTOM NON-EF MIGRATIONS block
marker = "-- ==========================================\n-- APPENDED CUSTOM NON-EF MIGRATIONS\n-- ==========================================\n"
parts = content.split(marker)
if len(parts) > 2:
    # Reconstruct with only the first appended block
    content = parts[0] + marker + parts[1]

# 2. Fix QuantityDelivered
drop_cmd = "DROP COLUMN IF EXISTS quantitydelivered;"
add_cmd = 'DROP COLUMN IF EXISTS quantitydelivered;\n                ALTER TABLE tbl_document_merchandise ADD COLUMN IF NOT EXISTS "QuantityDelivered" NUMERIC(18,4) NOT NULL DEFAULT 0.0;'
content = content.replace(drop_cmd, add_cmd)

# 3. Fix naming drift
# 3.1 HoldingTax -> tbl_holding_tax
content = content.replace('CREATE TABLE "HoldingTax"', 'CREATE TABLE tbl_holding_tax')
content = content.replace('ALTER TABLE "HoldingTax"', 'ALTER TABLE tbl_holding_tax')
content = content.replace('REFERENCES "HoldingTax"', 'REFERENCES tbl_holding_tax')

# 3.2 documentmerchandise -> tbl_document_merchandise
content = content.replace('CREATE TABLE documentmerchandise', 'CREATE TABLE tbl_document_merchandise')
content = content.replace('ALTER TABLE documentmerchandise', 'ALTER TABLE tbl_document_merchandise')
content = content.replace('REFERENCES documentmerchandise', 'REFERENCES tbl_document_merchandise')

# 3.3 approval_configs columns to snake_case
content = content.replace('"approveremails"', '"approver_emails"')
content = content.replace('"enterpriseid"', '"enterprise_id"')
content = content.replace('"createdat"', '"created_at"')
content = content.replace('"updatedat"', '"updated_at"')
content = content.replace('"approverroles"', '"approver_roles"')
content = content.replace('"thresholdamount"', '"threshold_amount"')

# 3.4 document_approvals columns to snake_case
content = content.replace('"documentid"', '"document_id"')
content = content.replace('"submittedat"', '"submitted_at"')
content = content.replace('"submittedbyuserid"', '"submitted_by_user_id"')
content = content.replace('"rejectionreason"', '"rejection_reason"')
content = content.replace('"decidedbyuserid"', '"decided_by_user_id"')
content = content.replace('"decidedat"', '"decided_at"')


with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

# 4. Append missing ALTER TABLE and tbl_pending_notification
missing_files = [
    "/home/ubuntu/acya-app/wood-app.api/db/wood/v0.13/V0.13__add_article_imageurl.sql",
    "/home/ubuntu/acya-app/wood-app.api/db/wood/v0.15/V0.15__bank_fees_and_cash.sql",
    "/home/ubuntu/acya-app/wood-app.api/db/wood/v0.16/V0.16__add_vehicle_fuel_card.sql",
    "/home/ubuntu/acya-app/wood-app.api/db/wood/v0.17/V0.17__add_vehicle_fuel_card_type.sql",
    "/home/ubuntu/acya-app/wood-app.api/db/wood/v0.18/V0.18__add_vehicle_fuel_card_number.sql"
]

with open(filepath, "a", encoding="utf-8") as f:
    for file in missing_files:
        if os.path.exists(file):
            with open(file, "r") as mf:
                f.write(f"\n-- From {os.path.basename(file)}\n")
                f.write(mf.read() + "\n")

    # Add tbl_pending_notification
    f.write("\n-- Inject tbl_pending_notification\n")
    f.write("""
CREATE TABLE IF NOT EXISTS tbl_pending_notification (
    id SERIAL PRIMARY KEY,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    targetgroup character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    createdat timestamp without time zone NOT NULL,
    processedat timestamp without time zone,
    errormessage text
);
CREATE INDEX IF NOT EXISTS ix_tbl_pending_notification_targetgroup_status ON tbl_pending_notification USING btree (targetgroup, status);
""")

print("Fixes applied successfully.")
