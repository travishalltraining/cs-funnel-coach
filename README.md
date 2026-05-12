# GMM Funnel Diagnostic

Internal CS Coaching tool. Built with React + Vite + Tailwind.

## Deploy to Vercel (the fast path)

1. **Create a new GitHub repo** (private is fine). Don't add a README or .gitignore from the GitHub UI — this project already has them.

2. **Push this folder to that repo:**
   ```bash
   cd cs-funnel-coach
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

3. **Go to [vercel.com/new](https://vercel.com/new)** and sign in with GitHub.

4. **Import the repo.** Vercel auto-detects Vite — no config changes needed. Just click **Deploy**.

5. **Done.** Vercel hands you a `*.vercel.app` URL in ~60 seconds. Every push to `main` redeploys automatically.

## Run locally (optional, for tweaks before deploy)

You need Node.js installed. Then:

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173). Edit `src/App.jsx`, save, browser auto-refreshes.

To produce a production build locally:

```bash
npm run build
npm run preview
```

## Custom domain (later, optional)

Vercel → project settings → Domains → add `diagnostic.gymmembermachine.com` (or whatever subdomain). Vercel gives you a CNAME or A record to add at your DNS provider. SSL is handled automatically.

## What's in here

- `src/App.jsx` — the diagnostic tool component (~3,400 lines)
- `src/main.jsx` — React mount point
- `src/index.css` — Tailwind directives (fonts are loaded inside App.jsx via inline `<style>`)
- `tailwind.config.js` — scans `index.html` and everything under `src/` for Tailwind classes
- `vite.config.js` — minimal Vite + React setup
