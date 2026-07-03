namespace Lotris.Domain.Tickets;

public static class HistoryEvent
{
    public const string Created = "CREATED";
    public const string StatusChanged = "STATUS_CHANGED";
    public const string Assigned = "ASSIGNED";
    public const string Reassigned = "REASSIGNED";
    public const string TeamAssigned = "TEAM_ASSIGNED";
    public const string Escalated = "ESCALATED";
    public const string CommentAdded = "COMMENT_ADDED";
    public const string AttachmentAdded = "ATTACHMENT_ADDED";
    public const string FieldEdited = "FIELD_EDITED";
    public const string SlaPickupBreached = "SLA_PICKUP_BREACHED";
    public const string SlaResolutionBreached = "SLA_RESOLUTION_BREACHED";
    public const string PickupSlaBreached = "PICKUP_SLA_BREACHED";
    public const string ResolutionSlaBreached = "RESOLUTION_SLA_BREACHED";
    public const string AutoAssigned = "AUTO_ASSIGNED";
}
