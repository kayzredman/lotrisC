namespace Lotris.Application.Common;

public class BadRequestException : Exception
{
    public BadRequestException(string message) : base(message) { }
}

public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
}

public class ForbiddenException : Exception
{
    public ForbiddenException(string message) : base(message) { }
}

public class TooManyRequestsException : Exception
{
    public TooManyRequestsException(string message) : base(message) { }
}
