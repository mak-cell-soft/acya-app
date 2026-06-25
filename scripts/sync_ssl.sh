#!/bin/bash
# /home/ubuntu/acya-app/scripts/sync_ssl.sh
set -e

# 1. Fetch active tenant slugs from the master database
SLUGS=$(sudo docker exec wood-app-postgres psql -U postgres -d wood-app-db -t -A -c 'SELECT DISTINCT "Slug" FROM public.bo_tbl_enterprise WHERE "IsActive" = true;')

# 2. Build the domain arguments list for Certbot
DOMAINS="-d acya.site -d www.acya.site -d admin.acya.site"
for slug in $SLUGS; do
  DOMAINS="$DOMAINS -d ${slug}.acya.site"
done

# 3. Request or keep the certificate
echo "Executing Certbot for: $DOMAINS"
OUTPUT=$(sudo certbot certonly --nginx --non-interactive --agree-tos --email admin@acya.site --keep-until-expiring --expand $DOMAINS 2>&1)

echo "$OUTPUT"

# 4. Reload Nginx if a new certificate was issued
if [[ ! "$OUTPUT" =~ "Certificate not yet due for renewal" ]]; then
  echo "New certificate obtained or expanded. Reloading Nginx..."
  sudo nginx -t && sudo systemctl reload nginx
else
  echo "No certificate changes. Nginx reload skipped."
fi
