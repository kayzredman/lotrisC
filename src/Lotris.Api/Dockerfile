# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY Lotris.Domain/Lotris.Domain.csproj Lotris.Domain/
COPY Lotris.Contracts/Lotris.Contracts.csproj Lotris.Contracts/
COPY Lotris.Application/Lotris.Application.csproj Lotris.Application/
COPY Lotris.Infrastructure/Lotris.Infrastructure.csproj Lotris.Infrastructure/
COPY Lotris.Workers/Lotris.Workers.csproj Lotris.Workers/
COPY Lotris.Api/Lotris.Api.csproj Lotris.Api/

RUN dotnet restore Lotris.Api/Lotris.Api.csproj

COPY . .
RUN dotnet publish Lotris.Api/Lotris.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Lotris.Api.dll"]
