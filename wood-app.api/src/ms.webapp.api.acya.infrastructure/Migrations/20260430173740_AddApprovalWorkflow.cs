using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddApprovalWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "approval_configs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EnterpriseId = table.Column<int>(type: "integer", nullable: false),
                    ThresholdAmount = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: true),
                    ApproverEmails = table.Column<string>(type: "text", nullable: true),
                    ApproverRoles = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_approval_configs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_approval_configs_tbl_enterprise_EnterpriseId",
                        column: x => x.EnterpriseId,
                        principalTable: "tbl_enterprise",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "document_approvals",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DocumentId = table.Column<int>(type: "integer", nullable: false),
                    SubmittedByUserId = table.Column<int>(type: "integer", nullable: false),
                    DecidedByUserId = table.Column<int>(type: "integer", nullable: true),
                    Decision = table.Column<int>(type: "integer", nullable: false),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    DecidedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_approvals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_document_approvals_tbl_app_user_DecidedByUserId",
                        column: x => x.DecidedByUserId,
                        principalTable: "tbl_app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_document_approvals_tbl_app_user_SubmittedByUserId",
                        column: x => x.SubmittedByUserId,
                        principalTable: "tbl_app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_document_approvals_tbl_document_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "tbl_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_approval_configs_EnterpriseId",
                table: "approval_configs",
                column: "EnterpriseId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_document_approvals_DecidedByUserId",
                table: "document_approvals",
                column: "DecidedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_document_approvals_Decision",
                table: "document_approvals",
                column: "Decision");

            migrationBuilder.CreateIndex(
                name: "IX_document_approvals_DocumentId",
                table: "document_approvals",
                column: "DocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_document_approvals_SubmittedByUserId",
                table: "document_approvals",
                column: "SubmittedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "approval_configs");

            migrationBuilder.DropTable(
                name: "document_approvals");
        }
    }
}
