#!/bin/sh

# Replace environment variables in built JS files
# This allows one build to work in multiple environments (12-factor compliant)

set -e

# Default values
: ${VITE_API_URL:=http://localhost:4000}

echo "Injecting runtime configuration..."
echo "  VITE_API_URL: $VITE_API_URL"

# Find all JS files and replace the placeholder
find /usr/share/nginx/html/assets -type f -name '*.js' -exec sed -i \
  "s|__VITE_API_URL__|$VITE_API_URL|g" {} \;

echo "Configuration injected successfully"

# Start nginx
exec nginx -g 'daemon off;'
