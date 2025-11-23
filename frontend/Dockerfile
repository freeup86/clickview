# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:18-alpine AS builder

ARG VITE_API_URL

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
# Don't set NODE_ENV=production yet, as it causes npm ci to skip devDependencies
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Build application with production optimizations
# Set NODE_ENV=production only for the build step
ENV VITE_API_URL=$VITE_API_URL
ENV NODE_ENV=development
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
