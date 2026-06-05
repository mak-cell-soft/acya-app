#!/bin/bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak
sudo cp /etc/nginx/sites-available/migration /etc/nginx/sites-available/migration.bak

# Update default (acya.site) to point to port 5000
sudo sed -i 's/proxy_pass http:\/\/localhost:4000;/proxy_pass http:\/\/localhost:5000;/g' /etc/nginx/sites-available/default

# Update migration to be old.acya.site, pointing to port 4000, and remove ssl for now (so nginx doesn't crash if certs are missing)
cat << 'EON' | sudo tee /etc/nginx/sites-available/migration > /dev/null
server {
    server_name old.acya.site www.old.acya.site;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 80;
}
EON

sudo nginx -t && sudo systemctl reload nginx
