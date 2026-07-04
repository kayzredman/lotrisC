using System.Text;
using Hangfire;
using Lotris.Api.Auth;
using Lotris.Api.Configuration;
using Lotris.Api.OpenApi;
using Lotris.Api.Filters;
using Lotris.Api.Intake;
using Lotris.Application;
using Lotris.Application.Intelligence;
using Lotris.Infrastructure;
using Lotris.Infrastructure.Analytics;
using Lotris.Infrastructure.Data;
using Lotris.Infrastructure.Migrations;
using Lotris.Infrastructure.Reports;
using Lotris.Workers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

DotEnvLoader.LoadForDevelopment();

var builder = WebApplication.CreateBuilder(args);

var jwtSecret = builder.Configuration["JWT_SECRET"]
    ?? builder.Configuration["Jwt:Secret"]
    ?? "dev-only-change-me-use-at-least-32-characters-long-secret";

builder.Services.AddControllers(options =>
{
    options.Filters.Add<LotrisExceptionFilter>();
});
builder.Services.AddOpenApi(options =>
{
    options.AddSchemaTransformer<GuidSchemaTransformer>();
    options.AddDocumentTransformer<LotrisOpenApiDocumentTransformer>();
});

builder.Services.Configure<OpenApiHostingOptions>(builder.Configuration.GetSection(OpenApiHostingOptions.SectionName));

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration["Cors:AllowedOrigins"]
            ?? builder.Configuration["APP_BASE_URL"]
            ?? "http://localhost:3000";
        policy.WithOrigins(origins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddLotrisApplication();
builder.Services.AddLotrisInfrastructure(builder.Configuration);
builder.Services.AddLotrisWorkers(builder.Configuration);
builder.Services.AddSingleton<Lotris.Api.Notifications.SseConnectionManager>();
builder.Services.AddHostedService<EmailIntakeHostedService>();

builder.Services.AddLotrisAuthentication(builder.Configuration);

builder.Services.AddAuthorization();

var healthChecks = builder.Services.AddHealthChecks()
    .AddCheck("self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy("API is running"));

var defaultConnection = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrWhiteSpace(defaultConnection))
{
    healthChecks.AddSqlServer(defaultConnection, name: "mssql", tags: ["ready", "db"]);
}

var redisConnection = builder.Configuration["Redis:ConnectionString"];
if (!string.IsNullOrWhiteSpace(redisConnection))
{
    healthChecks.AddRedis(redisConnection, name: "redis", tags: ["ready", "cache"]);
}

var app = builder.Build();

var reportsOutputPath = app.Configuration["Reports:OutputPath"] ?? "./data/reports";
Directory.CreateDirectory(reportsOutputPath);

if (!app.Environment.IsEnvironment("Testing"))
{
    using (var scope = app.Services.CreateScope())
    {
        var migrator = scope.ServiceProvider.GetRequiredService<LegacyMssqlMigrator>();
        await migrator.ApplyPendingAsync();

        var db = scope.ServiceProvider.GetRequiredService<LotrisDbContext>();
        await db.Database.MigrateAsync();

        await scope.ServiceProvider.InitializeAnalyticsJobsAsync();
        ReportScheduleStartupExtensions.RegisterReportScheduleJob();
        ReportScheduleStartupExtensions.RegisterRecurringIncidentDigestJob();

        var vectorStore = scope.ServiceProvider.GetRequiredService<IVectorStore>();
        await vectorStore.EnsureCollectionAsync();
    }
}

var openApiOptions = app.Configuration.GetSection(OpenApiHostingOptions.SectionName).Get<OpenApiHostingOptions>()
    ?? new OpenApiHostingOptions();
var exposeOpenApi = openApiOptions.Enabled && !app.Environment.IsEnvironment("Testing");
var exposeOpenApiUi = exposeOpenApi && openApiOptions.UiEnabled;

if (exposeOpenApi)
{
    app.MapOpenApi();
}

if (exposeOpenApiUi)
{
    app.MapScalarApiReference("/openapi", options =>
    {
        options.WithTitle("Lotris API");
        options.WithOpenApiRoutePattern("/openapi/{documentName}.json");
        options.WithDefaultHttpClient(ScalarTarget.Shell, ScalarClient.Curl);
    });
}

if (app.Environment.IsDevelopment())
{
    app.UseHangfireDashboard("/hangfire");
}

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Name == "self",
});

app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
});

app.Run();

public partial class Program;
