using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddQuantityDeliveredToDocumentMerchandise : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // §5.5 — Nettoyage : la colonne "QuantityDelivered" (PascalCase) a été créée 
            // par une migration précédente qui peut être manquante dans le schéma.
            // On supprime d'abord le doublon en minuscules puis on ajoute "QuantityDelivered" s'il n'existe pas.
            migrationBuilder.Sql(@"
                ALTER TABLE tbl_document_merchandise 
                DROP COLUMN IF EXISTS quantitydelivered;

                ALTER TABLE tbl_document_merchandise 
                ADD COLUMN IF NOT EXISTS ""QuantityDelivered"" double precision NOT NULL DEFAULT 0.0;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE tbl_document_merchandise 
                DROP COLUMN IF EXISTS ""QuantityDelivered"";
            ");
        }
    }
}
