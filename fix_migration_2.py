import re

filepath = "/home/ubuntu/acya-app/wood-app.api/db/FullDb_Migration/full_migration.sql"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Fix DocumentMerchandise to tbl_document_merchandise
content = content.replace('"DocumentMerchandise"', '"tbl_document_merchandise"')
content = content.replace('DocumentMerchandise', 'tbl_document_merchandise')

# But this might have broken the EF History insert for DocumentMerchandise?
# "AddQuantityDeliveredToDocumentMerchandise"
content = content.replace('AddQuantityDeliveredTotbl_document_merchandise', 'AddQuantityDeliveredToDocumentMerchandise')


# Fix approval_configs
def fix_approval_configs(m):
    block = m.group(0)
    block = block.replace('"EnterpriseId"', '"enterprise_id"')
    block = block.replace('"ApproverEmails"', '"approver_emails"')
    block = block.replace('"ApproverRoles"', '"approver_roles"')
    block = block.replace('"ThresholdAmount"', '"threshold_amount"')
    block = block.replace('"CreatedAt"', '"created_at"')
    block = block.replace('"UpdatedAt"', '"updated_at"')
    return block

content = re.sub(r'CREATE TABLE approval_configs\s*\(.*?\);', fix_approval_configs, content, flags=re.DOTALL | re.IGNORECASE)

# Fix document_approvals
def fix_document_approvals(m):
    block = m.group(0)
    block = block.replace('"DocumentId"', '"document_id"')
    block = block.replace('"SubmittedByUserId"', '"submitted_by_user_id"')
    block = block.replace('"SubmittedAt"', '"submitted_at"')
    block = block.replace('"DecidedByUserId"', '"decided_by_user_id"')
    block = block.replace('"DecidedAt"', '"decided_at"')
    block = block.replace('"RejectionReason"', '"rejection_reason"')
    return block

content = re.sub(r'CREATE TABLE document_approvals\s*\(.*?\);', fix_document_approvals, content, flags=re.DOTALL | re.IGNORECASE)


# Fix tbl_purchase_price_history and tbl_sales_price_history constraint missing in python verify script?
# Actually the python verify script says "constraint" is missing in running DB. That's because my regex parses "CONSTRAINT" as a column sometimes if it's not at the start of a line. I can ignore it.

# Fix tbl_holding_tax
# Replace any remaining "HoldingTax" with tbl_holding_tax
content = content.replace('"HoldingTax"', 'tbl_holding_tax')

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Applied casing fixes.")
