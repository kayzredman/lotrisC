namespace Lotris.Application.Analytics;

public static class AnalyticsWeekHelper
{
    public static string CurrentWeekKey(DateTime utcNow)
    {
        var d = utcNow;
        var jan1 = new DateTime(d.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var week = (int)Math.Ceiling(((d - jan1).TotalDays + jan1.DayOfWeek switch
        {
            DayOfWeek.Sunday => 1,
            _ => (int)jan1.DayOfWeek + 1,
        }) / 7.0);
        return $"{d.Year}-W{week:D2}";
    }

    public static DateOnly IsoWeekStart(DateTime utcNow)
    {
        var d = utcNow.Date;
        var diff = d.DayOfWeek == DayOfWeek.Sunday ? -6 : DayOfWeek.Monday - d.DayOfWeek;
        return DateOnly.FromDateTime(d.AddDays(diff));
    }

    public static decimal ComputeSlaCompliancePct(int totalTickets, int breachCount) =>
        totalTickets > 0
            ? Math.Round((decimal)(totalTickets - breachCount) / totalTickets * 100m, 2)
            : 100m;
}
