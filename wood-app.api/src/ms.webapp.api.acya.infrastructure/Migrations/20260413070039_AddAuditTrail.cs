using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditTrail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AuditRetentionMonths",
                table: "tbl_enterprise",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: true),
                    UserName = table.Column<string>(type: "text", nullable: true),
                    Action = table.Column<string>(type: "text", nullable: false),
                    TableName = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    KeyValues = table.Column<string>(type: "text", nullable: true),
                    OldValues = table.Column<string>(type: "text", nullable: true),
                    NewValues = table.Column<string>(type: "text", nullable: true),
                    ChangedColumns = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            /*
            migrationBuilder.CreateTable(
                name: "tbl_employee_advances",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    employeeid = table.Column<int>(type: "integer", nullable: false),
                    amount = table.Column<decimal>(type: "numeric", nullable: false),
                    requestdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    repaymentschedule = table.Column<string>(type: "text", nullable: true),
                    amountrepaid = table.Column<decimal>(type: "numeric", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_employee_advances", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_employee_advances_tbl_person_employeeid",
                        column: x => x.employeeid,
                        principalTable: "tbl_person",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tbl_employee_leaves",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    employeeid = table.Column<int>(type: "integer", nullable: false),
                    leavetype = table.Column<string>(type: "text", nullable: false),
                    startdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    enddate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    durationdays = table.Column<decimal>(type: "numeric", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_employee_leaves", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_employee_leaves_tbl_person_employeeid",
                        column: x => x.employeeid,
                        principalTable: "tbl_person",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tbl_employee_payslips",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    employeeid = table.Column<int>(type: "integer", nullable: false),
                    periodmonth = table.Column<int>(type: "integer", nullable: false),
                    periodyear = table.Column<int>(type: "integer", nullable: false),
                    basesalary = table.Column<decimal>(type: "numeric", nullable: false),
                    bonuses = table.Column<decimal>(type: "numeric", nullable: false),
                    deductions = table.Column<decimal>(type: "numeric", nullable: false),
                    netsalary = table.Column<decimal>(type: "numeric", nullable: false),
                    generatedat = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_employee_payslips", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_employee_payslips_tbl_person_employeeid",
                        column: x => x.employeeid,
                        principalTable: "tbl_person",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tbl_employee_advances_employeeid",
                table: "tbl_employee_advances",
                column: "employeeid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_employee_leaves_employeeid",
                table: "tbl_employee_leaves",
                column: "employeeid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_employee_payslips_employeeid",
                table: "tbl_employee_payslips",
                column: "employeeid");
            */
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");

            /*
            migrationBuilder.DropTable(
                name: "tbl_employee_advances");

            migrationBuilder.DropTable(
                name: "tbl_employee_leaves");

            migrationBuilder.DropTable(
                name: "tbl_employee_payslips");
            */

            migrationBuilder.DropColumn(
                name: "AuditRetentionMonths",
                table: "tbl_enterprise");
        }
    }
}
