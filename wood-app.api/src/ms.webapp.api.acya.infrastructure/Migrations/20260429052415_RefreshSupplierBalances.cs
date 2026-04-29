using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RefreshSupplierBalances : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE tbl_appvariable av
                SET value = sub.calculated_balance
                FROM (
                    SELECT cp.id, (COALESCE(cp.openingbalance, 0) + COALESCE(SUM(al.credit), 0) - COALESCE(SUM(al.debit), 0)) as calculated_balance
                    FROM tbl_counter_part cp
                    LEFT JOIN tbl_account_ledger al ON cp.id = al.counterpartid
                    WHERE cp.type IN (2, 3)
                    GROUP BY cp.id, cp.openingbalance
                ) sub
                WHERE av.nature = 'supplierBalance' 
                  AND (split_part(av.name, '|', 1))::int = sub.id;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
