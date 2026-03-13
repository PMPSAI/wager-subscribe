# Deploy to Vercel with Database

## 1. Push to GitHub

```bash
git add .
git commit -m "Add Vercel deployment and DB config"
git push origin main
```

## 2. Create a MySQL database

The app uses **MySQL** (Drizzle + mysql2). Use one of:

- **[PlanetScale](https://planetscale.com)** – MySQL-compatible, free tier, good for Vercel
- **[Railway](https://railway.app)** – MySQL add-on
- **[Neon](https://neon.tech)** – PostgreSQL; would require switching the app to PostgreSQL

**PlanetScale (recommended):**

1. Sign up at [planetscale.com](https://planetscale.com)
2. Create a new database
3. Open **Connect** → **Connect with** → **General**
4. Copy the connection string (e.g. `mysql://user:pass@host/db?sslaccept=strict`)
5. Use it as `DATABASE_URL` on Vercel

## 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub).
2. **Add New** → **Project** → import your `wager-subscribe` repo.
3. **Configure:**
   - **Framework Preset:** Other
   - **Build Command:** `pnpm run build` (or use Override if needed; see Troubleshooting)
   - **Output Directory:** `.vercel/output` (Build Output API v3; set in `vercel.json`)
   - **Install Command:** `pnpm install --frozen-lockfile` (from `vercel.json`)

4. **Environment variables** (Project → Settings → Environment Variables). Add:

   | Name | Description | Example |
   |------|-------------|---------|
   | `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host/db?sslaccept=strict` |
   | `JWT_SECRET` | Session signing secret (min 32 chars) | long-random-string |
   | `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_...` or `sk_test_...` |
   | `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (for embedded checkout in widget) | `pk_test_...` or `pk_live_...` |
   | `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
   | `VITE_APP_ID` | OAuth app id (if using OAuth) | your-app-id |
   | `OAUTH_SERVER_URL` | OAuth API base URL (if using OAuth) | `https://auth.example.com` |
   | `VITE_OAUTH_PORTAL_URL` | OAuth login portal URL (if using OAuth) | `https://login.example.com` |
   | `OWNER_OPEN_ID` | (Optional) OpenID of the admin user | openid-string |
   | `ENABLE_SIMPLE_LOGIN` | (Optional) Set to `1` or `true` to allow sign-in without OAuth via **Sign in without OAuth** | `1` |
   | `SIMPLE_LOGIN_EMAIL` | (Optional) Email for the simple-login user when `ENABLE_SIMPLE_LOGIN` is set | `demo@local` |
   | `SIMPLE_LOGIN_NAME` | (Optional) Display name for the simple-login user | `Demo User` |
   | `VITE_APP_URL` | (Optional) App base URL for widget redirects when embedded; e.g. `https://wager-subscribe.vercel.app` | `https://your-app.vercel.app` |

   Set them for **Production** (and **Preview** if you want).

   **Sign-in options:** If you set `ENABLE_SIMPLE_LOGIN=1`, the app shows a **Sign in without OAuth** button that creates a session (and a user in the DB) without any OAuth provider. Use this when you don’t have OAuth configured. You can use both: OAuth and simple login can be enabled at the same time; the nav shows both buttons when both are configured.

5. **Deploy** – Vercel runs `pnpm run build`, which produces `.vercel/output` (Build Output API v3). Static assets are served from `static/`; all other routes (including `/` and `/api/*`) are handled by the `render` serverless function so the SPA and API work correctly.

## 4. Run database migrations

After the first deploy, run migrations against your production DB:

```bash
# Set DATABASE_URL to your production URL, then:
npm run db:push
```

Or use PlanetScale’s deploy requests / branching to run migrations in their UI.

## 5. Stripe webhook (production)

1. In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks), add an endpoint:
   - URL: `https://your-vercel-app.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
2. Copy the **Signing secret** (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` on Vercel.

## 6. (Optional) Custom domain

In the Vercel project: **Settings** → **Domains** → add your domain and follow the DNS steps.

## Troubleshooting

- **"A server error has occurred" / FUNCTION_INVOCATION_FAILED**  
  Often caused by missing or invalid env on Vercel. The app is built to avoid crashing when the DB is unavailable: `auth.me` will return `null` and the UI will load. For full functionality you must set at least:
  - **`DATABASE_URL`** – MySQL connection string (e.g. PlanetScale). If missing, DB features (users, subscriptions, etc.) won’t work.
  - **`JWT_SECRET`** – A long random string (32+ chars). If missing, session cookies are invalid and sign-in won’t persist; set it in Vercel → Project → Settings → Environment Variables for Production and Preview, then redeploy.

- **"pnpm install" / "frozen-lockfile" / ERR_PNPM_OUTDATED_LOCKFILE**  
  Vercel picks the package manager from the lockfile in the repo; if it sees `pnpm-lock.yaml` (e.g. on an old commit), it runs pnpm and ignores `vercel.json`’s `installCommand`. So you must use the **Override** in project settings. If the build log shows an old commit (e.g. `6b6ea19`), ensure your latest code is pushed to the GitHub repo Vercel is connected to.  
  1. In Vercel, open the deployment and check the commit hash; if it’s not your latest `main`, trigger a **new deploy** from the latest commit (e.g. **Redeploy** with “Use existing Build Cache” **off**).  
  2. If it keeps using pnpm, in the project go to **Settings** → **Build & Development** → **Install Command**, turn the **Override** toggle **ON**, and set the command to `rm -f pnpm-lock.yaml && npm ci`. Then **push a new commit** to `main` (e.g. `git commit --allow-empty -m "chore: trigger deploy" && git push`) so the next build uses the override—do not only click Redeploy on an old deployment.
