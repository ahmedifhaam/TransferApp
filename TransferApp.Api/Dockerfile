FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["TransferApp.Api/TransferApp.Api.csproj", "TransferApp.Api/"]
COPY ["TransferApp.Domain/TransferApp.Domain.csproj", "TransferApp.Domain/"]
RUN dotnet restore "TransferApp.Api/TransferApp.Api.csproj"
COPY . .
WORKDIR "/src/TransferApp.Api"
RUN dotnet build "TransferApp.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "TransferApp.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "TransferApp.Api.dll"]

