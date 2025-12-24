# Build stage - 使用 Node 22 LTS
FROM node:22-alpine AS build

WORKDIR /app

# Set NODE_OPTIONS for OpenSSL legacy provider (required for webpack 4 with Node 22)
ENV NODE_OPTIONS=--openssl-legacy-provider

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps for Node 22 compatibility
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose ports for HTTP and HTTPS
EXPOSE 80
EXPOSE 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
