namespace Lotris.Application.Intake;

public class IntakeOptions
{
    public const string SectionName = "Intake";

    public bool Enabled { get; set; }

    public Guid? SystemUserId { get; set; }

    public Guid? TriageTenantId { get; set; }

    public Guid? TriageTeamId { get; set; }

    public string? EmailHost { get; set; }

    public int EmailPort { get; set; } = 993;

    public bool EmailTls { get; set; } = true;

    public string? EmailUser { get; set; }

    public string? EmailPassword { get; set; }
}
