#!/bin/bash

# Deploy script for Spreadsheet application
# This script copies files to production server and starts Docker Compose

set -e  # Exit on error

# Configuration
SSH_TARGET="${SSH_USER}@${SSH_HOST}"
SCP_TARGET="${SSH_USER}@[${SSH_HOST}]"
REMOTE_DIR="/root/spreadsheet"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🚀 Deploying Spreadsheet to production..."
echo "📍 Server: $SSH_TARGET"
echo "📂 Remote directory: $REMOTE_DIR"
echo ""

# Generate SSL certificates on production server
echo "🔒 Generating SSL certificates on production server..."
scp "$LOCAL_DIR/scripts/generate-cert.sh" "$SCP_TARGET:/tmp/"
ssh "$SSH_TARGET" "chmod +x /tmp/generate-cert.sh && /tmp/generate-cert.sh $REMOTE_DIR"

# Create remote directory
echo "📁 Creating remote directory..."
ssh "$SSH_TARGET" "mkdir -p $REMOTE_DIR"

# Copy essential files only (no source code - using published Docker images)
echo "📤 Copying deployment files to server..."

# Docker Compose config
echo "  → Docker Compose configuration"
scp "$LOCAL_DIR/compose.common.yml" \
    "$LOCAL_DIR/compose.prod.yml" \
    "$SCP_TARGET:$REMOTE_DIR/"

# Deployment folder (nginx, redis configs, etc)
echo "  → Deployment configs and scripts"
scp -r "$LOCAL_DIR/deployment" "$SCP_TARGET:$REMOTE_DIR/"

# Copy .env file to remote server
echo "  → Environment variables"
scp "$LOCAL_DIR/.env" "$SCP_TARGET:$REMOTE_DIR/"

echo ""
echo "✅ Files copied successfully!"
echo ""

# Start Docker Compose on remote server
echo "🐳 Starting Docker Compose on production server..."
ssh "$SSH_TARGET" "cd $REMOTE_DIR && source .env && docker compose -f compose.prod.yml pull && docker compose -f compose.prod.yml up -d"

# Show status
ssh "$SSH_TARGET" << ENDSSH
cd $REMOTE_DIR

# Show status
echo ""
echo "📊 Service status:"
docker compose -f compose.prod.yml ps

# Show logs
echo ""
echo "📝 Recent logs:"
docker compose -f compose.prod.yml logs --tail=20

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend:  https://docs.qshop.space"
echo "   API:       https://api.qshop.space"
echo "   Admin:     https://admin.qshop.space"
echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker compose logs -f"
echo "   Restart:       docker compose restart"
echo "   Stop:          docker compose down"
echo "   Rebuild:       docker compose up -d --build"
ENDSSH

echo ""
echo "🎉 Deployment finished!"
echo ""
echo "💡 To view logs:"
echo "   ssh $SSH_TARGET 'cd $REMOTE_DIR && docker compose -f compose.prod.yml logs -f'"
