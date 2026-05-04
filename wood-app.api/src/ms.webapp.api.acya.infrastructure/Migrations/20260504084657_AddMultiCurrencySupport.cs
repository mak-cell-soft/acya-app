using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiCurrencySupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "tbl_payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ExchangeRate",
                table: "tbl_payments",
                type: "numeric",
                nullable: false,
                defaultValue: 1m);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "tbl_document",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "ExchangeRate",
                table: "tbl_document",
                type: "double precision",
                nullable: false,
                defaultValue: 1.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Currency",
                table: "tbl_payments");

            migrationBuilder.DropColumn(
                name: "ExchangeRate",
                table: "tbl_payments");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "tbl_document");

            migrationBuilder.DropColumn(
                name: "ExchangeRate",
                table: "tbl_document");
        }
    }
}
