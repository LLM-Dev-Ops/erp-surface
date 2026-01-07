FROM node:20 AS builder

WORKDIR /app

# Install Python for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source files
COPY tsconfig.build.json ./
COPY src/ ./src/
COPY common/ ./common/
COPY traces/ ./traces/

# Build TypeScript
RUN npx tsc -p tsconfig.build.json

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["node", "dist/src/server.js"]
