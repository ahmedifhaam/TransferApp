#!/bin/bash

echo "🚀 Deploying TransferApp to VPS..."

# Set default admin credentials if not already set
if [ -z "$ADMIN_USERNAME" ]; then
    export ADMIN_USERNAME="admin"
    echo "🔑 Setting default ADMIN_USERNAME: $ADMIN_USERNAME"
fi

if [ -z "$ADMIN_PASSWORD" ]; then
    # Generate a secure random password
    export ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-16)
    echo "🔑 Generated secure ADMIN_PASSWORD: $ADMIN_PASSWORD"
fi

# Set other default environment variables
export POSTGRES_DB=${POSTGRES_DB:-transferapp}
export POSTGRES_USER=${POSTGRES_USER:-transferapp}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-transferapp123}
export POSTGRES_PORT=${POSTGRES_PORT:-5432}
export API_PORT=${API_PORT:-5000}
export NGINX_PORT=${NGINX_PORT:-80}

# Create .env file with all credentials
echo "📝 Creating .env file with credentials..."
cat > .env << EOF
# Database Configuration
POSTGRES_DB=$POSTGRES_DB
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_PORT=$POSTGRES_PORT

# API Configuration
API_PORT=$API_PORT

# Nginx Configuration
NGINX_PORT=$NGINX_PORT

# Admin Configuration - AUTO-GENERATED!
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD=$ADMIN_PASSWORD

# Domain Configuration (update with your actual domain)
DOMAIN=transfer.xellabs.site
EOF

echo "🔐 Admin credentials saved to .env file:"
echo "   Username: $ADMIN_USERNAME"
echo "   Password: $ADMIN_PASSWORD"
echo "⚠️  IMPORTANT: Save these credentials securely!"

# Stop existing containers
echo "📦 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Remove old images to force rebuild
echo "🧹 Cleaning up old images..."
docker system prune -f

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for containers to start
echo "⏳ Waiting for containers to start..."
sleep 10

# Check status
echo "📊 Checking container status..."
docker-compose -f docker-compose.prod.yml ps

# Test API endpoints
echo "🧪 Testing API endpoints..."
echo "Testing health endpoint..."
docker exec transferapp-api-prod curl -f http://localhost:5000/health || echo "❌ Health endpoint failed"

echo "Testing admin login endpoint..."
docker exec transferapp-api-prod curl -X POST http://localhost:5000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}" || echo "❌ Admin login failed"

# Show logs
echo "📋 Container logs:"
docker-compose -f docker-compose.prod.yml logs --tail=20

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: http://your-vps-ip"
echo "🔑 Admin credentials: Username=$ADMIN_USERNAME, Password=$ADMIN_PASSWORD"
echo "⚠️  SAVE THESE CREDENTIALS - they won't be shown again!"
echo "🔍 Check logs with: docker-compose -f docker-compose.prod.yml logs -f"
