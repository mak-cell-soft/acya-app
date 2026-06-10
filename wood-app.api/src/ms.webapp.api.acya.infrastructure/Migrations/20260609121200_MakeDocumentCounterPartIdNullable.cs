using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    [Microsoft.EntityFrameworkCore.Infrastructure.DbContext(typeof(ms.webapp.api.acya.infrastructure.WoodAppContext))]
    [Microsoft.EntityFrameworkCore.Migrations.Migration("20260609121200_MakeDocumentCounterPartIdNullable")]
    public partial class MakeDocumentCounterPartIdNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop the existing FK constraint
            migrationBuilder.DropForeignKey(
                name: "FK_tbl_document_tbl_counter_part_counterpartid",
                table: "tbl_document");

            // Make the column nullable
            migrationBuilder.AlterColumn<int>(
                name: "counterpartid",
                table: "tbl_document",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: false);

            // Re-add the FK constraint, now allowing NULL
            migrationBuilder.AddForeignKey(
                name: "FK_tbl_document_tbl_counter_part_counterpartid",
                table: "tbl_document",
                column: "counterpartid",
                principalTable: "tbl_counter_part",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tbl_document_tbl_counter_part_counterpartid",
                table: "tbl_document");

            migrationBuilder.AlterColumn<int>(
                name: "counterpartid",
                table: "tbl_document",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_tbl_document_tbl_counter_part_counterpartid",
                table: "tbl_document",
                column: "counterpartid",
                principalTable: "tbl_counter_part",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
