namespace Lotris.Infrastructure.Data;

internal static class SqlGuid
{
    internal static string ToSql(Guid value) => value.ToString();

    internal static Guid FromSql(string value) => Guid.Parse(value);

    internal static Guid? FromSqlNullable(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : Guid.Parse(value);
}
