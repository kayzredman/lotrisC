using Lotris.Api.Auth;
using Lotris.Application.Tasks;
using Lotris.Contracts.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/tasks")]
public sealed class TasksController : ControllerBase
{
    private readonly TaskService _tasks;

    public TasksController(TaskService tasks)
    {
        _tasks = tasks;
    }

    [HttpPost]
    [ProducesResponseType(typeof(TaskDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateTaskRequest request, CancellationToken cancellationToken)
    {
        var created = await _tasks.CreateAsync(HttpContext.GetLotrisSession(), request, cancellationToken);
        return CreatedAtAction(nameof(GetOne), new { id = created.Id }, created);
    }

    [HttpGet]
    [ProducesResponseType(typeof(TaskListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] TaskListQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _tasks.ListAsync(HttpContext.GetLotrisSession(), query, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(TaskDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOne(Guid id, CancellationToken cancellationToken)
    {
        return Ok(await _tasks.GetByIdAsync(HttpContext.GetLotrisSession(), id, cancellationToken));
    }

    [HttpPatch("{id:guid}")]
    [ProducesResponseType(typeof(TaskDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateTaskRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _tasks.UpdateAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken));
    }

    [HttpPost("{id:guid}/checklist")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> AddChecklistItem(
        Guid id,
        [FromBody] CreateChecklistItemRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _tasks.AddChecklistItemAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken));
    }

    [HttpPatch("{id:guid}/checklist/{itemId:guid}/toggle")]
    [ProducesResponseType(typeof(TaskDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ToggleChecklistItem(
        Guid id,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        return Ok(await _tasks.ToggleChecklistItemAsync(HttpContext.GetLotrisSession(), id, itemId, cancellationToken));
    }

    [HttpDelete("{id:guid}/checklist/{itemId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteChecklistItem(
        Guid id,
        Guid itemId,
        CancellationToken cancellationToken)
    {
        return Ok(await _tasks.DeleteChecklistItemAsync(HttpContext.GetLotrisSession(), id, itemId, cancellationToken));
    }

    [HttpPost("{id:guid}/assignees")]
    [ProducesResponseType(typeof(TaskDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AddAssignees(
        Guid id,
        [FromBody] AddAssigneesRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _tasks.AddAssigneesAsync(HttpContext.GetLotrisSession(), id, request, cancellationToken));
    }

    [HttpPost("{id:guid}/complete")]
    [ProducesResponseType(typeof(TaskDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkComplete(Guid id, CancellationToken cancellationToken)
    {
        return Ok(await _tasks.MarkAssignmentCompleteAsync(HttpContext.GetLotrisSession(), id, cancellationToken));
    }
}
