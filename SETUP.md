# Gym Tracker — Beginner Setup Guide

Follow these steps in order. Each one takes about 5 minutes.

---

## Step 1 — Create a GitHub account and push the code

1. Go to https://github.com and create a free account (if you don't have one).
2. Click **New** (green button) → name the repo `gym-tracker` → click **Create repository**.
3. Open a terminal/command prompt in the `gym-tracker` folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gym-tracker.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 2 — Create a Supabase project

1. Go to https://supabase.com and sign up for a free account.
2. Click **New Project** → choose a name (e.g. `gym-tracker`) → set a strong database password → click **Create new project**.
3. Wait ~1 minute for the project to provision.
4. Go to **SQL Editor** (left sidebar) → paste the entire contents of `supabase/schema.sql` → click **Run**.
   - You should see "Success" for each statement.
5. Go to **Settings → API** (left sidebar). You'll need two values:
   - **Project URL** (looks like `https://abcxyz.supabase.co`)
   - **anon public** key (a long JWT string)

---

## Step 3 — Get a Claude API key

1. Go to https://console.anthropic.com and create an account.
2. Click **API Keys** → **Create Key** → copy it. It starts with `sk-ant-`.
3. Keep this secret — never commit it to GitHub.

---

## Step 4 — Deploy to Vercel

1. Go to https://vercel.com and sign up (use "Continue with GitHub").
2. Click **Add New → Project** → import your `gym-tracker` repository.
3. Vercel will auto-detect Next.js. Click **Deploy**.
   - The first deploy will fail because env vars are missing — that's okay.
4. Go to your project's **Settings → Environment Variables** and add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `ANTHROPIC_API_KEY` | Your Claude API key (sk-ant-...) |

5. Go to **Deployments** → click the three dots on the latest deployment → **Redeploy**.
6. Once it's green, click the deployment URL to open your app. 🎉

---

## Step 5 — Run locally (optional, for development)

1. Copy the example env file:
   ```bash
   cp .env.local.example .env.local
   ```
2. Fill in your values in `.env.local`.
3. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
4. Open http://localhost:3000 in your browser.

---

## Troubleshooting

- **"Invalid API key"** — double-check your `ANTHROPIC_API_KEY` in Vercel environment variables.
- **"relation does not exist"** — you haven't run `schema.sql` yet, or it errored. Re-run it in Supabase SQL Editor.
- **Redirects to /login on every page** — your Supabase URL or anon key is wrong. Check for typos.
- **Signup works but profile page is blank** — the trigger `on_auth_user_created` may not have fired. Manually insert a row in the `profiles` table via Supabase → Table Editor.
