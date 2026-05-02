using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTransportFees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "merchandiseid",
                table: "tbl_document_merchandise",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "tbl_document_merchandise",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "line_type",
                table: "tbl_document_merchandise",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "transporterid",
                table: "tbl_document_merchandise",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_tbl_document_merchandise_transporterid",
                table: "tbl_document_merchandise",
                column: "transporterid");

            migrationBuilder.AddForeignKey(
                name: "FK_tbl_document_merchandise_tbl_transporter_transporterid",
                table: "tbl_document_merchandise",
                column: "transporterid",
                principalTable: "tbl_transporter",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tbl_document_merchandise_tbl_transporter_transporterid",
                table: "tbl_document_merchandise");

            migrationBuilder.DropIndex(
                name: "IX_tbl_document_merchandise_transporterid",
                table: "tbl_document_merchandise");

            migrationBuilder.DropColumn(
                name: "description",
                table: "tbl_document_merchandise");

            migrationBuilder.DropColumn(
                name: "line_type",
                table: "tbl_document_merchandise");

            migrationBuilder.DropColumn(
                name: "transporterid",
                table: "tbl_document_merchandise");

            migrationBuilder.AlterColumn<int>(
                name: "merchandiseid",
                table: "tbl_document_merchandise",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
