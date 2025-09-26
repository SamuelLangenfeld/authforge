# Use Node.js LTS
FROM node:24.8.0

# Set working directory
WORKDIR /src/app

# Copy package.json first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy rest of the app
COPY . .

# Expose backend port
EXPOSE 3000

# Build production bundle
RUN npm run build

# Run the server
CMD ["npm", "start"]
