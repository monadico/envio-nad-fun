# Dockerfile for Envio Indexer
FROM node:18-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy project files
COPY . .

# Run codegen to generate necessary files
RUN pnpm codegen

# Expose GraphQL port (Hasura) - Note: Hasura runs on 8082 externally, 8080 internally
EXPOSE 8082

# Start the indexer in production mode
CMD ["pnpm", "start"]
