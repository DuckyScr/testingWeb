FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

RUN npm run build

# Expose the port your app runs on
EXPOSE 3000

# Start the application - use bash to execute the script
CMD ["sh", "./scripts/init.sh"]