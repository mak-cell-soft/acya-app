using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixHoldingTaxMappingFinal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_HoldingTax_tbl_app_user_AppUsersId",
                table: "HoldingTax");

            migrationBuilder.DropPrimaryKey(
                name: "PK_HoldingTax",
                table: "HoldingTax");

            migrationBuilder.RenameTable(
                name: "HoldingTax",
                newName: "tbl_holding_tax");

            migrationBuilder.RenameColumn(
                name: "isSigned",
                table: "tbl_holding_tax",
                newName: "issigned");

            migrationBuilder.RenameColumn(
                name: "UpdatedById",
                table: "tbl_holding_tax",
                newName: "updatedbyid");

            migrationBuilder.RenameColumn(
                name: "UpdateDate",
                table: "tbl_holding_tax",
                newName: "updatedate");

            migrationBuilder.RenameColumn(
                name: "TaxValue",
                table: "tbl_holding_tax",
                newName: "taxvalue");

            migrationBuilder.RenameColumn(
                name: "TaxPercentage",
                table: "tbl_holding_tax",
                newName: "taxpercentage");

            migrationBuilder.RenameColumn(
                name: "NewAmountDocValue",
                table: "tbl_holding_tax",
                newName: "newamountdocvalue");

            migrationBuilder.RenameColumn(
                name: "IsDeleted",
                table: "tbl_holding_tax",
                newName: "isdeleted");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "tbl_holding_tax",
                newName: "description");

            migrationBuilder.RenameColumn(
                name: "CreationDate",
                table: "tbl_holding_tax",
                newName: "creationdate");

            migrationBuilder.RenameColumn(
                name: "AppUsersId",
                table: "tbl_holding_tax",
                newName: "appusersid");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "tbl_holding_tax",
                newName: "id");

            migrationBuilder.RenameIndex(
                name: "IX_HoldingTax_AppUsersId",
                table: "tbl_holding_tax",
                newName: "IX_tbl_holding_tax_appusersid");

            migrationBuilder.AlterColumn<double>(
                name: "QuantityDelivered",
                table: "tbl_document_merchandise",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0,
                oldClrType: typeof(double),
                oldType: "double precision");

            migrationBuilder.AlterColumn<bool>(
                name: "isdeleted",
                table: "tbl_holding_tax",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AddColumn<string>(
                name: "reference",
                table: "tbl_holding_tax",
                type: "text",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_tbl_holding_tax",
                table: "tbl_holding_tax",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_tbl_holding_tax_tbl_app_user_appusersid",
                table: "tbl_holding_tax",
                column: "appusersid",
                principalTable: "tbl_app_user",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tbl_holding_tax_tbl_app_user_appusersid",
                table: "tbl_holding_tax");

            migrationBuilder.DropPrimaryKey(
                name: "PK_tbl_holding_tax",
                table: "tbl_holding_tax");

            migrationBuilder.DropColumn(
                name: "reference",
                table: "tbl_holding_tax");

            migrationBuilder.RenameTable(
                name: "tbl_holding_tax",
                newName: "HoldingTax");

            migrationBuilder.RenameColumn(
                name: "updatedbyid",
                table: "HoldingTax",
                newName: "UpdatedById");

            migrationBuilder.RenameColumn(
                name: "updatedate",
                table: "HoldingTax",
                newName: "UpdateDate");

            migrationBuilder.RenameColumn(
                name: "taxvalue",
                table: "HoldingTax",
                newName: "TaxValue");

            migrationBuilder.RenameColumn(
                name: "taxpercentage",
                table: "HoldingTax",
                newName: "TaxPercentage");

            migrationBuilder.RenameColumn(
                name: "newamountdocvalue",
                table: "HoldingTax",
                newName: "NewAmountDocValue");

            migrationBuilder.RenameColumn(
                name: "issigned",
                table: "HoldingTax",
                newName: "isSigned");

            migrationBuilder.RenameColumn(
                name: "isdeleted",
                table: "HoldingTax",
                newName: "IsDeleted");

            migrationBuilder.RenameColumn(
                name: "description",
                table: "HoldingTax",
                newName: "Description");

            migrationBuilder.RenameColumn(
                name: "creationdate",
                table: "HoldingTax",
                newName: "CreationDate");

            migrationBuilder.RenameColumn(
                name: "appusersid",
                table: "HoldingTax",
                newName: "AppUsersId");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "HoldingTax",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_tbl_holding_tax_appusersid",
                table: "HoldingTax",
                newName: "IX_HoldingTax_AppUsersId");

            migrationBuilder.AlterColumn<double>(
                name: "QuantityDelivered",
                table: "tbl_document_merchandise",
                type: "double precision",
                nullable: false,
                oldClrType: typeof(double),
                oldType: "double precision",
                oldDefaultValue: 0.0);

            migrationBuilder.AlterColumn<bool>(
                name: "IsDeleted",
                table: "HoldingTax",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AddPrimaryKey(
                name: "PK_HoldingTax",
                table: "HoldingTax",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_HoldingTax_tbl_app_user_AppUsersId",
                table: "HoldingTax",
                column: "AppUsersId",
                principalTable: "tbl_app_user",
                principalColumn: "id");
        }
    }
}
