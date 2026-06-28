using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Lotris.Api.OpenApi;

/// <summary>
/// Maps Guid/Guid? to OpenAPI string uuid — avoids schema generation failures.
/// </summary>
public sealed class GuidSchemaTransformer : IOpenApiSchemaTransformer
{
    public Task TransformAsync(OpenApiSchema schema, OpenApiSchemaTransformerContext context, CancellationToken cancellationToken)
    {
        var type = context.JsonTypeInfo.Type;
        if (type == typeof(Guid) || type == typeof(Guid?))
        {
            schema.Type = JsonSchemaType.String;
            schema.Format = "uuid";
            schema.Properties?.Clear();
        }

        return Task.CompletedTask;
    }
}
