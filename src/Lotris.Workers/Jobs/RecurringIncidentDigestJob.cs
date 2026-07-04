using System.Text;
using Lotris.Application.Admin;
using Lotris.Application.Notifications;
using Lotris.Application.ProblemManagement;
using Lotris.Domain;
using Lotris.Infrastructure.Notifications;
using Microsoft.Extensions.Logging;

namespace Lotris.Workers.Jobs;

public sealed class RecurringIncidentDigestJob : IRecurringIncidentDigestJob
{
    private static readonly int[] DigestRoleIds =
    [
        (int)UserRole.Admin,
        (int)UserRole.ItManager,
        (int)UserRole.TeamLead,
    ];

    private readonly IRcaRepository _rca;
    private readonly IAdminRepository _admin;
    private readonly IEmailSender _email;
    private readonly ITeamsNotifier _teams;
    private readonly ILogger<RecurringIncidentDigestJob> _logger;

    public RecurringIncidentDigestJob(
        IRcaRepository rca,
        IAdminRepository admin,
        IEmailSender email,
        ITeamsNotifier teams,
        ILogger<RecurringIncidentDigestJob> logger)
    {
        _rca = rca;
        _admin = admin;
        _email = email;
        _teams = teams;
        _logger = logger;
    }

    public async Task RunWeeklyAsync(CancellationToken cancellationToken = default)
    {
        var tenantIds = await _rca.ListActiveTenantIdsAsync(cancellationToken);
        foreach (var tenantId in tenantIds)
        {
            try
            {
                await ProcessTenantAsync(tenantId, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Recurring incident digest failed for tenant {TenantId}", tenantId);
            }
        }
    }

    private async Task ProcessTenantAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var rules = await _rca.GetTriggerRulesAsync(tenantId, cancellationToken);
        var problems = await _rca.ListRecurringProblemsAsync(tenantId, rules.RecurrenceThreshold, cancellationToken);
        if (problems.Count == 0)
        {
            return;
        }

        var users = await _admin.ListUsersAsync(tenantId, teamId: null, cancellationToken);
        var recipients = users
            .Where(u => u.IsActive && DigestRoleIds.Contains(u.RoleId) && u.Email.Contains('@'))
            .Select(u => u.Email)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var subject = $"Lotris weekly digest: {problems.Count} recurring problem(s)";
        var textBody = BuildTextDigest(problems, rules.RecurrenceWindowDays);
        var htmlBody = BuildHtmlDigest(problems, rules.RecurrenceWindowDays);

        foreach (var to in recipients)
        {
            try
            {
                await _email.SendAsync(new EmailMessage
                {
                    To = to,
                    Subject = subject,
                    HtmlBody = htmlBody,
                    TextBody = textBody,
                }, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Digest email failed for {Email}", to);
            }
        }

        var teamsText = string.Join("\n\n", problems.Take(8).Select(p =>
            $"• {p.ProblemRef} — {p.Title} ({p.RecurrenceCount} occurrences, {p.LinkedTicketCount} linked tickets)"));
        await _teams.SendAsync(
            tenantId,
            subject,
            teamsText,
            cancellationToken);
    }

    private static string BuildTextDigest(IReadOnlyList<RecurringProblemDigestRow> problems, int windowDays)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Recurring incidents (threshold within {windowDays} days):");
        sb.AppendLine();
        foreach (var p in problems)
        {
            sb.AppendLine($"- {p.ProblemRef}: {p.Title}");
            sb.AppendLine($"  Occurrences: {p.RecurrenceCount} | Linked tickets: {p.LinkedTicketCount} | Status: {p.Status}");
            if (p.RcaRef is not null)
            {
                sb.AppendLine($"  RCA: {p.RcaRef} ({p.RcaStatus ?? "—"})");
            }

            sb.AppendLine();
        }

        sb.AppendLine("Review problems in Lotris → Problems to link incidents and progress RCAs.");
        return sb.ToString();
    }

    private static string BuildHtmlDigest(IReadOnlyList<RecurringProblemDigestRow> problems, int windowDays)
    {
        var rows = string.Join("", problems.Select(p =>
            $"""
            <tr>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace">{p.ProblemRef}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb">{System.Net.WebUtility.HtmlEncode(p.Title)}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">{p.RecurrenceCount}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">{p.LinkedTicketCount}</td>
              <td style="padding:8px;border-bottom:1px solid #e5e7eb">{p.RcaRef ?? "—"}</td>
            </tr>
            """));

        return $"""
            <p>These problems exceeded your recurrence threshold ({windowDays}-day window):</p>
            <table style="border-collapse:collapse;width:100%;font-size:13px">
              <thead>
                <tr style="background:#f3f4f6">
                  <th style="padding:8px;text-align:left">Ref</th>
                  <th style="padding:8px;text-align:left">Title</th>
                  <th style="padding:8px">Count</th>
                  <th style="padding:8px">Tickets</th>
                  <th style="padding:8px;text-align:left">RCA</th>
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>
            <p style="margin-top:16px;font-size:12px;color:#6b7280">Open Lotris → Problems to review and link related incidents.</p>
            """;
    }
}
