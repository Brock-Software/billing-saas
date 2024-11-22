#!/bin/bash

bucket="billing-saas"
app="billing-saas"
vm_id="your_app_machine_id"

# Get the latest backup file from S3
LATEST_BACKUP=$(aws s3 ls s3://$bucket --endpoint-url https://fly.storage.tigris.dev | sort | tail -n 1 | awk '{print $4}')
aws s3 cp s3://$bucket/$LATEST_BACKUP restored.db.gz --endpoint-url https://fly.storage.tigris.dev
gunzip restored.db.gz
litefs import --name sqlite.db --url http://$vm_id.vm.$app.internal:20202 restored.db
rm restored.db
