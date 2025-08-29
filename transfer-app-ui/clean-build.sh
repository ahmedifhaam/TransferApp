#!/bin/bash

echo "🧹 Cleaning Angular build artifacts..."

# Remove node_modules and package-lock.json
rm -rf node_modules
rm -f package-lock.json

# Remove Angular build output
rm -rf dist
rm -rf .angular

# Clear npm cache
npm cache clean --force

echo "📦 Reinstalling dependencies..."
npm install

echo "🔨 Building project..."
npm run build

echo "✅ Clean build complete!"
