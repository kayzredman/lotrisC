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

        SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());
        _registered = true;
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
