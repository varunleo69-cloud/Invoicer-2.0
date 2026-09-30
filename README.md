# Invoicer — Multi-Container Invoice Application

Invoicer is a small invoice-generation application used as a hands-on DevOps
learning project: a REST API, a PostgreSQL database, an nginx load balancer and
three CI/CD pipelines (Jenkins, GitHub Actions, GitLab CI).

## Architecture

```text
                    Browser
                       |
                       v
            nginx  (load balancer, only published port)
             |                        |
        /api and /health              /
             |                        |
             v                        v
   backend replicas (Node/Express)   frontend (nginx, static files)
             |
             | private Docker network
             v
        PostgreSQL 16
```

- The browser talks to **one origin**. nginx routes `/api/*` and `/health` to the
  backend replicas (round-robin) and everything else to the frontend container.
- Only nginx publishes a port. The backends, the frontend and PostgreSQL are
  reachable only inside the Docker network.
- nginx re-resolves the `backend` / `frontend` service names every few seconds, so
  redeploying containers (new IPs) does not break the load balancer.
- Every API response carries an `X-Instance` header with the replica that served it.

| Environment | Compose file | Backend replicas | URL |
|---|---|---|---|
| Local / Jenkins / GitLab | `docker-compose.yml` | 2 | http://localhost:8080 (GitLab: 8082) |
| Production | `docker-compose.prod.yml` | 5 | http://localhost:8081 |

## Components

- Frontend: HTML, CSS, vanilla JavaScript, nginx
- Backend: Node.js 22, Express.js (runs as the non-root `node` user, has a Docker `HEALTHCHECK`)
- Database: PostgreSQL 16
- Load balancer: nginx (`nginx/nginx.conf`)
- Tests: Jest, Supertest
- CI/CD: Jenkins, GitHub Actions, GitLab CI

## API

- `GET /health` — backend and database health (includes the replica name in `server`)
- `POST /api/v1/invoices` — calculate and persist an invoice
- `GET /api/v1/invoices` — list saved invoices
- `GET /api/v1/invoices/:id` — retrieve one invoice with items
- `DELETE /api/v1/invoices/:id` — delete an invoice

## Configuration and secrets

There is **no default database password**. Copy `.env.example` to `.env` and set
`DB_PASSWORD` (`.env` is git-ignored).

- `docker-compose.yml` reads `DB_PASSWORD` from `.env` and falls back to a
  dev-only value, so local runs and CI work out of the box.
- `docker-compose.prod.yml` **requires** `DB_PASSWORD`. In GitHub Actions it comes from
  the repository secret `DB_PASSWORD`.
- The backend refuses to start without `DB_PASSWORD`.

> **Existing production database:** PostgreSQL only applies `POSTGRES_PASSWORD` when
> the volume is first created. If your prod volume was created with the old password,
> either set the `DB_PASSWORD` secret to that same value, or change it inside
> PostgreSQL (`ALTER USER invoicer PASSWORD '...'`) before deploying.

## Run without Docker

The backend needs a PostgreSQL database. Set the variables from `.env.example`:

```bash
npm ci
npm test
npm start
```

The frontend can be served by any static web server. Its API address is in
`frontend/config.js`; set `FRONTEND_ORIGIN` on the backend if the frontend is
served from a different origin.

## Run the complete stack with Docker Compose

```bash
cp .env.example .env        # then edit DB_PASSWORD
docker compose up --build -d --wait
```

- Application: http://localhost:8080
- Health: http://localhost:8080/health

See the load balancer at work:

```bash
for i in $(seq 10); do curl -si localhost:8080/health | grep -i x-instance; done
```

Scale the local stack: change `replicas` under `backend` in `docker-compose.yml`
(or run `docker compose up -d --scale backend=4`).

```bash
docker compose down        # stop
docker compose down -v     # stop and DELETE the database volume
```

## CI/CD

All three pipelines run the same checks: install with `npm ci`, run the Jest tests,
build the images, deploy the stack and smoke-test **through nginx**.

| Pipeline | What it does |
|---|---|
| `Jenkinsfile` | test, build, `docker compose up --wait`, end-to-end smoke test (health, create/read/delete an invoice, load-balancing check) |
| `.github/workflows/ci.yml` | test, build and push images to GHCR tagged with the commit SHA, deploy that exact SHA to the self-hosted runner with `docker-compose.prod.yml`, smoke test |
| `.gitlab-ci.yml` | test, build, deploy a separate stack (`invoicer-gitlab`, port 8082), smoke test from inside the nginx container |

### Roll back production

Every push to `main` publishes images tagged with its commit SHA. To roll back, on the
deploy host:

```bash
IMAGE_TAG=<older-commit-sha> DB_PASSWORD=<password> \
  docker compose -f docker-compose.prod.yml up -d --wait
```
