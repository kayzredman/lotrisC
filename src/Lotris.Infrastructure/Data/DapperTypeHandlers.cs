using System.Data;
using Dapper;

namespace Lotris.Infrastructure.Data;

/// <summary>
/// Registers Dapper type handlers required by Lotris (DateOnly params in analytics ETL, etc.).
/// </summary>
public static class DapperTypeHandlers
{
    private static bool _registered;

    public static void Register()
    {
        if (_registered)
        {
            return;
        }

        // Legacy dbo columns store GUIDs as VARCHAR(36); remove Dapper's native Guid map so
        // our handlers parse strings (and still accept uniqueidentifier values from analytics).
        SqlMapper.RemoveTypeMap(typeof(Guid));
        SqlMapper.RemoveTypeMap(typeof(Guid?));

        SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());
        SqlMapper.AddTypeHandler(new GuidTypeHandler());
        SqlMapper.AddTypeHandler(new NullableGuidTypeHandler());
        _registered = true;
    }

    private sealed class GuidTypeHandler : SqlMapper.TypeHandler<Guid>
    {
        public override void SetValue(IDbDataParameter parameter, Guid value) =>
            parameter.Value = SqlGuid.ToSql(value);

        public override Guid Parse(object value) =>
            value switch
            {
                Guid g => g,
                string s => SqlGuid.FromSql(s),
                _ => SqlGuid.FromSql(Convert.ToString(value) ?? string.Empty),
            };
    }

    private sealed class NullableGuidTypeHandler : SqlMapper.TypeHandler<Guid?>
    {
        public override void SetValue(IDbDataParameter parameter, Guid? value) =>
            parameter.Value = value.HasValue ? SqlGuid.ToSql(value.Value) : DBNull.Value;

        public override Guid? Parse(object value) =>
            value switch
            {
                null or DBNull => null,
                Guid g => g,
                string s when string.IsNullOrWhiteSpace(s) => null,
                string s => SqlGuid.FromSql(s),
                _ => SqlGuid.FromSql(Convert.ToString(value) ?? string.Empty),
            };
    }

    private sealed class DateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly>
    {
        public override void SetValue(IDbDataParameter parameter, DateOnly value) =>
            parameter.Value = value.ToDateTime(TimeOnly.MinValue);

        public override DateOnly Parse(object value) =>
            value switch
            {
                DateTime dt => DateOnly.FromDateTime(dt),
                DateOnly d => d,
                _ => DateOnly.FromDateTime(Convert.ToDateTime(value)),
            };
    }
}
