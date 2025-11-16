#!/bin/bash

# Generate Let's Encrypt wildcard certificate for *.qshop.space
# Requires DNS validation (you'll need to add TXT record)

set -e

# Determine project directory (either /root/spreadsheet or current dir)
PROJECT_DIR="${1:-/root/spreadsheet}"

echo "🔒 Generating Let's Encrypt wildcard certificate for *.qshop.space"
echo "📂 Project directory: $PROJECT_DIR"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    apt update
    apt install -y certbot
fi

# Create certs directory
mkdir -p "$PROJECT_DIR/certs"

# Check if certificates already exist
if [ -f "$PROJECT_DIR/certs/fullchain.pem" ]; then
    echo "✅ Certificates already exist at $PROJECT_DIR/certs/"
    echo "   Skipping generation. Use 'certbot renew' to update."
    exit 0
fi

echo "📝 Starting certificate generation..."
echo "⚠️  You'll need to add a DNS TXT record when prompted"
echo ""

# Generate wildcard certificate
certbot certonly \
  --manual \
  --preferred-challenges dns \
  --email admin@qshop.space \
  --agree-tos \
  --no-eff-email \
  -d "*.qshop.space" \
  -d "qshop.space"

# Copy certificates to project directory
echo ""
echo "📋 Copying certificates to $PROJECT_DIR/certs/"
cp /etc/letsencrypt/live/qshop.space/fullchain.pem "$PROJECT_DIR/certs/"
cp /etc/letsencrypt/live/qshop.space/privkey.pem "$PROJECT_DIR/certs/"
chmod 644 "$PROJECT_DIR/certs/fullchain.pem"
chmod 600 "$PROJECT_DIR/certs/privkey.pem"

echo ""
echo "✅ Certificates generated and copied to $PROJECT_DIR/certs/"
echo ""
echo "📅 Certificate expires in 90 days"
echo "🔄 Renewal command: certbot renew && cp /etc/letsencrypt/live/qshop.space/*.pem $PROJECT_DIR/certs/"
echo ""
echo "🎉 Ready for production deployment!"

