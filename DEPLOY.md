# Deploy Guide (AWS/VPS + Domain)

## 1. Architecture

- Frontend: static build served by Nginx or S3 + CloudFront.
- Backend: Node.js app (PM2/systemd) behind Nginx reverse proxy.
- Database: PostgreSQL managed or self-hosted.
- SSL: Let's Encrypt certificates.

## 2. Required DNS

Create these records in your DNS provider:

- `app.seudominio.com` -> frontend server/CloudFront.
- `api.seudominio.com` -> backend server public IP.

## 3. Backend server setup

On the backend server:

1. Install Node.js LTS and Nginx.
2. Clone project and install dependencies.
3. Copy `backend/.env.example` to `backend/.env` and fill real values.
4. Run Prisma migrations:
   - `cd backend`
   - `npx prisma migrate deploy`
5. Nao rode seed em producao:
   - Evite `npm run db:seed` no deploy.
   - O seed esta protegido para bloquear quando `NODE_ENV=production`.
   - So execute seed em producao se for intencional e explicito usando `ALLOW_PROD_SEED=true`.
6. Start backend:
   - `npm run start`
   - Recommended: use PM2 (`pm2 start src/server.js --name pizza-backend`)

## 4. Backend Nginx reverse proxy

Example server block for `api.seudominio.com`:

```nginx
server {
    listen 80;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

After that, issue SSL certificate:

- `sudo certbot --nginx -d api.seudominio.com`

## 5. Frontend setup

On frontend build machine/server:

1. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL=https://api.seudominio.com`.
2. If you want Google login to work, set `VITE_GOOGLE_CLIENT_ID` in the frontend, or set `GOOGLE_CLIENT_ID` in the backend and let the frontend read it from `GET /auth/google/client-id`.
3. In Google Cloud Console, use an OAuth 2.0 Client ID of type `Web application` for the same project as the app.
4. Add your frontend origins to the OAuth client:
   - `http://localhost:5173` for local Vite dev
   - `https://app.seudominio.com` for production
5. Copy the exact client id value into `VITE_GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_ID`. Do not use an API key or a client id from another project.
6. Build:
   - `cd frontend`
   - `npm run build`
7. Publish `frontend/dist` to Nginx web root (or S3 bucket).

If using Nginx for SPA:

```nginx
server {
    listen 80;
    server_name app.seudominio.com;
    root /var/www/pizza-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Then issue SSL certificate:

- `sudo certbot --nginx -d app.seudominio.com`

## 6. Mercado Pago production config

In backend `.env`:

- `MP_ACCESS_TOKEN`: production token.
- `MP_NOTIFICATION_URL`: `https://api.seudominio.com/billing/webhook/mercadopago`
- `FRONTEND_URL`: `https://app.seudominio.com`

In Mercado Pago panel:

- Site/domain: `https://app.seudominio.com`
- Webhook URL: `https://api.seudominio.com/billing/webhook/mercadopago`

## 7. Validation checklist

1. Access frontend in browser using domain.
2. Login and list invoices.
3. Generate payment link.
4. Complete a payment.
5. Confirm webhook reaches backend and invoice changes to `PAGO`.
6. Confirm restaurant status reactivates automatically.

## 8. Security checklist

- Rotate all tokens/secrets that were exposed in local tests.
- Do not commit `.env` files.
- Restrict CORS origins in production.
- Keep server ports closed except 80/443.
