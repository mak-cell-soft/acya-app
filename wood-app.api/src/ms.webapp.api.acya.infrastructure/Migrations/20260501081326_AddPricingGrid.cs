using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPricingGrid : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tbl_pricing_grid",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CounterPartId = table.Column<int>(type: "integer", nullable: false),
                    MerchandiseId = table.Column<int>(type: "integer", nullable: true),
                    DiscountRate = table.Column<double>(type: "double precision", nullable: false),
                    ValidFrom = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ValidUntil = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreationDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    UpdateDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    UpdatedById = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_pricing_grid", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tbl_pricing_grid_tbl_app_user_UpdatedById",
                        column: x => x.UpdatedById,
                        principalTable: "tbl_app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbl_pricing_grid_tbl_counter_part_CounterPartId",
                        column: x => x.CounterPartId,
                        principalTable: "tbl_counter_part",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tbl_pricing_grid_tbl_merchandise_MerchandiseId",
                        column: x => x.MerchandiseId,
                        principalTable: "tbl_merchandise",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tbl_pricing_grid_CounterPartId_MerchandiseId_IsActive",
                table: "tbl_pricing_grid",
                columns: new[] { "CounterPartId", "MerchandiseId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_tbl_pricing_grid_MerchandiseId",
                table: "tbl_pricing_grid",
                column: "MerchandiseId");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_pricing_grid_UpdatedById",
                table: "tbl_pricing_grid",
                column: "UpdatedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbl_pricing_grid");
        }
    }
}
