#!/bin/bash

# Extract components from FLY_CONSUL_URL
# Format: https://:{TOKEN}@{HOST}/{PREFIX}/
TOKEN=$(echo "$FLY_CONSUL_URL" | sed -E 's|https://:([^@]+)@.+|\1|')
HOST=$(echo "$FLY_CONSUL_URL" | sed -E 's|https://[^@]+@([^/]+)/.+|\1|')
PREFIX=$(echo "$FLY_CONSUL_URL" | sed -E 's|https://[^@]+@[^/]+/(.+)/|\1|')
LITEFS_CONSUL_KEY='epic-stack-litefs/billing-saas'

# Execute consul kv delete command
consul kv delete \
  -http-addr="https://$HOST" \
  -token="$TOKEN" \
  "$PREFIX/$LITEFS_CONSUL_KEY"

# Optional: Add error handling
if [ $? -eq 0 ]; then
    echo "Successfully deleted key: $PREFIX/$LITEFS_CONSUL_KEY"
else
    echo "Failed to delete key"
    exit 1
fi
