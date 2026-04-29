using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixSupplierLedgerValues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Data Fix: Fix supplierReceipt (should be Credit, not Debit)
            migrationBuilder.Sql(@"
                UPDATE tbl_account_ledger
                SET credit = debit, debit = 0
                WHERE type = 'supplierReceipt' 
                  AND (debit > 0 OR debit < 0)
                  AND credit = 0;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Reverse data fix (swap back)
            migrationBuilder.Sql(@"
                UPDATE tbl_account_ledger
                SET debit = credit, credit = 0
                WHERE type = 'supplierReceipt' 
                  AND (credit > 0 OR credit < 0)
                  AND debit = 0;
            ");
        }
    }
}
