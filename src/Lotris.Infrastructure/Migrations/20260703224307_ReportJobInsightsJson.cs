using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lotris.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ReportJobInsightsJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InsightsJson",
                schema: "analytics",
                table: "ReportJobs",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InsightsJson",
                schema: "analytics",
                table: "ReportJobs");
        }
    }
}
