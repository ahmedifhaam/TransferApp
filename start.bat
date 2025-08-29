@echo off
REM TransferApp Docker Startup Script for Windows
REM This script helps you start the TransferApp with Docker Compose

echo 🚀 Starting TransferApp...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ docker-compose is not available. Please install Docker Compose.
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ⚠️  Please edit .env file with your secure passwords before continuing.
    echo Press any key when ready to continue...
    pause >nul
)

REM Build and start services
echo 🔨 Building and starting services...
docker-compose -f docker-compose.prod.yml up --build -d

REM Wait for services to be healthy
echo ⏳ Waiting for services to be healthy...
timeout /t 10 /nobreak >nul

REM Check service status
echo 📊 Service Status:
docker-compose -f docker-compose.prod.yml ps

echo.
echo ✅ TransferApp is starting up!
echo 🌐 Frontend: http://localhost
echo 🔌 API: http://localhost:5000
echo 🗄️  Database: localhost:5432
echo.
echo 📋 To view logs: docker-compose -f docker-compose.prod.yml logs -f
echo 🛑 To stop: docker-compose -f docker-compose.prod.yml down
echo.
pause


