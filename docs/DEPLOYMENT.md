# Deployment Guide

## Gomoku AI Auto-Play - Docker Deployment

This guide covers building and deploying the Gomoku AI application using Docker.

---

## Prerequisites

- Node.js 18+ (for building)
- Docker 20+ (for containerization)
- Git (for cloning)

---

## Quick Start

### 1. Build the Application

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist/` folder containing all static assets.

### 2. Build Docker Image

```bash
# Build the Docker image
docker build -t gomoku-ai:latest .
```

### 3. Run the Container

```bash
# Run on port 8080
docker run -d -p 8080:80 --name gomoku-ai gomoku-ai:latest

# Or run on port 80 (requires root/admin)
docker run -d -p 80:80 --name gomoku-ai gomoku-ai:latest
```

### 4. Access the Application

Open your browser to:
- Local: http://localhost:8080
- Network: http://YOUR_IP:8080

---

## Build Process Details

### npm install

Installs all dependencies from `package.json`:
- Vue 2 framework
- Vuex state management
- VUX UI components
- fast-check (property-based testing)
- Jest (unit testing)

### npm run build

Runs the Vue CLI build process:
1. Compiles Vue components
2. Bundles JavaScript with Webpack
3. Processes LESS stylesheets
4. Copies static assets (WASM files, fonts, images)
5. Generates optimized production build in `dist/`

**Output structure:**
```
dist/
├── build/
│   ├── rapfi-multi-simd128.wasm
│   ├── rapfi-multi.wasm
│   ├── rapfi-single-simd128.wasm
│   ├── rapfi-single.wasm
│   └── ... (JS files)
├── css/
├── fonts/
├── js/
├── lib/
├── index.html
└── favicon.png
```

---

## Docker Configuration

### Dockerfile

Multi-stage build for minimal image size:

```dockerfile
# Build stage - Node.js for npm build
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage - nginx for serving
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

Key configurations:

1. **WASM MIME Type**
   ```nginx
   types {
       application/wasm wasm;
   }
   ```

2. **CORS Headers for WASM Multi-threading**
   ```nginx
   add_header Cross-Origin-Embedder-Policy "require-corp" always;
   add_header Cross-Origin-Opener-Policy "same-origin" always;
   ```

3. **Gzip Compression**
   ```nginx
   gzip on;
   gzip_types ... application/wasm;
   ```

4. **Static Asset Caching**
   ```nginx
   location ~* \.(js|css|wasm)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

---

## Docker Commands Reference

### Build Commands

```bash
# Standard build
docker build -t gomoku-ai:latest .

# Build with no cache (clean build)
docker build --no-cache -t gomoku-ai:latest .

# Build with specific tag
docker build -t gomoku-ai:v1.0.0 .
```

### Run Commands

```bash
# Run in foreground (for debugging)
docker run -p 8080:80 gomoku-ai:latest

# Run in background (detached)
docker run -d -p 8080:80 --name gomoku-ai gomoku-ai:latest

# Run with auto-restart
docker run -d -p 8080:80 --restart unless-stopped --name gomoku-ai gomoku-ai:latest

# Run with resource limits
docker run -d -p 8080:80 --memory=256m --cpus=0.5 --name gomoku-ai gomoku-ai:latest
```

### Management Commands

```bash
# View running containers
docker ps

# View logs
docker logs gomoku-ai
docker logs -f gomoku-ai  # Follow logs

# Stop container
docker stop gomoku-ai

# Start stopped container
docker start gomoku-ai

# Restart container
docker restart gomoku-ai

# Remove container
docker rm gomoku-ai
docker rm -f gomoku-ai  # Force remove running container

# Remove image
docker rmi gomoku-ai:latest
```

---

## HTTPS Setup

### Option 1: Self-Signed Certificate (Development)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/CN=localhost"

# Run with SSL volume mount
docker run -d -p 443:443 \
  -v $(pwd)/ssl:/etc/nginx/ssl:ro \
  --name gomoku-ai gomoku-ai:latest
```

### Option 2: Let's Encrypt (Production)

1. Use a reverse proxy (nginx, Traefik, Caddy)
2. Configure SSL termination at the proxy
3. Forward HTTP traffic to the container

Example with Traefik:
```yaml
# docker-compose.yml
services:
  gomoku-ai:
    image: gomoku-ai:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.gomoku.rule=Host(`gomoku.example.com`)"
      - "traefik.http.routers.gomoku.tls.certresolver=letsencrypt"
```

### Option 3: Cloudflare (Recommended for Production)

1. Point your domain to Cloudflare
2. Enable "Full (strict)" SSL mode
3. Cloudflare handles SSL termination
4. Container runs on HTTP internally

---

## Environment Variables

The application is fully static and doesn't require environment variables.

However, you can customize nginx behavior:

```bash
# Custom nginx config
docker run -d -p 8080:80 \
  -v $(pwd)/custom-nginx.conf:/etc/nginx/nginx.conf:ro \
  gomoku-ai:latest
```

---

## Performance Tuning

### nginx Worker Processes

In `nginx.conf`:
```nginx
worker_processes auto;  # Auto-detect CPU cores
worker_connections 1024;  # Connections per worker
```

### Memory Optimization

The WASM engine uses SharedArrayBuffer for multi-threading. Memory usage:
- Single session: ~50-100MB
- Multiple tabs: Each tab has independent memory

### Caching Strategy

Static assets are cached for 1 year with immutable flag:
- WASM files: Cached indefinitely
- JS/CSS: Cached with content hash in filename
- HTML: Not cached (always fresh)

---

## Health Check

The nginx configuration includes a health endpoint:

```bash
curl http://localhost:8080/health
# Response: healthy
```

For Docker health checks:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost/health || exit 1
```

---

## Troubleshooting

### WASM Not Loading

1. Check browser console for errors
2. Verify CORS headers:
   ```bash
   curl -I http://localhost:8080/build/rapfi-multi-simd128.wasm
   # Should show:
   # Cross-Origin-Embedder-Policy: require-corp
   # Cross-Origin-Opener-Policy: same-origin
   # Content-Type: application/wasm
   ```

### SharedArrayBuffer Not Available

This error occurs when CORS headers are missing. Ensure nginx is configured correctly.

### Container Won't Start

```bash
# Check logs
docker logs gomoku-ai

# Common issues:
# - Port already in use: Change port mapping
# - Permission denied: Run with sudo or fix Docker permissions
```

### Slow Performance

1. Check if multi-threaded WASM is loading (browser DevTools → Network)
2. Verify CPU isn't throttled
3. Check container resource limits

---

## Production Checklist

- [ ] Build with `npm run build`
- [ ] Build Docker image
- [ ] Configure HTTPS (Let's Encrypt or Cloudflare)
- [ ] Set up domain DNS
- [ ] Configure firewall (allow 80/443)
- [ ] Set up monitoring (optional)
- [ ] Configure log rotation (optional)
- [ ] Set up backup strategy (optional - app is stateless)
- [ ] Test on multiple browsers
- [ ] Test on mobile devices
- [ ] Verify WASM loading with CORS headers
