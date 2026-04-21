FROM node:20-slim

WORKDIR /app

# Install dependencies for main project
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . .

# Build the miniapp
WORKDIR /app/miniapp
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps
RUN npm install @rollup/rollup-linux-x64-gnu --no-save || true
RUN npm run build


# Build the backend
WORKDIR /app
RUN npm run build

# Expose port
EXPOSE 8000

# Start the server
CMD ["node", "--max-old-space-size=384", "dist/index.js"]

