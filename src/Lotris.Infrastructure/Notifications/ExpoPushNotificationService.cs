using System.Net.Http.Json;
using Lotris.Application.Notifications;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Lotris.Infrastructure.Notifications;

public sealed class ExpoPushNotificationService : IPushNotificationService
{
    private readonly IDeviceTokenRepository _devices;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly PushOptions _options;
    private readonly ILogger<ExpoPushNotificationService> _logger;

    public ExpoPushNotificationService(
        IDeviceTokenRepository devices,
        IHttpClientFactory httpClientFactory,
        IOptions<PushOptions> options,
        ILogger<ExpoPushNotificationService> logger)
    {
        _devices = devices;
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendPagerAsync(PagerPushMessage message, CancellationToken cancellationToken = default)
    {
        var tokens = await _devices.ListActiveForUserAsync(message.UserId, cancellationToken);
        if (tokens.Count == 0)
        {
            _logger.LogDebug("No device tokens for user {UserId} — skip push {Type}", message.UserId, message.EventType);
            return;
        }

        var title = message.Title ?? BuildTitle(message.EventType);
        var body = BuildBody(message);
        var payload = new
        {
            ticketId = message.TicketId?.ToString(),
            eventType = message.EventType,
            ticketRef = message.TicketRef,
        };

        foreach (var device in tokens)
        {
            if (!IsExpoToken(device))
            {
                _logger.LogInformation(
                    "Native push ({Platform}) not configured — token stored for user {UserId}",
                    device.Platform,
                    message.UserId);
                continue;
            }

            var pushBody = new
            {
                to = device.Token,
                title,
                body,
                sound = "default",
                priority = "high",
                channelId = _options.AndroidChannelId,
                data = payload,
            };

            if (!_options.Enabled)
            {
                _logger.LogInformation(
                    "Push (dry-run) user={UserId} type={Type} body={Body}",
                    message.UserId,
                    message.EventType,
                    body);
                continue;
            }

            try
            {
                var client = _httpClientFactory.CreateClient("expo-push");
                using var response = await client.PostAsJsonAsync(_options.ExpoPushUrl, pushBody, cancellationToken);
                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Expo push failed ({Status}): {Body}", response.StatusCode, json);
                }
                else
                {
                    _logger.LogInformation("Expo push sent user={UserId} type={Type}", message.UserId, message.EventType);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Expo push error user={UserId}", message.UserId);
            }
        }
    }

    private static bool IsExpoToken(DeviceTokenRecord device) =>
        device.Platform.Equals("expo", StringComparison.OrdinalIgnoreCase)
        || device.Token.StartsWith("ExponentPushToken", StringComparison.Ordinal);

    private static string BuildTitle(string eventType) => eventType switch
    {
        "TICKET_ASSIGNED" => "Ticket assigned",
        "TICKET_ESCALATED" => "Ticket escalated",
        "SLA_WARNING" => "SLA warning",
        _ => "Lotris Pager",
    };

    private static string BuildBody(PagerPushMessage message)
    {
        if (!string.IsNullOrWhiteSpace(message.TicketRef))
        {
            return message.TicketRef;
        }

        return message.EventType switch
        {
            "SLA_WARNING" => "SLA breach imminent",
            _ => "Open Lotris Pager",
        };
    }
}
