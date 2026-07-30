# Deploy Umami with Disco

This repository is ready for deployment on [Disco](https://disco.cloud/):

- `next.config.ts` builds a standalone Next.js server.
- `Dockerfile` creates the production image, listens on `0.0.0.0:3000`, and applies database migrations when the container starts.
- `disco.json` exposes port 3000 and uses Umami's heartbeat endpoint for zero-downtime deployment checks.

## Prerequisites

- A GitHub repository containing this branch
- A server supported by Disco (Ubuntu 24.04 LTS with at least 2 GB RAM)
- DNS records for the Disco server and the Umami application
- A PostgreSQL database

Keep deployment values in the local `.env`; it is ignored by both Git and Docker.

The only strictly required application variable is:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

Also set a stable, random application secret:

```dotenv
APP_SECRET=REPLACE_WITH_A_RANDOM_SECRET
```

Umami falls back to deriving its secret from `DATABASE_URL`, but an explicit `APP_SECRET` prevents authentication and encrypted values from changing if the database connection string changes. Generate one with `openssl rand -hex 32` and keep the same value across deployments.

No `HOSTNAME` or `PORT` variable is needed: the Docker image already sets `HOSTNAME=0.0.0.0` and `PORT=3000`.

If `DATABASE_URL` uses a connection pooler that cannot run migrations, also set:

```dotenv
DIRECT_DATABASE_URL=postgresql://USER:PASSWORD@DIRECT_HOST:5432/DATABASE
```

Other Umami environment variables, such as `REDIS_URL`, `DATABASE_REPLICA_URL`, `BASE_PATH`, and `DISABLE_TELEMETRY`, are optional and should only be added when those features are needed.

The `pnpm disco:env` helper below reads `.env` and passes every non-empty value directly to the Disco CLI without adding the file to the image or repository.

## 1. Initialize Disco

The migration guide's CLI flow is:

```bash
disco init root@disco.example.com
disco github:apps:add
```

Replace `disco.example.com` with the DNS name pointing to your server. When the browser opens, authorize the GitHub repository that contains Umami.

## 2. Create the project

If the local `DATABASE_URL` points to a PostgreSQL server that is reachable from the Disco server, create the project and upload the local `.env` values in one command:

```bash
pnpm disco:env -- projects:add \
  --name umami \
  --github YOUR_GITHUB_OWNER/YOUR_REPOSITORY \
  --branch master \
  --domain analytics.example.com
```

Change `--branch` if the deployment branch is not `master`. Do not use a `DATABASE_URL` containing `localhost` unless PostgreSQL runs inside the same application container; from Disco, `localhost` refers to the Umami container.

### Use Disco's PostgreSQL add-on instead

Create the project first:

```bash
disco projects:add \
  --name umami \
  --github YOUR_GITHUB_OWNER/YOUR_REPOSITORY \
  --branch master \
  --domain analytics.example.com
```

The initial deployment will not become healthy until a database is attached. Create and attach one as `DATABASE_URL`, upload `APP_SECRET` from `.env` without replacing the attached database URL, then redeploy:

```bash
disco postgres:create --project umami --env-var DATABASE_URL
pnpm exec dotenv -e .env -- sh -c 'disco env:set APP_SECRET="$APP_SECRET" --project umami'
disco deploy --project umami
```

Umami checks the database and applies pending Prisma migrations before it starts accepting traffic.

When using an external database, sync `.env` changes and redeploy with:

```bash
pnpm disco:env -- env:set --project umami
disco deploy --project umami
```

## 3. Verify the deployment

Follow the build and startup output:

```bash
disco deploy:output --project umami
disco logs --project umami --service web
```

Then verify:

```bash
curl -f https://analytics.example.com/api/heartbeat
```

Disco provisions HTTPS automatically. Future pushes to the configured branch trigger deployments automatically.

After the first successful deployment, sign in with username `admin` and password `umami`, then change the password immediately.
