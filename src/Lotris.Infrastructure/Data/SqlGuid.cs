namespace Lotris.Infrastructure.Data;

internal static class SqlGuid
{
    internal static string ToSql(Guid value) => value.ToString();

    internal static Guid FromSql(string value) => Guid.Parse(value);
}
