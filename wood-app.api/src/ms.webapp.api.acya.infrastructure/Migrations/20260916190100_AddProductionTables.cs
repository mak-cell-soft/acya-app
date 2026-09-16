using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using ms.webapp.api.acya.infrastructure;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(WoodAppContext))]
    [Migration("20260916190100_AddProductionTables")]
    public partial class AddProductionTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "production_orders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Guid = table.Column<Guid>(type: "uuid", nullable: false),
                    Reference = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    SalesSiteId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<short>(type: "smallint", nullable: false),
                    PlannedStartDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    PlannedEndDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ActualStartDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ActualEndDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    TotalMaterialCost = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: true),
                    TotalLaborCost = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: true),
                    TotalOtherCost = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: true),
                    TotalProductionCost = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: true),
                    UnitProductionCost = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: true),
                    PlannedOutputQuantity = table.Column<double>(type: "double precision", nullable: false),
                    ActualOutputQuantity = table.Column<double>(type: "double precision", nullable: true),
                    CreatedById = table.Column<int>(type: "integer", nullable: false),
                    UpdatedById = table.Column<int>(type: "integer", nullable: true),
                    CreationDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdateDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_production_orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_production_orders_tbl_sales_sites_SalesSiteId",
                        column: x => x.SalesSiteId,
                        principalTable: "tbl_sales_sites",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "production_steps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Guid = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductionOrderId = table.Column<int>(type: "integer", nullable: false),
                    StepNumber = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<short>(type: "smallint", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    EndDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    LaborCost = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: true),
                    OtherCost = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: true),
                    OutputMerchandiseId = table.Column<int>(type: "integer", nullable: true),
                    PlannedOutputQuantity = table.Column<double>(type: "double precision", nullable: false),
                    ActualOutputQuantity = table.Column<double>(type: "double precision", nullable: true),
                    CreatedById = table.Column<int>(type: "integer", nullable: false),
                    UpdatedById = table.Column<int>(type: "integer", nullable: true),
                    CreationDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdateDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_production_steps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_production_steps_production_orders_ProductionOrderId",
                        column: x => x.ProductionOrderId,
                        principalTable: "production_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_production_steps_tbl_merchandise_OutputMerchandiseId",
                        column: x => x.OutputMerchandiseId,
                        principalTable: "tbl_merchandise",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "production_inputs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Guid = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductionStepId = table.Column<int>(type: "integer", nullable: false),
                    MerchandiseId = table.Column<int>(type: "integer", nullable: false),
                    MerchandiseRef = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MerchandiseDesignation = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Unit = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PlannedQuantity = table.Column<double>(type: "double precision", nullable: false),
                    ActualQuantity = table.Column<double>(type: "double precision", nullable: true),
                    UnitCost = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: true),
                    TotalCost = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: true),
                    CreatedById = table.Column<int>(type: "integer", nullable: false),
                    CreationDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_production_inputs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_production_inputs_production_steps_ProductionStepId",
                        column: x => x.ProductionStepId,
                        principalTable: "production_steps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_production_inputs_tbl_merchandise_MerchandiseId",
                        column: x => x.MerchandiseId,
                        principalTable: "tbl_merchandise",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            // Indexes on production_orders
            migrationBuilder.CreateIndex(
                name: "IX_production_orders_Guid",
                table: "production_orders",
                column: "Guid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_production_orders_Reference",
                table: "production_orders",
                column: "Reference");

            migrationBuilder.CreateIndex(
                name: "IX_production_orders_SalesSiteId",
                table: "production_orders",
                column: "SalesSiteId");

            migrationBuilder.CreateIndex(
                name: "IX_production_orders_Status_IsDeleted",
                table: "production_orders",
                columns: new[] { "Status", "IsDeleted" });

            // Indexes on production_steps
            migrationBuilder.CreateIndex(
                name: "IX_production_steps_Guid",
                table: "production_steps",
                column: "Guid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_production_steps_OutputMerchandiseId",
                table: "production_steps",
                column: "OutputMerchandiseId");

            migrationBuilder.CreateIndex(
                name: "IX_production_steps_ProductionOrderId_StepNumber",
                table: "production_steps",
                columns: new[] { "ProductionOrderId", "StepNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_production_steps_Status",
                table: "production_steps",
                column: "Status");

            // Indexes on production_inputs
            migrationBuilder.CreateIndex(
                name: "IX_production_inputs_Guid",
                table: "production_inputs",
                column: "Guid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_production_inputs_MerchandiseId",
                table: "production_inputs",
                column: "MerchandiseId");

            migrationBuilder.CreateIndex(
                name: "IX_production_inputs_ProductionStepId",
                table: "production_inputs",
                column: "ProductionStepId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "production_inputs");
            migrationBuilder.DropTable(name: "production_steps");
            migrationBuilder.DropTable(name: "production_orders");
        }
    }
}
