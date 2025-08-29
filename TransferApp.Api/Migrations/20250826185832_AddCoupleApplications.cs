using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TransferApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCoupleApplications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Vacancies_InstitutionId_Designation",
                table: "Vacancies");

            migrationBuilder.CreateTable(
                name: "CoupleApplications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Doctor1Id = table.Column<int>(type: "INTEGER", nullable: false),
                    Doctor2Id = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoupleApplications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoupleApplications_Doctors_Doctor1Id",
                        column: x => x.Doctor1Id,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CoupleApplications_Doctors_Doctor2Id",
                        column: x => x.Doctor2Id,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Vacancies_Designation_InstitutionId",
                table: "Vacancies",
                columns: new[] { "Designation", "InstitutionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vacancies_InstitutionId",
                table: "Vacancies",
                column: "InstitutionId");

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_PartnerDoctorId",
                table: "Doctors",
                column: "PartnerDoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_CoupleApplications_Doctor1Id_Doctor2Id",
                table: "CoupleApplications",
                columns: new[] { "Doctor1Id", "Doctor2Id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CoupleApplications_Doctor2Id",
                table: "CoupleApplications",
                column: "Doctor2Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Doctors_Doctors_PartnerDoctorId",
                table: "Doctors",
                column: "PartnerDoctorId",
                principalTable: "Doctors",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Doctors_Doctors_PartnerDoctorId",
                table: "Doctors");

            migrationBuilder.DropTable(
                name: "CoupleApplications");

            migrationBuilder.DropIndex(
                name: "IX_Vacancies_Designation_InstitutionId",
                table: "Vacancies");

            migrationBuilder.DropIndex(
                name: "IX_Vacancies_InstitutionId",
                table: "Vacancies");

            migrationBuilder.DropIndex(
                name: "IX_Doctors_PartnerDoctorId",
                table: "Doctors");

            migrationBuilder.CreateIndex(
                name: "IX_Vacancies_InstitutionId_Designation",
                table: "Vacancies",
                columns: new[] { "InstitutionId", "Designation" },
                unique: true);
        }
    }
}
