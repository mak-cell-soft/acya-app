FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY ["ms.webapp.api.acya/ms.webapp.api.acya/ms.webapp.api.acya.csproj", "ms.webapp.api.acya/ms.webapp.api.acya/"]
COPY ["ms.webapp.api.acya.core/ms.webapp.api.acya.core.csproj", "ms.webapp.api.acya.core/"]
COPY ["ms.webapp.api.acya.infrastructure/ms.webapp.api.acya.infrastructure.csproj", "ms.webapp.api.acya.infrastructure/"]
COPY ["ms.webapp.api.acya.common/ms.webapp.api.acya.common.csproj", "ms.webapp.api.acya.common/"]
RUN dotnet restore "ms.webapp.api.acya/ms.webapp.api.acya/ms.webapp.api.acya.csproj"
COPY . .
WORKDIR "/src/ms.webapp.api.acya/ms.webapp.api.acya"
RUN dotnet build "ms.webapp.api.acya.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "ms.webapp.api.acya.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ms.webapp.api.acya.dll"]
