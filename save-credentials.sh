#!/bin/bash

echo "🔐 Saving TransferApp Admin Credentials..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Run deploy.sh first!"
    exit 1
fi

# Extract admin credentials from .env file
ADMIN_USERNAME=$(grep "^ADMIN_USERNAME=" .env | cut -d'=' -f2)
ADMIN_PASSWORD=$(grep "^ADMIN_PASSWORD=" .env | cut -d'=' -f2)

if [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo "❌ Admin credentials not found in .env file!"
    exit 1
fi

# Create credentials backup file
CREDS_FILE="transferapp-credentials.txt"
cat > "$CREDS_FILE" << EOF
===========================================
    TRANSFERAPP ADMIN CREDENTIALS
===========================================

🌐 Application URL: https://transfer.xellabs.site
🔑 Admin Username: $ADMIN_USERNAME
🔑 Admin Password: $ADMIN_PASSWORD

📅 Generated on: $(date)
⚠️  Keep this file secure and private!

===========================================
EOF

echo "✅ Credentials saved to: $CREDS_FILE"
echo "🔐 Username: $ADMIN_USERNAME"
echo "🔐 Password: $ADMIN_PASSWORD"
echo "⚠️  IMPORTANT: Save these credentials securely!"
echo "📁 Credentials file: $CREDS_FILE"

# Make the file readable only by owner
chmod 600 "$CREDS_FILE"
echo "🔒 File permissions set to owner-only read/write"
