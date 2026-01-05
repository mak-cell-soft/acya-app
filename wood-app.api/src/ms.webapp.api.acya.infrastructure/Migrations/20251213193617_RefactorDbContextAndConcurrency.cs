using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ms.webapp.api.acya.infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RefactorDbContextAndConcurrency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tbl_app_health",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: true),
                    value = table.Column<string>(type: "text", nullable: true),
                    iscr = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_app_health", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tbl_appvariable",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nature = table.Column<string>(type: "text", nullable: true),
                    name = table.Column<string>(type: "text", nullable: true),
                    value = table.Column<double>(type: "double precision", nullable: true),
                    isactive = table.Column<bool>(type: "boolean", nullable: true),
                    isdefault = table.Column<bool>(type: "boolean", nullable: true),
                    iseditable = table.Column<bool>(type: "boolean", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_appvariable", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tbl_enterprise",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: true),
                    enterpriseguid = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: true),
                    phone = table.Column<string>(type: "text", nullable: true),
                    mobileone = table.Column<string>(type: "text", nullable: true),
                    mobiletwo = table.Column<string>(type: "text", nullable: true),
                    matriculefiscal = table.Column<string>(type: "text", nullable: true),
                    devise = table.Column<string>(type: "text", nullable: true),
                    nameresponsable = table.Column<string>(type: "text", nullable: true),
                    surnameresponsable = table.Column<string>(type: "text", nullable: true),
                    positionresponsable = table.Column<string>(type: "text", nullable: true),
                    siegeaddress = table.Column<string>(type: "text", nullable: true),
                    commercialregister = table.Column<string>(type: "text", nullable: true),
                    capital = table.Column<string>(type: "text", nullable: true),
                    issalingwood = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_enterprise", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tbl_pending_notification",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    content = table.Column<string>(type: "text", nullable: false),
                    targetgroup = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    retry_count = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    last_attempt_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    delivered_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    error_message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_pending_notification", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tbl_person",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guid = table.Column<Guid>(type: "uuid", nullable: false),
                    firstname = table.Column<string>(type: "text", nullable: true),
                    lastname = table.Column<string>(type: "text", nullable: true),
                    fullname = table.Column<string>(type: "text", nullable: true),
                    birthdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    cin = table.Column<string>(type: "text", nullable: true),
                    idcnss = table.Column<string>(type: "text", nullable: true),
                    idrole = table.Column<int>(type: "integer", nullable: false),
                    address = table.Column<string>(type: "text", nullable: true),
                    birthtown = table.Column<string>(type: "text", nullable: true),
                    bankname = table.Column<string>(type: "text", nullable: true),
                    bankaccount = table.Column<string>(type: "text", nullable: true),
                    phonenumber = table.Column<string>(type: "text", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false),
                    isappuser = table.Column<bool>(type: "boolean", nullable: false),
                    hiredate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    firedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    idappuser = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_person", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tbl_sell_history",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    pricevalue = table.Column<double>(type: "double precision", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false),
                    idarticle = table.Column<int>(type: "integer", nullable: false),
                    idappuser = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_sell_history", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tbl_vehicle",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    serialnumber = table.Column<string>(type: "text", nullable: true),
                    brand = table.Column<string>(type: "text", nullable: true),
                    insurancedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    technicalvisitdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    mileage = table.Column<string>(type: "text", nullable: true),
                    draining = table.Column<string>(type: "text", nullable: true),
                    drainingdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_vehicle", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tbl_sales_sites",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    isforsale = table.Column<bool>(type: "boolean", nullable: false),
                    gouvernorate = table.Column<string>(type: "text", nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    codepost = table.Column<string>(type: "text", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false),
                    enterpriseid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_sales_sites", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_sales_sites_tbl_enterprise_enterpriseid",
                        column: x => x.enterpriseid,
                        principalTable: "tbl_enterprise",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tbl_transporter",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    firstname = table.Column<string>(type: "text", nullable: true),
                    lastname = table.Column<string>(type: "text", nullable: true),
                    fullname = table.Column<string>(type: "text", nullable: true),
                    vehicleid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_transporter", x => x.id);
                    table.ForeignKey(
                        name: "fk_tbl_transporter_tbl_vehicle",
                        column: x => x.vehicleid,
                        principalTable: "tbl_vehicle",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tbl_app_user",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    login = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: true),
                    isactive = table.Column<bool>(type: "boolean", nullable: false),
                    passwordhash = table.Column<byte[]>(type: "bytea", nullable: true),
                    passwordsalt = table.Column<byte[]>(type: "bytea", nullable: true),
                    idperson = table.Column<int>(type: "integer", nullable: false),
                    enterpriseid = table.Column<int>(type: "integer", nullable: true),
                    idsalessite = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_app_user", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_app_user_tbl_enterprise_enterpriseid",
                        column: x => x.enterpriseid,
                        principalTable: "tbl_enterprise",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_tbl_app_user_tbl_person_idperson",
                        column: x => x.idperson,
                        principalTable: "tbl_person",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_tbl_app_user_tbl_sales_sites_idsalessite",
                        column: x => x.idsalessite,
                        principalTable: "tbl_sales_sites",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "HoldingTax",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Description = table.Column<string>(type: "text", nullable: true),
                    TaxPercentage = table.Column<double>(type: "double precision", nullable: false),
                    TaxValue = table.Column<double>(type: "double precision", nullable: false),
                    isSigned = table.Column<bool>(type: "boolean", nullable: false),
                    CreationDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdateDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    NewAmountDocValue = table.Column<double>(type: "double precision", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    UpdatedById = table.Column<int>(type: "integer", nullable: false),
                    AppUsersId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HoldingTax", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HoldingTax_tbl_app_user_AppUsersId",
                        column: x => x.AppUsersId,
                        principalTable: "tbl_app_user",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "tbl_bank",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    reference = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    logo = table.Column<string>(type: "text", nullable: true),
                    agency = table.Column<string>(type: "text", nullable: true),
                    rib = table.Column<string>(type: "text", nullable: true),
                    iban = table.Column<string>(type: "text", nullable: true),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: true),
                    idappuser = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_bank", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_bank_tbl_app_user_idappuser",
                        column: x => x.idappuser,
                        principalTable: "tbl_app_user",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "tbl_counter_part",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guid = table.Column<Guid>(type: "uuid", nullable: true),
                    type = table.Column<int>(type: "integer", nullable: false),
                    prefix = table.Column<string>(type: "text", nullable: true),
                    name = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    firstname = table.Column<string>(type: "text", nullable: true),
                    lastname = table.Column<string>(type: "text", nullable: true),
                    identitycardnumber = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: true),
                    taxregistrationnumber = table.Column<string>(type: "text", nullable: true),
                    patentecode = table.Column<string>(type: "text", nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    gouvernorate = table.Column<string>(type: "text", nullable: true),
                    maximumdiscount = table.Column<double>(type: "double precision", nullable: true),
                    maximumsalesbar = table.Column<double>(type: "double precision", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    phonenumberone = table.Column<string>(type: "text", nullable: true),
                    phonenumbertwo = table.Column<string>(type: "text", nullable: true),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    jobtitle = table.Column<string>(type: "text", nullable: true),
                    bankname = table.Column<string>(type: "text", nullable: true),
                    bankaccountnumber = table.Column<string>(type: "text", nullable: true),
                    isactive = table.Column<bool>(type: "boolean", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: true),
                    updatedby = table.Column<int>(type: "integer", nullable: false),
                    transporterid = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_counter_part", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_counter_part_tbl_app_user_updatedby",
                        column: x => x.updatedby,
                        principalTable: "tbl_app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_tbl_counter_part_tbl_transporter",
                        column: x => x.transporterid,
                        principalTable: "tbl_transporter",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "tbl_parent",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    reference = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false),
                    idappuser = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_parent", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_parent_tbl_app_user_idappuser",
                        column: x => x.idappuser,
                        principalTable: "tbl_app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "tbl_provider",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    prefix = table.Column<string>(type: "text", nullable: true),
                    name = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    representedbyname = table.Column<string>(type: "text", nullable: true),
                    representedbysurname = table.Column<string>(type: "text", nullable: true),
                    representedbyfullname = table.Column<string>(type: "text", nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: true),
                    category = table.Column<string>(type: "text", nullable: true),
                    taxregistrationnumber = table.Column<string>(type: "text", nullable: true),
                    phonenumberone = table.Column<string>(type: "text", nullable: true),
                    phonenumbertwo = table.Column<string>(type: "text", nullable: true),
                    bankname = table.Column<string>(type: "text", nullable: true),
                    bankaccountnumber = table.Column<string>(type: "text", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false),
                    isactive = table.Column<bool>(type: "boolean", nullable: false),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    idappuser = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_provider", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_provider_tbl_app_user_idappuser",
                        column: x => x.idappuser,
                        principalTable: "tbl_app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tbl_document",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    type = table.Column<int>(type: "integer", nullable: true),
                    stocktransactiontype = table.Column<int>(type: "integer", nullable: true),
                    docnumber = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    supplierreference = table.Column<string>(type: "text", nullable: true),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    isinvoiced = table.Column<bool>(type: "boolean", nullable: false),
                    withholdingtax = table.Column<bool>(type: "boolean", nullable: false),
                    totalcostpriceht = table.Column<double>(type: "double precision", nullable: false),
                    totalcostpricettc = table.Column<double>(type: "double precision", nullable: false),
                    totalcosttva = table.Column<double>(type: "double precision", nullable: false),
                    totalcostdiscount = table.Column<double>(type: "double precision", nullable: false),
                    holdingtaxid = table.Column<int>(type: "integer", nullable: true),
                    taxeid = table.Column<int>(type: "integer", nullable: true),
                    updatedbyid = table.Column<int>(type: "integer", nullable: true),
                    counterpartid = table.Column<int>(type: "integer", nullable: false),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    salessiteid = table.Column<int>(type: "integer", nullable: false),
                    docstatus = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_document", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_document_tbl_appvariable_taxeid",
                        column: x => x.taxeid,
                        principalTable: "tbl_appvariable",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_tbl_document_tbl_counter_part_counterpartid",
                        column: x => x.counterpartid,
                        principalTable: "tbl_counter_part",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tbl_document_tbl_sales_sites_salessiteid",
                        column: x => x.salessiteid,
                        principalTable: "tbl_sales_sites",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_tbl_document_tbl_app_user",
                        column: x => x.updatedbyid,
                        principalTable: "tbl_app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_tbl_document_tbl_holding_tax",
                        column: x => x.holdingtaxid,
                        principalTable: "HoldingTax",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "tbl_first_child",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    reference = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false),
                    idappuser = table.Column<int>(type: "integer", nullable: true),
                    idparent = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_first_child", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_first_child_tbl_app_user_idappuser",
                        column: x => x.idappuser,
                        principalTable: "tbl_app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_tbl_first_child_tbl_parent_idparent",
                        column: x => x.idparent,
                        principalTable: "tbl_parent",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "tbl_document_document_relationship",
                columns: table => new
                {
                    parent_document_id = table.Column<int>(type: "integer", nullable: false),
                    child_document_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_document_document_relationship", x => new { x.parent_document_id, x.child_document_id });
                    table.ForeignKey(
                        name: "FK_tbl_document_document_relationship_tbl_document_child_docum~",
                        column: x => x.child_document_id,
                        principalTable: "tbl_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tbl_document_document_relationship_tbl_document_parent_docu~",
                        column: x => x.parent_document_id,
                        principalTable: "tbl_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tbl_stock_transfer",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    exitdocumentid = table.Column<int>(type: "integer", nullable: false),
                    receiptdocumentid = table.Column<int>(type: "integer", nullable: false),
                    transferdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    reference = table.Column<string>(type: "text", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    transporterid = table.Column<int>(type: "integer", nullable: true),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    createdbyid = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    confirmedbyid = table.Column<int>(type: "integer", nullable: true),
                    confirmationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    rejectionreason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_stock_transfer", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_stock_transfer_tbl_app_user_createdbyid",
                        column: x => x.createdbyid,
                        principalTable: "tbl_app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbl_stock_transfer_tbl_document_exitdocumentid",
                        column: x => x.exitdocumentid,
                        principalTable: "tbl_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbl_stock_transfer_tbl_document_receiptdocumentid",
                        column: x => x.receiptdocumentid,
                        principalTable: "tbl_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbl_stock_transfer_tbl_transporter_transporterid",
                        column: x => x.transporterid,
                        principalTable: "tbl_transporter",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "tbl_article",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    reference = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    iswood = table.Column<bool>(type: "boolean", nullable: false),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false),
                    minquantity = table.Column<double>(type: "double precision", nullable: true),
                    unit = table.Column<string>(type: "text", nullable: true),
                    sellprice_ht = table.Column<double>(type: "double precision", nullable: true),
                    sellprice_ttc = table.Column<double>(type: "double precision", nullable: true),
                    lastpurchaseprice_ttc = table.Column<double>(type: "double precision", nullable: false),
                    profitmarginpercentage = table.Column<double>(type: "double precision", nullable: true),
                    lengths = table.Column<string>(type: "text", nullable: true),
                    idsellhistory = table.Column<int>(type: "integer", nullable: true),
                    idtva = table.Column<int>(type: "integer", nullable: false),
                    idcategory = table.Column<int>(type: "integer", nullable: false),
                    idsubcategory = table.Column<int>(type: "integer", nullable: false),
                    idappuser = table.Column<int>(type: "integer", nullable: false),
                    idthickness = table.Column<int>(type: "integer", nullable: true),
                    idwidth = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_article", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_article_tbl_app_user_idappuser",
                        column: x => x.idappuser,
                        principalTable: "tbl_app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tbl_article_tbl_appvariable_idthickness",
                        column: x => x.idthickness,
                        principalTable: "tbl_appvariable",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_tbl_article_tbl_appvariable_idtva",
                        column: x => x.idtva,
                        principalTable: "tbl_appvariable",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tbl_article_tbl_appvariable_idwidth",
                        column: x => x.idwidth,
                        principalTable: "tbl_appvariable",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_tbl_article_tbl_first_child_idsubcategory",
                        column: x => x.idsubcategory,
                        principalTable: "tbl_first_child",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tbl_article_tbl_parent_idcategory",
                        column: x => x.idcategory,
                        principalTable: "tbl_parent",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tbl_article_tbl_sell_history_idsellhistory",
                        column: x => x.idsellhistory,
                        principalTable: "tbl_sell_history",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "tbl_second_child",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    reference = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false),
                    idappuser = table.Column<int>(type: "integer", nullable: true),
                    AppUserId = table.Column<int>(type: "integer", nullable: true),
                    IdFirstChild = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_second_child", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_second_child_tbl_app_user_AppUserId",
                        column: x => x.AppUserId,
                        principalTable: "tbl_app_user",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_tbl_second_child_tbl_first_child_IdFirstChild",
                        column: x => x.IdFirstChild,
                        principalTable: "tbl_first_child",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "tbl_merchandise",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    packagereference = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    isinvoicible = table.Column<bool>(type: "boolean", nullable: false),
                    allownegativstock = table.Column<bool>(type: "boolean", nullable: false),
                    ismergedwith = table.Column<bool>(type: "boolean", nullable: false),
                    idmergedmerchandise = table.Column<int>(type: "integer", nullable: true),
                    isdeleted = table.Column<bool>(type: "boolean", nullable: false),
                    articleid = table.Column<int>(type: "integer", nullable: false),
                    updatedbyid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_merchandise", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_merchandise_tbl_app_user_updatedbyid",
                        column: x => x.updatedbyid,
                        principalTable: "tbl_app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tbl_merchandise_tbl_article_articleid",
                        column: x => x.articleid,
                        principalTable: "tbl_article",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DocumentMerchandise",
                columns: table => new
                {
                    DocumentsId = table.Column<int>(type: "integer", nullable: false),
                    MerchandisesId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentMerchandise", x => new { x.DocumentsId, x.MerchandisesId });
                    table.ForeignKey(
                        name: "FK_DocumentMerchandise_tbl_document_DocumentsId",
                        column: x => x.DocumentsId,
                        principalTable: "tbl_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DocumentMerchandise_tbl_merchandise_MerchandisesId",
                        column: x => x.MerchandisesId,
                        principalTable: "tbl_merchandise",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tbl_document_merchandise",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    creation_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    update_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    quantity = table.Column<double>(type: "double precision", nullable: false),
                    unitprice_ht = table.Column<double>(type: "double precision", nullable: false),
                    cost_ht = table.Column<double>(type: "double precision", nullable: false),
                    discount_percentage = table.Column<double>(type: "double precision", nullable: false),
                    cost_net_ht = table.Column<double>(type: "double precision", nullable: false),
                    cost_discount_value = table.Column<double>(type: "double precision", nullable: false),
                    tva_value = table.Column<double>(type: "double precision", nullable: false),
                    cost_ttc = table.Column<double>(type: "double precision", nullable: false),
                    documentid = table.Column<int>(type: "integer", nullable: false),
                    merchandiseid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_document_merchandise", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_document_merchandise_tbl_document_documentid",
                        column: x => x.documentid,
                        principalTable: "tbl_document",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tbl_document_merchandise_tbl_merchandise_merchandiseid",
                        column: x => x.merchandiseid,
                        principalTable: "tbl_merchandise",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tbl_stock",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    quantity = table.Column<double>(type: "double precision", nullable: false),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    type = table.Column<int>(type: "integer", nullable: false),
                    idmerchandise = table.Column<int>(type: "integer", nullable: false),
                    idsite = table.Column<int>(type: "integer", nullable: false),
                    updatedbyid = table.Column<int>(type: "integer", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_stock", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_stock_tbl_merchandise_idmerchandise",
                        column: x => x.idmerchandise,
                        principalTable: "tbl_merchandise",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tbl_stock_tbl_sales_sites_idsite",
                        column: x => x.idsite,
                        principalTable: "tbl_sales_sites",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_tbl_stock_tbl_app_user",
                        column: x => x.updatedbyid,
                        principalTable: "tbl_app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tbl_quantity_mouvements",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    lengthids = table.Column<string>(type: "text", nullable: true),
                    quantity = table.Column<double>(type: "double precision", nullable: true),
                    creationdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    updatedate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    document_merchandise_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_quantity_mouvements", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_quantity_mouvements_tbl_document_merchandise_document_m~",
                        column: x => x.document_merchandise_id,
                        principalTable: "tbl_document_merchandise",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tbl_list_of_lengths",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    numberofpieces = table.Column<int>(type: "integer", nullable: false),
                    quantity = table.Column<double>(type: "double precision", nullable: false),
                    lengthappvarid = table.Column<int>(type: "integer", nullable: true),
                    quantitymouvementid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_list_of_lengths", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_list_of_lengths_tbl_appvariable_lengthappvarid",
                        column: x => x.lengthappvarid,
                        principalTable: "tbl_appvariable",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_tbl_list_of_lengths_tbl_quantity_mouvements_quantitymouveme~",
                        column: x => x.quantitymouvementid,
                        principalTable: "tbl_quantity_mouvements",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentMerchandise_MerchandisesId",
                table: "DocumentMerchandise",
                column: "MerchandisesId");

            migrationBuilder.CreateIndex(
                name: "IX_HoldingTax_AppUsersId",
                table: "HoldingTax",
                column: "AppUsersId");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_app_user_enterpriseid",
                table: "tbl_app_user",
                column: "enterpriseid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tbl_app_user_idperson",
                table: "tbl_app_user",
                column: "idperson");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_app_user_idsalessite",
                table: "tbl_app_user",
                column: "idsalessite",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tbl_article_idappuser",
                table: "tbl_article",
                column: "idappuser");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_article_idcategory",
                table: "tbl_article",
                column: "idcategory");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_article_idsellhistory",
                table: "tbl_article",
                column: "idsellhistory");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_article_idsubcategory",
                table: "tbl_article",
                column: "idsubcategory");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_article_idthickness",
                table: "tbl_article",
                column: "idthickness");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_article_idtva",
                table: "tbl_article",
                column: "idtva");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_article_idwidth",
                table: "tbl_article",
                column: "idwidth");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_bank_idappuser",
                table: "tbl_bank",
                column: "idappuser");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_counter_part_transporterid",
                table: "tbl_counter_part",
                column: "transporterid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_counter_part_updatedby",
                table: "tbl_counter_part",
                column: "updatedby");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_document_counterpartid",
                table: "tbl_document",
                column: "counterpartid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_document_holdingtaxid",
                table: "tbl_document",
                column: "holdingtaxid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_document_salessiteid",
                table: "tbl_document",
                column: "salessiteid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_document_taxeid",
                table: "tbl_document",
                column: "taxeid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_document_updatedbyid",
                table: "tbl_document",
                column: "updatedbyid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_document_document_relationship_child_document_id",
                table: "tbl_document_document_relationship",
                column: "child_document_id");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_document_merchandise_documentid",
                table: "tbl_document_merchandise",
                column: "documentid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_document_merchandise_merchandiseid",
                table: "tbl_document_merchandise",
                column: "merchandiseid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_first_child_idappuser",
                table: "tbl_first_child",
                column: "idappuser");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_first_child_idparent",
                table: "tbl_first_child",
                column: "idparent");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_list_of_lengths_lengthappvarid",
                table: "tbl_list_of_lengths",
                column: "lengthappvarid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_list_of_lengths_quantitymouvementid",
                table: "tbl_list_of_lengths",
                column: "quantitymouvementid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_merchandise_articleid",
                table: "tbl_merchandise",
                column: "articleid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_merchandise_updatedbyid",
                table: "tbl_merchandise",
                column: "updatedbyid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_parent_idappuser",
                table: "tbl_parent",
                column: "idappuser");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_pending_notification_targetgroup_status",
                table: "tbl_pending_notification",
                columns: new[] { "targetgroup", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_tbl_provider_idappuser",
                table: "tbl_provider",
                column: "idappuser");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_quantity_mouvements_document_merchandise_id",
                table: "tbl_quantity_mouvements",
                column: "document_merchandise_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tbl_sales_sites_enterpriseid",
                table: "tbl_sales_sites",
                column: "enterpriseid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_second_child_AppUserId",
                table: "tbl_second_child",
                column: "AppUserId");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_second_child_IdFirstChild",
                table: "tbl_second_child",
                column: "IdFirstChild");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_stock_idmerchandise",
                table: "tbl_stock",
                column: "idmerchandise");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_stock_idsite",
                table: "tbl_stock",
                column: "idsite");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_stock_updatedbyid",
                table: "tbl_stock",
                column: "updatedbyid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_stock_transfer_createdbyid",
                table: "tbl_stock_transfer",
                column: "createdbyid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_stock_transfer_exitdocumentid",
                table: "tbl_stock_transfer",
                column: "exitdocumentid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_stock_transfer_receiptdocumentid",
                table: "tbl_stock_transfer",
                column: "receiptdocumentid");

            migrationBuilder.CreateIndex(
                name: "ix_tbl_stock_transfer_reference",
                table: "tbl_stock_transfer",
                column: "reference",
                filter: "reference IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_tbl_stock_transfer_transferdate",
                table: "tbl_stock_transfer",
                column: "transferdate");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_stock_transfer_transporterid",
                table: "tbl_stock_transfer",
                column: "transporterid");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_transporter_vehicleid",
                table: "tbl_transporter",
                column: "vehicleid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DocumentMerchandise");

            migrationBuilder.DropTable(
                name: "tbl_app_health");

            migrationBuilder.DropTable(
                name: "tbl_bank");

            migrationBuilder.DropTable(
                name: "tbl_document_document_relationship");

            migrationBuilder.DropTable(
                name: "tbl_list_of_lengths");

            migrationBuilder.DropTable(
                name: "tbl_pending_notification");

            migrationBuilder.DropTable(
                name: "tbl_provider");

            migrationBuilder.DropTable(
                name: "tbl_second_child");

            migrationBuilder.DropTable(
                name: "tbl_stock");

            migrationBuilder.DropTable(
                name: "tbl_stock_transfer");

            migrationBuilder.DropTable(
                name: "tbl_quantity_mouvements");

            migrationBuilder.DropTable(
                name: "tbl_document_merchandise");

            migrationBuilder.DropTable(
                name: "tbl_document");

            migrationBuilder.DropTable(
                name: "tbl_merchandise");

            migrationBuilder.DropTable(
                name: "tbl_counter_part");

            migrationBuilder.DropTable(
                name: "HoldingTax");

            migrationBuilder.DropTable(
                name: "tbl_article");

            migrationBuilder.DropTable(
                name: "tbl_transporter");

            migrationBuilder.DropTable(
                name: "tbl_appvariable");

            migrationBuilder.DropTable(
                name: "tbl_first_child");

            migrationBuilder.DropTable(
                name: "tbl_sell_history");

            migrationBuilder.DropTable(
                name: "tbl_vehicle");

            migrationBuilder.DropTable(
                name: "tbl_parent");

            migrationBuilder.DropTable(
                name: "tbl_app_user");

            migrationBuilder.DropTable(
                name: "tbl_person");

            migrationBuilder.DropTable(
                name: "tbl_sales_sites");

            migrationBuilder.DropTable(
                name: "tbl_enterprise");
        }
    }
}
