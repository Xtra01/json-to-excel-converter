# Simple Next.js development container
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Fix permissions
RUN chmod +x node_modules/.bin/next

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]