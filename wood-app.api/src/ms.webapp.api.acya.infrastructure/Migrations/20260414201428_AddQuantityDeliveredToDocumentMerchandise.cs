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
            // §5.5 — Nettoyage : la colonne "QuantityDelivered" (PascalCase) a déjà été
            // créée par une migration précédente (20260414133449 / 20260414144946).
            // Une erreur d'une tentative précédente a introduit un doublon "quantitydelivered"
            // (lowercase). On supprime le doublon pour garder uniquement la colonne originale.
            migrationBuilder.Sql(@"
                ALTER TABLE tbl_document_merchandise 
                DROP COLUMN IF EXISTS quantitydelivered;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Rien à faire : on ne peut pas annuler la suppression d un doublon
        }
    }
}
