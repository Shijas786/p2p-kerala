FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build step (optional if using tsx, but good for error checking)
RUN npm run build

# Command to run the bot
# Using tsx for simplicity, or npm run serve if built
CMD ["npm", "run", "start"]
