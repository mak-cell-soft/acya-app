using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using ms.webapp.api.acya.infrastructure;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    [DbContext(typeof(WoodAppContext))]
    [Migration("20261109110000_AddDeliveryTrackingTable")]
    public partial class AddDeliveryTrackingTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tbl_delivery_tracking",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    document_id = table.Column<int>(type: "integer", nullable: false),
                    vehicle_id = table.Column<int>(type: "integer", nullable: false),
                    transporter_id = table.Column<int>(type: "integer", nullable: true),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    customer_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    driver_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    departure_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    return_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    delivery_address = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    notes = table.Column<string>(type: "text", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_by_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_delivery_tracking", x => x.id);
                    table.ForeignKey(
                        name: "fk_tbl_delivery_tracking_tbl_document",
                        column: x => x.document_id,
                        principalTable: "tbl_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_tbl_delivery_tracking_tbl_vehicle",
                        column: x => x.vehicle_id,
                        principalTable: "tbl_vehicle",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_tbl_delivery_tracking_tbl_transporter",
                        column: x => x.transporter_id,
                        principalTable: "tbl_transporter",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_tbl_delivery_tracking_tbl_counter_part",
                        column: x => x.customer_id,
                        principalTable: "tbl_counter_part",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_tbl_delivery_tracking_tbl_app_user",
                        column: x => x.updated_by_id,
                        principalTable: "tbl_app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "idx_tbl_delivery_tracking_doc_active",
                table: "tbl_delivery_tracking",
                column: "document_id",
                unique: true,
                filter: "is_deleted = false");

            migrationBuilder.CreateIndex(
                name: "idx_tbl_delivery_tracking_vehicle_date",
                table: "tbl_delivery_tracking",
                columns: new[] { "vehicle_id", "departure_date" });

            migrationBuilder.CreateIndex(
                name: "idx_tbl_delivery_tracking_customer_date",
                table: "tbl_delivery_tracking",
                columns: new[] { "customer_id", "departure_date" });

            migrationBuilder.CreateIndex(
                name: "idx_tbl_delivery_tracking_status",
                table: "tbl_delivery_tracking",
                column: "status",
                filter: "is_deleted = false");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbl_delivery_tracking");
        }
    }
}

