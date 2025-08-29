using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TransferApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAutoIncrementToIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create sequences for auto-increment IDs
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS \"Districts_Id_seq\" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1");
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS \"Institutions_Id_seq\" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1");
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS \"Vacancies_Id_seq\" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1");
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS \"Doctors_Id_seq\" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1");
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS \"Preferences_Id_seq\" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1");
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS \"CoupleApplications_Id_seq\" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1");
            
            // Set the sequences as owned by the tables
            migrationBuilder.Sql("ALTER SEQUENCE \"Districts_Id_seq\" OWNED BY \"Districts\".\"Id\"");
            migrationBuilder.Sql("ALTER SEQUENCE \"Institutions_Id_seq\" OWNED BY \"Institutions\".\"Id\"");
            migrationBuilder.Sql("ALTER SEQUENCE \"Vacancies_Id_seq\" OWNED BY \"Vacancies\".\"Id\"");
            migrationBuilder.Sql("ALTER SEQUENCE \"Doctors_Id_seq\" OWNED BY \"Doctors\".\"Id\"");
            migrationBuilder.Sql("ALTER SEQUENCE \"Preferences_Id_seq\" OWNED BY \"Preferences\".\"Id\"");
            migrationBuilder.Sql("ALTER SEQUENCE \"CoupleApplications_Id_seq\" OWNED BY \"CoupleApplications\".\"Id\"");
            
            // Set default values for the ID columns
            migrationBuilder.Sql("ALTER TABLE \"Districts\" ALTER COLUMN \"Id\" SET DEFAULT nextval('\"Districts_Id_seq\"')");
            migrationBuilder.Sql("ALTER TABLE \"Institutions\" ALTER COLUMN \"Id\" SET DEFAULT nextval('\"Institutions_Id_seq\"')");
            migrationBuilder.Sql("ALTER TABLE \"Vacancies\" ALTER COLUMN \"Id\" SET DEFAULT nextval('\"Vacancies_Id_seq\"')");
            migrationBuilder.Sql("ALTER TABLE \"Doctors\" ALTER COLUMN \"Id\" SET DEFAULT nextval('\"Doctors_Id_seq\"')");
            migrationBuilder.Sql("ALTER TABLE \"Preferences\" ALTER COLUMN \"Id\" SET DEFAULT nextval('\"Preferences_Id_seq\"')");
            migrationBuilder.Sql("ALTER TABLE \"CoupleApplications\" ALTER COLUMN \"Id\" SET DEFAULT nextval('\"CoupleApplications_Id_seq\"')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove the default values (auto-increment)
            migrationBuilder.Sql("ALTER TABLE \"Districts\" ALTER COLUMN \"Id\" DROP DEFAULT");
            migrationBuilder.Sql("ALTER TABLE \"Institutions\" ALTER COLUMN \"Id\" DROP DEFAULT");
            migrationBuilder.Sql("ALTER TABLE \"Vacancies\" ALTER COLUMN \"Id\" DROP DEFAULT");
            migrationBuilder.Sql("ALTER TABLE \"Doctors\" ALTER COLUMN \"Id\" DROP DEFAULT");
            migrationBuilder.Sql("ALTER TABLE \"Preferences\" ALTER COLUMN \"Id\" DROP DEFAULT");
            migrationBuilder.Sql("ALTER TABLE \"CoupleApplications\" ALTER COLUMN \"Id\" DROP DEFAULT");
            
            // Drop the sequences
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS \"Districts_Id_seq\"");
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS \"Institutions_Id_seq\"");
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS \"Vacancies_Id_seq\"");
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS \"Doctors_Id_seq\"");
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS \"Preferences_Id_seq\"");
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS \"CoupleApplications_Id_seq\"");
        }
    }
}
