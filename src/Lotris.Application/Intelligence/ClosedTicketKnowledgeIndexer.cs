namespace Lotris.Application.Intelligence;

public sealed class ClosedTicketKnowledgeIndexer
{
    private readonly IIntelligenceRepository _repo;
    private readonly KnowledgeIngestionService _ingestion;

    public ClosedTicketKnowledgeIndexer(IIntelligenceRepository repo, KnowledgeIngestionService ingestion)
    {
        _repo = repo;
        _ingestion = ingestion;
    }

    public async Task TryIngestAsync(
        Guid tenantId,
        Guid ticketId,
        string title,
        string? description,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var config = await _repo.GetOrCreateConfigAsync(tenantId, cancellationToken);
            if (!config.FeatureAutoIndexTickets)
            {
                return;
            }

            await _ingestion.IngestClosedTicketAsync(tenantId, ticketId, title, description, cancellationToken);
        }
        catch
        {
            // Indexing is best-effort; ticket close must not fail.
        }
    }
}
