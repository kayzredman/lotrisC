using System.Text;
using Lotris.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Lotris.Api.Auth;

public static class EntraAuthenticationExtensions
{
    public const string MicrosoftScheme = "Microsoft";

    public static IServiceCollection AddLotrisAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var jwtSecret = configuration["JWT_SECRET"]
            ?? configuration["Jwt:Secret"]
            ?? "dev-only-change-me-use-at-least-32-characters-long-secret";

        var entraSection = configuration.GetSection(EntraAuthOptions.SectionName);
        services.Configure<EntraAuthOptions>(entraSection);
        var entra = entraSection.Get<EntraAuthOptions>() ?? new EntraAuthOptions();

        var authBuilder = services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["Jwt:Issuer"] ?? "lotris",
                    ValidAudience = configuration["Jwt:Audience"] ?? "lotris-api",
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                    ClockSkew = TimeSpan.FromMinutes(1),
                };
            });

        if (entra.Enabled &&
            !string.IsNullOrWhiteSpace(entra.TenantId) &&
            !string.IsNullOrWhiteSpace(entra.ClientId) &&
            !string.IsNullOrWhiteSpace(entra.ClientSecret))
        {
            authBuilder
                .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
                {
                    options.Cookie.Name = "Lotris.Microsoft.Auth";
                    options.Cookie.HttpOnly = true;
                    options.Cookie.SameSite = SameSiteMode.Lax;
                    options.ExpireTimeSpan = TimeSpan.FromMinutes(5);
                })
                .AddOpenIdConnect(MicrosoftScheme, options =>
                {
                    options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                    options.Authority = $"https://login.microsoftonline.com/{entra.TenantId}/v2.0";
                    options.ClientId = entra.ClientId;
                    options.ClientSecret = entra.ClientSecret;
                    options.CallbackPath = entra.CallbackPath;
                    options.ResponseType = "code";
                    options.SaveTokens = false;
                    options.GetClaimsFromUserInfoEndpoint = true;
                    options.Scope.Clear();
                    options.Scope.Add("openid");
                    options.Scope.Add("profile");
                    options.Scope.Add("email");
                    options.TokenValidationParameters.NameClaimType = "name";
                });

            services.AddScoped<MicrosoftAuthService>();
        }

        return services;
    }
}
