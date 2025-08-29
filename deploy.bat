@echo off
echo 🚀 Deploying TransferApp to VPS...

REM Set default admin credentials if not already set
if "%ADMIN_USERNAME%"=="" (
    set ADMIN_USERNAME=admin
    echo 🔑 Setting default ADMIN_USERNAME: %ADMIN_USERNAME%
)

if "%ADMIN_PASSWORD%"=="" (
    REM Generate a simple password for Windows (you can change this)
    set ADMIN_PASSWORD=Admin123!
    echo 🔑 Setting default ADMIN_PASSWORD: %ADMIN_PASSWORD%
)

REM Set other default environment variables
set POSTGRES_DB=transferapp
set POSTGRES_USER=transferapp
set POSTGRES_PASSWORD=transferapp123
set POSTGRES_PORT=5432
set API_PORT=5000
set NGINX_PORT=80

REM Create .env file with all credentials
echo 📝 Creating .env file with credentials...
(
echo # Database Configuration
echo POSTGRES_DB=%POSTGRES_DB%
echo POSTGRES_USER=%POSTGRES_USER%
echo POSTGRES_PASSWORD=%POSTGRES_PASSWORD%
echo POSTGRES_PORT=%POSTGRES_PORT%
echo.
echo # API Configuration
echo API_PORT=%API_PORT%
echo.
echo # Nginx Configuration
echo NGINX_PORT=%NGINX_PORT%
echo.
echo # Admin Configuration - AUTO-GENERATED!
echo ADMIN_USERNAME=%ADMIN_USERNAME%
echo ADMIN_PASSWORD=%ADMIN_PASSWORD%
echo.
echo # Domain Configuration (update with your actual domain)
echo DOMAIN=transfer.xellabs.site
) > .env

echo 🔐 Admin credentials saved to .env file:
echo    Username: %ADMIN_USERNAME%
echo    Password: %ADMIN_PASSWORD%
echo ⚠️  IMPORTANT: Save these credentials securely!

REM Stop existing containers
echo 📦 Stopping existing containers...
docker-compose -f docker-compose.prod.yml down

REM Remove old images to force rebuild
echo 🧹 Cleaning up old images...
docker system prune -f

REM Build and start containers
echo 🔨 Building and starting containers...
docker-compose -f docker-compose.prod.yml up -d --build

REM Wait for containers to start
echo ⏳ Waiting for containers to start...
timeout /t 10 /nobreak >nul

REM Check status
echo 📊 Checking container status...
docker-compose -f docker-compose.prod.yml ps

REM Show logs
echo 📋 Container logs:
docker-compose -f docker-compose.prod.yml logs --tail=20

echo ✅ Deployment complete!
echo 🌐 Your app should be available at: http://your-vps-ip
echo 🔑 Admin credentials: Username=%ADMIN_USERNAME%, Password=%ADMIN_PASSWORD%
echo ⚠️  SAVE THESE CREDENTIALS - they won't be shown again!
echo 🔍 Check logs with: docker-compose -f docker-compose.prod.yml logs -f

pause
