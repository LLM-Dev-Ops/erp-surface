FROM node:20 AS builder

WORKDIR /app

# Install Python for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files for contracts package
COPY packages/contracts/package*.json ./packages/contracts/

# Copy package files for main app
COPY package*.json ./

# Install dependencies for contracts package
WORKDIR /app/packages/contracts
RUN npm ci

# Install dependencies for main app
WORKDIR /app
RUN npm ci

# Copy contracts package source and build it
COPY packages/contracts/ ./packages/contracts/
WORKDIR /app/packages/contracts
RUN npm run build

# Copy main app source files
WORKDIR /app
COPY tsconfig.build.json ./
COPY src/ ./src/
COPY common/ ./common/
COPY traces/ ./traces/

# Build TypeScript
RUN npx tsc -p tsconfig.build.json

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/contracts/package*.json ./packages/contracts/

# Install production deps for contracts
WORKDIR /app/packages/contracts
RUN npm ci --omit=dev --ignore-scripts

# Install production deps for main app
WORKDIR /app
RUN npm ci --omit=dev --ignore-scripts

# Copy built contracts
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/contracts/src/schemas ./packages/contracts/src/schemas

# Copy built main app
COPY --from=builder /app/dist ./dist

# Expose port
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["node", "dist/src/server.js"]
