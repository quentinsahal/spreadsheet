#!/bin/sh

# Redis entrypoint - generate ACL file from environment variables at runtime

set -e

# Create redis config directory if it doesn't exist
mkdir -p /etc/redis

# Generate ACL file from environment variables (only in container memory)
cat > /etc/redis/users.acl << EOF
user admin on >${REDIS_PASSWORD} +@all ~* &*
user readonly on >${REDIS_READONLY_PASSWORD} +@read ~*
EOF

# Start Redis with ACL file and requirepass
exec redis-server /usr/local/etc/redis/redis.conf \
  --requirepass "${REDIS_PASSWORD}" \
  --aclfile /etc/redis/users.acl \
  "$@"
