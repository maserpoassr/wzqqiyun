# Production Deployment Setup

## Gomoku AI Auto-Play - Production Configuration

This guide covers setting up the application for production deployment.

---

## HTTPS Configuration

### Option 1: Let's Encrypt with Certbot

#### Prerequisites
- Domain name pointing to your server
- Port 80 and 443 open

#### Steps

1. **Install Certbot**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install certbot
   
   # CentOS/RHEL
   sudo yum install certbot
   ```

2. **Obtain Certificate**
   ```bash
   # Stop any service on port 80 first
   sudo certbot certonly --standalone -d gomoku.yourdomain.com
   ```

3. **Certificate Location**
   ```
   /etc/letsencrypt/live/gomoku.yourdomain.com/fullchain.pem
   /etc/letsencrypt/live/gomoku.yourdomain.com/privkey.pem
   ```

4. **Update nginx.conf**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name gomoku.yourdomain.com;
       
       ssl_certificate /etc/letsencrypt/live/gomoku.yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/gomoku.yourdomain.com/privkey.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
       ssl_prefer_server_ciphers off;
       
       # ... rest of config
   }
   
   # Redirect HTTP to HTTPS
   server {
       listen 80;
       server_name gomoku.yourdomain.com;
       return 301 https://$server_name$request_uri;
   }
   ```

5. **Run with SSL**
   ```bash
   docker run -d -p 80:80 -p 443:443 \
     -v /etc/letsencrypt:/etc/letsencrypt:ro \
     --name gomoku-ai gomoku-ai:latest
   ```

6. **Auto-Renewal**
   ```bash
   # Add to crontab
   0 0 1 * * certbot renew --quiet && docker restart gomoku-ai
   ```

### Option 2: Cloudflare (Recommended)

1. **Add Domain to Cloudflare**
   - Sign up at cloudflare.com
   - Add your domain
   - Update nameservers at your registrar

2. **Configure SSL**
   - Go to SSL/TLS settings
   - Set mode to "Full (strict)"
   - Enable "Always Use HTTPS"

3. **Create Origin Certificate**
   - Go to SSL/TLS → Origin Server
   - Create Certificate
   - Download cert and key

4. **Deploy with Origin Certificate**
   ```bash
   docker run -d -p 443:443 \
     -v $(pwd)/cloudflare-cert.pem:/etc/nginx/ssl/cert.pem:ro \
     -v $(pwd)/cloudflare-key.pem:/etc/nginx/ssl/key.pem:ro \
     --name gomoku-ai gomoku-ai:latest
   ```

---

## DNS Configuration

### A Record Setup

```
Type: A
Name: gomoku (or @ for root)
Value: YOUR_SERVER_IP
TTL: Auto or 300
```

### CNAME for www

```
Type: CNAME
Name: www
Value: gomoku.yourdomain.com
TTL: Auto
```

### Example DNS Records

```
gomoku.example.com    A      203.0.113.50
www.gomoku.example.com CNAME  gomoku.example.com
```

---

## Monitoring and Logging

### Docker Logging

```bash
# View logs
docker logs gomoku-ai

# Follow logs in real-time
docker logs -f gomoku-ai

# Limit log output
docker logs --tail 100 gomoku-ai
```

### Log Rotation

Create `/etc/docker/daemon.json`:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:
```bash
sudo systemctl restart docker
```

### Health Monitoring

#### Simple Health Check Script

```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="http://localhost:8080/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$RESPONSE" != "200" ]; then
    echo "Health check failed! Restarting container..."
    docker restart gomoku-ai
    # Optional: Send alert
    # curl -X POST "https://your-webhook-url" -d "Gomoku AI restarted"
fi
```

Add to crontab:
```bash
*/5 * * * * /path/to/health-check.sh
```

#### Docker Health Check

Add to Dockerfile or docker-compose:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

### Uptime Monitoring Services

- **UptimeRobot** (free) - uptimerobot.com
- **Pingdom** - pingdom.com
- **StatusCake** - statuscake.com

Configure to monitor:
- `https://gomoku.yourdomain.com` (main page)
- `https://gomoku.yourdomain.com/health` (health endpoint)

---

## Production Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  gomoku-ai:
    image: gomoku-ai:latest
    build: .
    container_name: gomoku-ai
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Commands:
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View logs
docker-compose logs -f
```

---

## Security Hardening

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Security Headers (Already in nginx.conf)

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Rate Limiting (Optional)

Add to nginx.conf:
```nginx
http {
    limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;
    
    server {
        location / {
            limit_req zone=one burst=20 nodelay;
            # ... rest of config
        }
    }
}
```

---

## Backup Strategy

The application is stateless - no user data is stored server-side.

### What to Backup

1. **Docker image** - Push to registry
   ```bash
   docker tag gomoku-ai:latest your-registry/gomoku-ai:latest
   docker push your-registry/gomoku-ai:latest
   ```

2. **Configuration files**
   - `nginx.conf`
   - `docker-compose.yml`
   - SSL certificates

3. **Source code** - Git repository

### Disaster Recovery

1. Pull image from registry (or rebuild)
2. Restore configuration files
3. Restore SSL certificates
4. Start container

---

## Performance Optimization

### CDN Integration

For global users, consider a CDN:

1. **Cloudflare** (recommended)
   - Free tier available
   - Automatic caching
   - DDoS protection

2. **AWS CloudFront**
   - Pay-per-use
   - Global edge locations

3. **Fastly**
   - Real-time purging
   - Edge computing

### Caching Strategy

Already configured in nginx.conf:
- Static assets: 1 year cache
- WASM files: 1 year cache
- HTML: No cache (always fresh)

### Compression

Already configured:
- Gzip enabled for text, JS, CSS, WASM
- Compression level 6 (balanced)

---

## Scaling Considerations

### Horizontal Scaling

The application is stateless, so horizontal scaling is straightforward:

1. **Load Balancer** - nginx, HAProxy, or cloud LB
2. **Multiple Containers** - Run on different ports/servers
3. **DNS Round Robin** - Simple multi-server setup

### Vertical Scaling

For single-server deployment:
- More CPU cores = faster WASM execution
- More RAM = more concurrent users
- SSD storage = faster static file serving

### Estimated Capacity

Per container (1 CPU, 512MB RAM):
- ~100 concurrent users
- ~1000 requests/second (static files)

---

## Production Checklist

### Pre-Deployment
- [ ] Domain registered and DNS configured
- [ ] SSL certificate obtained
- [ ] Firewall configured (80, 443 open)
- [ ] Docker installed and running
- [ ] Source code cloned

### Deployment
- [ ] `npm install` completed
- [ ] `npm run build` successful
- [ ] Docker image built
- [ ] Container running
- [ ] HTTPS working
- [ ] Health endpoint responding

### Post-Deployment
- [ ] Tested on Chrome
- [ ] Tested on Firefox
- [ ] Tested on Safari
- [ ] Tested on mobile (iOS, Android)
- [ ] WASM loading verified
- [ ] CORS headers verified
- [ ] Monitoring configured
- [ ] Log rotation configured
- [ ] Backup strategy documented

### Ongoing
- [ ] SSL certificate renewal scheduled
- [ ] Health checks running
- [ ] Logs being monitored
- [ ] Updates planned

---

## Support

For issues:
1. Check container logs: `docker logs gomoku-ai`
2. Check nginx error log: `docker exec gomoku-ai cat /var/log/nginx/error.log`
3. Verify CORS headers: `curl -I https://yourdomain.com/build/rapfi-multi-simd128.wasm`
4. Test health endpoint: `curl https://yourdomain.com/health`
