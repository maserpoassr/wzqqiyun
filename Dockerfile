# Build stage - 使用 Node 16 LTS (避免 OpenSSL 兼容性问题)
FROM node:16-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set NODE_OPTIONS for legacy OpenSSL support (just in case)
ENV NODE_OPTIONS=--openssl-legacy-provider

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create certificate directory (will be empty if no certs provided)
RUN mkdir -p /etc/nginx/certs

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose ports for HTTP and HTTPS
EXPOSE 80
EXPOSE 443

# Override nginx entrypoint completely
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
