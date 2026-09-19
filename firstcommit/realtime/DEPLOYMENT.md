# Realtime deployment

The Socket.IO service runs independently from the Next.js application. It must be deployed as one service per environment and exposed only through HTTPS in production.

## Container

```bash
docker build -f Dockerfile.realtime -t shikshamesh-realtime .
docker run --rm -p 3003:3003 --env-file .env.local shikshamesh-realtime
```

The health probe is:

```text
GET /socket.io/?EIO=4&transport=polling
```

## Required runtime configuration

Use ECS task secrets, App Runner runtime configuration, or AWS Secrets Manager. Do not copy `.env.local` into the container image.

```ini
COGNITO_USER_POOL_ID=...
COGNITO_APP_CLIENT_ID=...
REALTIME_PORT=3003
REALTIME_ALLOWED_ORIGIN=https://app.example.com
DATABASE_URL=...
```

The Next.js application must be built with the public WebSocket endpoint:

```ini
NEXT_PUBLIC_REALTIME_URL=https://realtime.example.com
```

## AWS production layout

```text
Browser
  -> CloudFront / HTTPS
  -> Next.js ECS or App Runner service
  -> realtime ECS or App Runner service (Socket.IO)
       -> PostgreSQL
       -> Cognito JWKS verification
```

Configure the load balancer or App Runner custom domain for WebSocket upgrade support. Allow only the web-app origin in `REALTIME_ALLOWED_ORIGIN`.

## Scaling gate

One realtime task is sufficient for a demo. Before running more than one task, add the Socket.IO Redis adapter and a managed Redis/ElastiCache instance; otherwise room events cannot cross task boundaries.

## Production checks

1. Set `ALLOW_DEMO_IDENTITY=false` in the web application.
2. Set an exact HTTPS `REALTIME_ALLOWED_ORIGIN`.
3. Verify two users can join the same room, receive chat/canvas updates, and see presence changes.
4. Confirm reconnect loads persisted chat and canvas state from PostgreSQL.
5. Add CloudWatch alarms for unhealthy tasks, disconnect/error rate, and connection count.
