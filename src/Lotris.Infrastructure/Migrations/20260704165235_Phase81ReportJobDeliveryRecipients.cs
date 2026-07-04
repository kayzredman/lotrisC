using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lotris.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Phase81ReportJobDeliveryRecipients : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('analytics.ReportJobs', 'DeliveryRecipients') IS NULL
                BEGIN
                    IF COL_LENGTH('analytics.ReportJobs', 'delivery_recipients') IS NOT NULL
                        EXEC sp_rename 'analytics.ReportJobs.delivery_recipients', 'DeliveryRecipients', 'COLUMN';
                    ELSE
                        ALTER TABLE analytics.ReportJobs ADD DeliveryRecipients NVARCHAR(MAX) NULL;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeliveryRecipients",
                schema: "analytics",
                table: "ReportJobs");
        }
    }
}
