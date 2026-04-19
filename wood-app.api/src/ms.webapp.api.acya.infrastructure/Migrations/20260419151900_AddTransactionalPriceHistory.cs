using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionalPriceHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tbl_purchase_price_history",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    idarticle = table.Column<int>(type: "integer", nullable: false),
                    idcounterpart = table.Column<int>(type: "integer", nullable: false),
                    pricevalue = table.Column<double>(type: "double precision", nullable: false),
                    transactiondate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    iddocument = table.Column<int>(type: "integer", nullable: false),
                    docnumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_purchase_price_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_purchase_price_history_tbl_article_idarticle",
                        column: x => x.idarticle,
                        principalTable: "tbl_article",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbl_purchase_price_history_tbl_counter_part_idcounterpart",
                        column: x => x.idcounterpart,
                        principalTable: "tbl_counter_part",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbl_purchase_price_history_tbl_document_iddocument",
                        column: x => x.iddocument,
                        principalTable: "tbl_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tbl_sales_price_history",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    idarticle = table.Column<int>(type: "integer", nullable: false),
                    idcounterpart = table.Column<int>(type: "integer", nullable: false),
                    pricevalue = table.Column<double>(type: "double precision", nullable: false),
                    transactiondate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    iddocument = table.Column<int>(type: "integer", nullable: false),
                    docnumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_sales_price_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_sales_price_history_tbl_article_idarticle",
                        column: x => x.idarticle,
                        principalTable: "tbl_article",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbl_sales_price_history_tbl_counter_part_idcounterpart",
                        column: x => x.idcounterpart,
                        principalTable: "tbl_counter_part",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbl_sales_price_history_tbl_document_iddocument",
                        column: x => x.iddocument,
                        principalTable: "tbl_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tbl_purchase_price_history_idarticle",
                table: "tbl_purchase_price_history",
                column: "idarticle");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_purchase_price_history_idcounterpart",
                table: "tbl_purchase_price_history",
                column: "idcounterpart");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_purchase_price_history_iddocument",
                table: "tbl_purchase_price_history",
                column: "iddocument");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_sales_price_history_idarticle",
                table: "tbl_sales_price_history",
                column: "idarticle");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_sales_price_history_idcounterpart",
                table: "tbl_sales_price_history",
                column: "idcounterpart");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_sales_price_history_iddocument",
                table: "tbl_sales_price_history",
                column: "iddocument");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbl_purchase_price_history");

            migrationBuilder.DropTable(
                name: "tbl_sales_price_history");
        }
    }
}
