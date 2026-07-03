# Build stage — build context: repo root (see docker-compose.onprem.yml)
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

COPY src/Directory.Build.props ./
COPY src/Lotris.Domain/Lotris.Domain.csproj Lotris.Domain/
COPY src/Lotris.Contracts/Lotris.Contracts.csproj Lotris.Contracts/
COPY src/Lotris.Application/Lotris.Application.csproj Lotris.Application/
COPY src/Lotris.Infrastructure/Lotris.Infrastructure.csproj Lotris.Infrastructure/
COPY src/Lotris.Workers/Lotris.Workers.csproj Lotris.Workers/
COPY src/Lotris.Api/Lotris.Api.csproj Lotris.Api/

RUN dotnet restore Lotris.Api/Lotris.Api.csproj

COPY src/ .
RUN dotnet publish Lotris.Api/Lotris.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS final
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .
COPY packages/db/migrations/mssql ./LegacyMigrations
ENTRYPOINT ["dotnet", "Lotris.Api.dll"]
