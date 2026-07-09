using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Lotris.Infrastructure.Migrations;

public class LegacyMssqlMigrator
{
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<LegacyMssqlMigrator> _logger;

    public LegacyMssqlMigrator(
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<LegacyMssqlMigrator> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task ApplyPendingAsync(CancellationToken cancellationToken = default)
    {
        if (!_configuration.GetValue("Database:ApplyLegacyMigrations", false))
        {
            _logger.LogInformation("Legacy MSSQL migrations skipped (Database:ApplyLegacyMigrations=false).");
            return;
        }

        var connectionString = _configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            _logger.LogWarning("Legacy MSSQL migrations skipped — DefaultConnection is not configured.");
            return;
        }

        var migrationDir = ResolveMigrationDirectory();
        if (!Directory.Exists(migrationDir))
        {
            _logger.LogWarning("Legacy MSSQL migration directory not found: {Path}", migrationDir);
            return;
        }

        var files = Directory.GetFiles(migrationDir, "*.sql", SearchOption.TopDirectoryOnly)
            .OrderBy(f => Path.GetFileName(f), StringComparer.Ordinal)
            .ToArray();

        if (files.Length == 0)
        {
            _logger.LogInformation("No legacy MSSQL migration files found in {Path}.", migrationDir);
            return;
        }

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        await EnsureTrackingTableAsync(connection, cancellationToken);
        await BackfillTrackingIfSchemaExistsAsync(connection, files, cancellationToken);

        foreach (var file in files)
        {
            var migrationId = Path.GetFileName(file);
            if (await IsAppliedAsync(connection, migrationId, cancellationToken))
            {
                _logger.LogDebug("Legacy migration already applied: {MigrationId}", migrationId);
                continue;
            }

            var sql = await File.ReadAllTextAsync(file, cancellationToken);
            var batches = SplitSqlBatches(sql);
            _logger.LogInformation("Applying legacy MSSQL migration: {MigrationId} ({BatchCount} batches)", migrationId, batches.Count);

            await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);
            try
            {
                foreach (var batch in batches)
                {
                    await using var cmd = new SqlCommand(batch, connection, transaction);
                    cmd.CommandTimeout = 300;
                    await cmd.ExecuteNonQueryAsync(cancellationToken);
                }

                await using (var trackCmd = new SqlCommand(
                    """
                    INSERT INTO dbo._LotrisLegacyMigrations (migration_id, applied_at)
                    VALUES (@migrationId, SYSUTCDATETIME())
                    """,
                    connection,
                    transaction))
                {
                    trackCmd.Parameters.AddWithValue("@migrationId", migrationId);
                    await trackCmd.ExecuteNonQueryAsync(cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);
                _logger.LogInformation("Applied legacy MSSQL migration: {MigrationId}", migrationId);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Failed to apply legacy MSSQL migration: {MigrationId}", migrationId);
                throw;
            }
        }
    }

    private string ResolveMigrationDirectory()
    {
        var configured = _configuration["Database:LegacyMigrationsPath"];
        if (!string.IsNullOrWhiteSpace(configured) && Directory.Exists(configured))
        {
            return configured;
        }

        var candidates = new[]
        {
            Path.Combine(_environment.ContentRootPath, "LegacyMigrations"),
            Path.GetFullPath(Path.Combine(_environment.ContentRootPath, "..", "..", "packages", "db", "migrations", "mssql")),
            Path.GetFullPath(Path.Combine(_environment.ContentRootPath, "..", "packages", "db", "migrations", "mssql")),
        };

        return candidates.FirstOrDefault(Directory.Exists) ?? candidates[0];
    }

    private static async Task EnsureTrackingTableAsync(SqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
            IF OBJECT_ID(N'dbo._LotrisLegacyMigrations', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo._LotrisLegacyMigrations (
                    migration_id NVARCHAR(255) NOT NULL PRIMARY KEY,
                    applied_at   DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME()
                );
            END
            """;

        await using var cmd = new SqlCommand(sql, connection);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task BackfillTrackingIfSchemaExistsAsync(
        SqlConnection connection,
        string[] files,
        CancellationToken cancellationToken)
    {
        await using var existsCmd = new SqlCommand(
            "SELECT CASE WHEN OBJECT_ID(N'dbo.Tenants', N'U') IS NOT NULL THEN 1 ELSE 0 END",
            connection);
        var tenantsExists = Convert.ToInt32(await existsCmd.ExecuteScalarAsync(cancellationToken)) == 1;
        if (!tenantsExists)
        {
            return;
        }

        foreach (var file in files)
        {
            var migrationId = Path.GetFileName(file);
            if (await IsAppliedAsync(connection, migrationId, cancellationToken))
            {
                continue;
            }

            // Only backfill foundational scripts (0001–0009) from pre-tracking DBs.
            // Newer migrations must run through the normal apply loop.
            var prefix = migrationId.Length >= 4 ? migrationId[..4] : "";
            if (!int.TryParse(prefix, out var num) || num > 9)
            {
                continue;
            }

            await using var trackCmd = new SqlCommand(
                """
                INSERT INTO dbo._LotrisLegacyMigrations (migration_id, applied_at)
                VALUES (@migrationId, SYSUTCDATETIME())
                """,
                connection);
            trackCmd.Parameters.AddWithValue("@migrationId", migrationId);
            await trackCmd.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static async Task<bool> IsAppliedAsync(SqlConnection connection, string migrationId, CancellationToken cancellationToken)
    {
        await using var cmd = new SqlCommand(
            "SELECT COUNT(1) FROM dbo._LotrisLegacyMigrations WHERE migration_id = @migrationId",
            connection);
        cmd.Parameters.AddWithValue("@migrationId", migrationId);
        var count = (int)(await cmd.ExecuteScalarAsync(cancellationToken) ?? 0);
        return count > 0;
    }

    /// <summary>
    /// Splits sqlcmd-style scripts on standalone GO batch separators.
    /// </summary>
    internal static IReadOnlyList<string> SplitSqlBatches(string sql)
    {
        return sql
            .Replace("\r\n", "\n")
            .Split('\n')
            .Aggregate(
                (Batches: new List<string>(), Current: new List<string>()),
                (state, line) =>
                {
                    if (line.Trim().Equals("GO", StringComparison.OrdinalIgnoreCase))
                    {
                        var batch = string.Join('\n', state.Current).Trim();
                        if (batch.Length > 0)
                        {
                            state.Batches.Add(batch);
                        }

                        return (state.Batches, new List<string>());
                    }

                    state.Current.Add(line);
                    return state;
                },
                state =>
                {
                    var batch = string.Join('\n', state.Current).Trim();
                    if (batch.Length > 0)
                    {
                        state.Batches.Add(batch);
                    }

                    return (IReadOnlyList<string>)state.Batches;
                });
    }
}
