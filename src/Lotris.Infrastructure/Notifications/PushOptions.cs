namespace Lotris.Infrastructure.Notifications;

public sealed class PushOptions
{
    public const string SectionName = "Push";

    /// <summary>When false, push sends are logged only (dev default).</summary>
    public bool Enabled { get; set; }

    /// <summary>Expo push API (works with Expo Go tokens in dev).</summary>
    public string ExpoPushUrl { get; set; } = "https://exp.host/--/api/v2/push/send";

    /// <summary>Android notification channel id — must match mobile app.</summary>
    public string AndroidChannelId { get; set; } = "lotris-pager-alerts";
}
