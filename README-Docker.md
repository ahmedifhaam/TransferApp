# TransferApp Docker Setup

This document describes how to run the TransferApp using Docker Compose with PostgreSQL, .NET API, and Angular UI served by nginx.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (usually included with Docker Desktop)

## Architecture

The application consists of three main services:

1. **PostgreSQL Database** - Stores all application data
2. **TransferApp API** - .NET 8 Web API backend
3. **Nginx + Angular UI** - Frontend application served by nginx

## Quick Start

1. **Clone and navigate to the project directory:**
   ```bash
   cd TransferApp
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - **Frontend**: http://localhost
   - **API**: http://localhost:5000
   - **Database**: localhost:5432

## Service Details

### PostgreSQL Database
- **Port**: 5432
- **Database**: transferapp
- **Username**: transferapp
- **Password**: transferapp123
- **Data Persistence**: Data is stored in a Docker volume

### TransferApp API
- **Port**: 5000
- **Framework**: .NET 8
- **Database**: Connects to PostgreSQL
- **Auto-restart**: Enabled

### Nginx + Angular UI
- **Port**: 80
- **Frontend**: Angular application
- **API Proxy**: Routes `/api/*` requests to the backend
- **Auto-restart**: Enabled

## Development

### Viewing Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs api
docker-compose logs postgres
docker-compose logs nginx
```

### Stopping Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This will delete all data)
docker-compose down -v
```

### Rebuilding Services
```bash
# Rebuild all services
docker-compose up --build

# Rebuild specific service
docker-compose up --build api
```

## Database Migrations

The API will automatically create the database schema on first run. If you need to run migrations manually:

```bash
# Connect to the API container
docker-compose exec api bash

# Run migrations (if needed)
dotnet ef database update
```

## Environment Variables

You can customize the setup by creating a `.env` file or modifying the `docker-compose.yml`:

- `POSTGRES_PASSWORD`: Database password
- `ASPNETCORE_ENVIRONMENT`: API environment (Production/Development)
- `ConnectionStrings__Default`: Database connection string

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 80, 5000, and 5432 are available
2. **Build failures**: Check that all source code is present and correct
3. **Database connection**: Verify PostgreSQL container is running and healthy

### Health Checks

```bash
# Check container status
docker-compose ps

# Check container health
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### Reset Everything

```bash
# Stop and remove everything
docker-compose down -v
docker system prune -f

# Start fresh
docker-compose up --build
```

## Production Considerations

For production deployment:

1. **Security**: Change default passwords
2. **SSL**: Configure HTTPS with proper certificates
3. **Backup**: Set up database backup strategies
4. **Monitoring**: Add health checks and monitoring
5. **Scaling**: Consider using Docker Swarm or Kubernetes for scaling

## Support

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Verify container status: `docker-compose ps`
3. Check network connectivity between containers
4. Ensure all required files are present in the build context


