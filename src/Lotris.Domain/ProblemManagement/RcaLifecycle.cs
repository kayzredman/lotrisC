namespace Lotris.Domain.ProblemManagement;

public static class RcaLifecycle
{
    private static readonly Dictionary<string, HashSet<string>> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        [RcaStatus.Draft] = [RcaStatus.InReview, RcaStatus.Archived],
        [RcaStatus.InReview] = [RcaStatus.Draft, RcaStatus.Approved],
        [RcaStatus.Approved] = [RcaStatus.Published, RcaStatus.Draft],
        [RcaStatus.Published] = [RcaStatus.Archived],
        [RcaStatus.Archived] = [],
    };

    public static void AssertTransition(string from, string to)
    {
        if (!IsTransitionAllowed(from, to))
        {
            throw new InvalidOperationException($"Invalid RCA status transition: {from} → {to}");
        }
    }

    public static bool IsTransitionAllowed(string from, string to) =>
        Allowed.TryGetValue(from, out var targets) && targets.Contains(to);
}
