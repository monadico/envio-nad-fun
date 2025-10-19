# Deploying Envio Indexer to Coolify

This guide walks you through deploying the Nadfun Analytics indexer to a VPS using Coolify.

## Prerequisites

- Coolify installed on your VPS
- Git repository with this code (GitHub, GitLab, etc.)
- Access to Coolify dashboard

## Architecture Overview

The application consists of 3 services:
1. **PostgreSQL** - Database for indexed data
2. **Hasura GraphQL Engine** - GraphQL API layer
3. **Envio Indexer** - Blockchain indexer application

## Deployment Options

### Option 1: Docker Compose (Recommended)

Coolify can deploy the entire stack using the existing `docker-compose.yaml` file.

#### Steps:

1. **Create a New Project in Coolify**
   - Go to your Coolify dashboard
   - Click "New Resource" → "Docker Compose"

2. **Connect Your Repository**
   - Select your Git provider (GitHub/GitLab/etc.)
   - Choose the repository with this code
   - Select the `envio` branch

3. **Configure Docker Compose**
   - Set the Docker Compose file path: `generated/docker-compose.yaml`
   - Or use the root if you create a combined docker-compose (see below)

4. **Set Environment Variables**
   ```
   ENVIO_PG_PORT=5433
   ENVIO_PG_USER=postgres
   ENVIO_PG_PASSWORD=<your-secure-password>
   ENVIO_PG_DATABASE=envio-production
   HASURA_EXTERNAL_PORT=8082
   HASURA_GRAPHQL_ADMIN_SECRET=<your-secure-admin-secret>
   HASURA_GRAPHQL_ENABLE_CONSOLE=true
   HASURA_GRAPHQL_UNAUTHORIZED_ROLE=public
   ```

5. **Deploy**
   - Click "Deploy"
   - Coolify will build and start all services

### Option 2: Separate Services

Deploy each component as a separate service in Coolify.

#### Service 1: PostgreSQL Database

1. Create a new PostgreSQL database in Coolify
   - Go to "New Resource" → "Database" → "PostgreSQL"
   - Version: 17.5
   - Database name: `envio-production`
   - Username: `postgres`
   - Save the connection details

#### Service 2: Hasura GraphQL Engine

1. Create a new service
   - Type: Docker Image
   - Image: `hasura/graphql-engine:v2.43.0`
   - Port: 8082

2. Environment Variables:
   ```
   HASURA_GRAPHQL_DATABASE_URL=postgres://postgres:<password>@<postgres-service>:5432/envio-production
   HASURA_GRAPHQL_ENABLE_CONSOLE=true
   HASURA_GRAPHQL_ADMIN_SECRET=<your-admin-secret>
   HASURA_GRAPHQL_STRINGIFY_NUMERIC_TYPES=true
   HASURA_GRAPHQL_UNAUTHORIZED_ROLE=public
   ```

#### Service 3: Envio Indexer

1. Create a new service
   - Type: Git Repository
   - Repository: Your git repo URL
   - Branch: `envio`
   - Build Pack: Dockerfile
   - Port: 8082 (for GraphQL access)

2. Environment Variables:
   ```
   ENVIO_PG_HOST=<postgres-service-name>
   ENVIO_PG_PORT=5432
   ENVIO_PG_USER=postgres
   ENVIO_PG_PASSWORD=<password>
   ENVIO_PG_DATABASE=envio-production
   ```

3. Build Command: (automatic from Dockerfile)

4. Start Command: `pnpm start`

## Post-Deployment Configuration

### 1. Access GraphQL API

Once deployed, you can access the Hasura console at:
```
https://<your-domain>:8082/v1/graphql
```

Use the `HASURA_GRAPHQL_ADMIN_SECRET` for authenticated access.

### 2. Monitor Indexing Progress

Check the indexer logs in Coolify to see:
- Connection to Monad RPC
- Block indexing progress
- Events being processed

### 3. Database Access

To access the PostgreSQL database directly:
- Use Coolify's database management interface
- Or connect via psql:
  ```bash
  psql -h <vps-ip> -p 5433 -U postgres -d envio-production
  ```

## Production Considerations

### Security

1. **Change Default Passwords**
   - Update `ENVIO_PG_PASSWORD`
   - Update `HASURA_GRAPHQL_ADMIN_SECRET`
   - Use strong, random passwords

2. **Restrict Access**
   - Configure firewall rules in Coolify
   - Only expose necessary ports (8082 for GraphQL, 5433 for PostgreSQL if needed externally)
   - Keep PostgreSQL internal to the network when possible

3. **HTTPS/SSL**
   - Enable SSL in Coolify for the Hasura service
   - Use Let's Encrypt for automatic certificates

### Performance

1. **Database Backups**
   - Configure automated backups in Coolify
   - Set backup frequency (daily recommended)

2. **Resource Allocation**
   - PostgreSQL: 2GB+ RAM recommended
   - Hasura: 512MB RAM minimum
   - Indexer: 1GB+ RAM (depends on indexing speed)

3. **Persistent Volumes**
   - Ensure PostgreSQL data is on a persistent volume
   - Configure volume backups

### Monitoring

1. **Check Logs Regularly**
   - Indexer: Verify blocks are being processed
   - Hasura: Check for query errors
   - PostgreSQL: Monitor for connection issues

2. **Set Up Alerts**
   - Configure Coolify health checks
   - Monitor disk space usage
   - Track indexing lag

## Troubleshooting

### Indexer Not Starting

```bash
# Check logs in Coolify dashboard
# Common issues:
# - Database connection failed
# - RPC endpoint not reachable
# - Insufficient resources
```

### Database Connection Issues

```bash
# Verify environment variables
# Check network connectivity between services
# Ensure PostgreSQL is accepting connections
```

### Slow Indexing

```bash
# Check RPC endpoint performance
# Increase indexer resources
# Verify network bandwidth
```

## Updating the Indexer

1. Push changes to your git repository
2. Trigger rebuild in Coolify
3. Coolify will:
   - Pull latest code
   - Rebuild the Docker image
   - Restart the service

## Rolling Back

If you need to rollback:
1. Go to Coolify deployment history
2. Select a previous deployment
3. Click "Redeploy"

## Useful Commands

### View Indexer Logs
```bash
# In Coolify dashboard → Service → Logs
```

### Access Database
```bash
# Via Coolify database console
# Or use the connection string from environment variables
```

### Restart Services
```bash
# In Coolify dashboard → Service → Restart
```

## Support

- Envio Documentation: https://docs.envio.dev
- Coolify Documentation: https://coolify.io/docs
- Hasura Documentation: https://hasura.io/docs

---

**Note**: This indexer runs continuously, indexing blocks from the Monad testnet. Ensure your VPS has sufficient resources and stable connectivity to the RPC endpoint.
