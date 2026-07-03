using Lotris.Application.Intake;
using Lotris.Infrastructure.Intake;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Lotris.Api.Intake;

public sealed class EmailIntakeHostedService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IntakeOptions _options;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<EmailIntakeHostedService> _logger;

    public EmailIntakeHostedService(
        IServiceProvider services,
        IOptions<IntakeOptions> options,
        IConnectionMultiplexer redis,
        ILogger<EmailIntakeHostedService> logger)
    {
        _services = services;
        _options = options.Value;
        _redis = redis;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled
            || string.IsNullOrWhiteSpace(_options.EmailHost)
            || string.IsNullOrWhiteSpace(_options.EmailUser)
            || string.IsNullOrWhiteSpace(_options.EmailPassword))
        {
            _logger.LogInformation("IMAP intake not configured — email intake disabled");
            return;
        }

        if (!_options.TriageTenantId.HasValue || !_options.TriageTeamId.HasValue || !_options.SystemUserId.HasValue)
        {
            _logger.LogWarning("Intake triage settings incomplete — email intake disabled");
            return;
        }

        _logger.LogInformation(
            "IMAP intake enabled — polling {User}@{Host} every 60s",
            _options.EmailUser,
            _options.EmailHost);

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(60));
        await PollOnceAsync(stoppingToken);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await PollOnceAsync(stoppingToken);
        }
    }

    private async Task PollOnceAsync(CancellationToken cancellationToken)
    {
        var db = _redis.GetDatabase();
        var lockKey = "intake:leader";
        var acquired = await db.StringSetAsync(lockKey, Environment.MachineName, TimeSpan.FromSeconds(55), When.NotExists);
        if (!acquired)
        {
            return;
        }

        try
        {
            using var client = new ImapClient();
            await client.ConnectAsync(_options.EmailHost, _options.EmailPort, _options.EmailTls, cancellationToken);
            await client.AuthenticateAsync(_options.EmailUser, _options.EmailPassword, cancellationToken);
            var inbox = client.Inbox;
            await inbox.OpenAsync(FolderAccess.ReadWrite, cancellationToken);

            var uids = await inbox.SearchAsync(SearchQuery.NotSeen, cancellationToken);
            using var scope = _services.CreateScope();
            var intake = scope.ServiceProvider.GetRequiredService<IntakeService>();

            foreach (var uid in uids)
            {
                try
                {
                    var message = await inbox.GetMessageAsync(uid, cancellationToken);
                    var from = message.From.Mailboxes.FirstOrDefault();
                    var requesterEmail = from?.Address ?? "unknown@unknown.com";
                    var requesterName = from?.Name?.Trim();
                    if (string.IsNullOrWhiteSpace(requesterName))
                    {
                        requesterName = requesterEmail.Split('@')[0];
                    }

                    var subject = string.IsNullOrWhiteSpace(message.Subject) ? "(no subject)" : message.Subject.Trim();
                    var description = message.TextBody?.Trim();
                    if (string.IsNullOrWhiteSpace(description))
                    {
                        description = message.HtmlBody is null ? subject : StripHtml(message.HtmlBody);
                    }

                    await intake.ProcessInboundEmailAsync(
                        subject,
                        requesterEmail,
                        requesterName,
                        description.Length > 4000 ? description[..4000] : description,
                        cancellationToken);

                    await inbox.AddFlagsAsync(uid, MessageFlags.Seen, true, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to process inbound email uid={Uid}", uid);
                }
            }

            await client.DisconnectAsync(true, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "IMAP poll failed");
        }
        finally
        {
            await db.KeyDeleteAsync(lockKey);
        }
    }

    private static string StripHtml(string html) =>
        System.Text.RegularExpressions.Regex.Replace(html, "<[^>]*>", " ").Trim();
}
