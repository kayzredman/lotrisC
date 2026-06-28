using Lotris.Application.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Lotris.Api.Filters;

public sealed class LotrisExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var (statusCode, message) = context.Exception switch
        {
            BadRequestException ex => (StatusCodes.Status400BadRequest, ex.Message),
            NotFoundException ex => (StatusCodes.Status404NotFound, ex.Message),
            ForbiddenException ex => (StatusCodes.Status403Forbidden, ex.Message),
            TooManyRequestsException ex => (StatusCodes.Status429TooManyRequests, ex.Message),
            UnauthorizedAccessException ex => (StatusCodes.Status401Unauthorized, ex.Message),
            _ => (0, string.Empty),
        };

        if (statusCode == 0)
        {
            return;
        }

        context.Result = new ObjectResult(new { message }) { StatusCode = statusCode };
        context.ExceptionHandled = true;
    }
}
