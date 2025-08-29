#!/bin/bash

echo "🚀 Deploying TransferApp to VPS..."

# Stop existing containers
echo "📦 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Remove old images to force rebuild
echo "🧹 Cleaning up old images..."
docker system prune -f

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
echo "📊 Checking container status..."
docker-compose -f docker-compose.prod.yml ps

# Show logs
echo "📋 Container logs:"
docker-compose -f docker-compose.prod.yml logs --tail=20

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: http://your-vps-ip"
echo "🔍 Check logs with: docker-compose -f docker-compose.prod.yml logs -f"
