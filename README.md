# Invoicer — Persistent Multi-Container Invoice Application

Invoicer is a small invoice-generation application used as a hands-on DevOps learning project. The original browser-only persistence has been replaced with a real REST API and PostgreSQL database.

## Architecture

```text
                         Browser
                        /       \
                       /         \
                      v           v
             Frontend Container  Backend Container
                    Nginx        Node.js + Express
                                      |
                                      | private Docker network
                                      v
                              PostgreSQL Container
```

The frontend container does **not** call the backend container through Docker networking. Nginx only serves the frontend files. JavaScript running in the browser calls the backend API directly.

## Components

- Frontend: HTML, CSS, vanilla JavaScript, Nginx
- Backend: Node.js, Express.js
- Database: PostgreSQL 16
- Tests: Jest, Supertest
- Containers: Docker, Docker Compose
- CI/CD: Jenkins

## API

- `GET /health` — backend and database health
- `POST /api/v1/invoices` — calculate and persist an invoice
- `GET /api/v1/invoices` — list saved invoices
- `GET /api/v1/invoices/:id` — retrieve one invoice with items
- `DELETE /api/v1/invoices/:id` — delete an invoice

## Run locally without Docker

The backend requires PostgreSQL. Set the database variables from `.env.example`, install dependencies and run:

```bash
npm ci
npm test
npm start
```

The frontend can be served by any static web server. Its API address is configured in `frontend/config.js`.

## Run the complete application with Docker Compose

```bash
docker compose up --build -d
```

Open:

- Frontend: http://localhost:8080
- Backend: http://localhost:3000
- Backend health: http://localhost:3000/health

The PostgreSQL container is intentionally **not published to the host**. It is reachable by the backend as `postgres:5432` on the Docker network.

Stop the application:

```bash
docker compose down
```

Remove the database volume as well (this permanently deletes local invoice data):

```bash
docker compose down -v
```

## CI/CD

The Jenkins pipeline performs:

1. `npm ci`
2. Jest tests
3. Docker image builds
4. Docker Compose deployment
5. Frontend and backend smoke tests

This keeps the project completely local through the current learning milestone. No cloud subscription is required.
