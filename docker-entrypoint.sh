#!/bin/sh
set -e

# Check if SSL certificates exist
if [ ! -f /etc/nginx/certs/tls.crt ] || [ ! -f /etc/nginx/certs/tls.key ]; then
    echo "SSL certificates not found, disabling HTTPS server block..."
    
    # Create a temporary nginx config without HTTPS
    cat > /etc/nginx/nginx.conf.tmp << 'EOF'
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    types {
        application/wasm wasm;
    }

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1000;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/x-javascript
        application/json
        application/xml
        application/xml+rss
        application/wasm
        image/svg+xml;

    server {
        listen 80;
        listen [::]:80;
        server_name localhost;

        root /usr/share/nginx/html;
        index index.html;

        add_header Cross-Origin-Embedder-Policy "require-corp" always;
        add_header Cross-Origin-Opener-Policy "same-origin" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Cross-Origin-Embedder-Policy "require-corp" always;
            add_header Cross-Origin-Opener-Policy "same-origin" always;
        }

        location ~* \.wasm$ {
            types { application/wasm wasm; }
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Cross-Origin-Embedder-Policy "require-corp" always;
            add_header Cross-Origin-Opener-Policy "same-origin" always;
        }

        location ~* \.data$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Cross-Origin-Embedder-Policy "require-corp" always;
            add_header Cross-Origin-Opener-Policy "same-origin" always;
            proxy_read_timeout 300;
            proxy_connect_timeout 300;
            proxy_send_timeout 300;
        }

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF
    mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf
else
    echo "SSL certificates found, using HTTPS configuration..."
fi

exec "$@"
