using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using ms.webapp.api.acya.infrastructure;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(WoodAppContext))]
    [Migration("20260916190000_AddIsManagingProduction")]
    public partial class AddIsManagingProduction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ismanagingproduction",
                table: "tbl_enterprise",
                type: "boolean",
                nullable: true,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ismanagingproduction",
                table: "tbl_enterprise");
        }
    }
}
