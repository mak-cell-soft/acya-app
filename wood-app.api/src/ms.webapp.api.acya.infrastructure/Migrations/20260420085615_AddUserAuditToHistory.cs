using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserAuditToHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "idupdatedby",
                table: "tbl_sales_price_history",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "idupdatedby",
                table: "tbl_purchase_price_history",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_tbl_sell_history_idappuser",
                table: "tbl_sell_history",
                column: "idappuser");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_sales_price_history_idupdatedby",
                table: "tbl_sales_price_history",
                column: "idupdatedby");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_purchase_price_history_idupdatedby",
                table: "tbl_purchase_price_history",
                column: "idupdatedby");

            migrationBuilder.AddForeignKey(
                name: "FK_tbl_purchase_price_history_tbl_app_user_idupdatedby",
                table: "tbl_purchase_price_history",
                column: "idupdatedby",
                principalTable: "tbl_app_user",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_tbl_sales_price_history_tbl_app_user_idupdatedby",
                table: "tbl_sales_price_history",
                column: "idupdatedby",
                principalTable: "tbl_app_user",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_tbl_sell_history_tbl_app_user_idappuser",
                table: "tbl_sell_history",
                column: "idappuser",
                principalTable: "tbl_app_user",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tbl_purchase_price_history_tbl_app_user_idupdatedby",
                table: "tbl_purchase_price_history");

            migrationBuilder.DropForeignKey(
                name: "FK_tbl_sales_price_history_tbl_app_user_idupdatedby",
                table: "tbl_sales_price_history");

            migrationBuilder.DropForeignKey(
                name: "FK_tbl_sell_history_tbl_app_user_idappuser",
                table: "tbl_sell_history");

            migrationBuilder.DropIndex(
                name: "IX_tbl_sell_history_idappuser",
                table: "tbl_sell_history");

            migrationBuilder.DropIndex(
                name: "IX_tbl_sales_price_history_idupdatedby",
                table: "tbl_sales_price_history");

            migrationBuilder.DropIndex(
                name: "IX_tbl_purchase_price_history_idupdatedby",
                table: "tbl_purchase_price_history");

            migrationBuilder.DropColumn(
                name: "idupdatedby",
                table: "tbl_sales_price_history");

            migrationBuilder.DropColumn(
                name: "idupdatedby",
                table: "tbl_purchase_price_history");
        }
    }
}
