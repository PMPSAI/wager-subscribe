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
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** leave empty (the API serves the app and static files)
   - **Install Command:** `npm install`

4. **Environment variables** (Project → Settings → Environment Variables). Add:

   | Name | Description | Example |
   |------|-------------|---------|
   | `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host/db?sslaccept=strict` |
   | `JWT_SECRET` | Session signing secret (min 32 chars) | long-random-string |
   | `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_...` or `sk_test_...` |
   | `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
   | `VITE_APP_ID` | OAuth app id (if using OAuth) | your-app-id |
   | `OAUTH_SERVER_URL` | OAuth API base URL (if using OAuth) | `https://auth.example.com` |
   | `VITE_OAUTH_PORTAL_URL` | OAuth login portal URL (if using OAuth) | `https://login.example.com` |
   | `OWNER_OPEN_ID` | (Optional) OpenID of the admin user | openid-string |

   Set them for **Production** (and **Preview** if you want).

5. **Deploy** – Vercel will run `npm run build` and deploy. The single serverless function at `api/index.mjs` handles all routes (API + SPA).

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

- **"pnpm install" / "frozen-lockfile" / ERR_PNPM_OUTDATED_LOCKFILE**  
  Vercel picks the package manager from the lockfile in the repo; if it sees `pnpm-lock.yaml` (e.g. on an old commit), it runs pnpm and ignores `vercel.json`’s `installCommand`. So you must use the **Override** in project settings. If the build log shows an old commit (e.g. `6b6ea19`), ensure your latest code is pushed to the GitHub repo Vercel is connected to.  
  1. In Vercel, open the deployment and check the commit hash; if it’s not your latest `main`, trigger a **new deploy** from the latest commit (e.g. **Redeploy** with “Use existing Build Cache” **off**).  
  2. If it keeps using pnpm, in the project go to **Settings** → **Build & Development** → **Install Command**, turn the **Override** toggle **ON**, and set the command to `rm -f pnpm-lock.yaml && npm ci`. Then **push a new commit** to `main` (e.g. `git commit --allow-empty -m "chore: trigger deploy" && git push`) so the next build uses the override—do not only click Redeploy on an old deployment.
