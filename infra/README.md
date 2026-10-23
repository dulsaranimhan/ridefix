# infra

Local infrastructure (milestone 4):

- `docker-compose.yml` - Kong, PostgreSQL + PostGIS, the six services.
- `docker compose --profile optional up` - also starts Redis and RabbitMQ.
- `kong/kong.yml` - Kong declarative config (routes, JWT check, rate limits, logs).
- `postgres/` - init script that creates one database and one login per service.

No Kubernetes. This is for local development and demos.
