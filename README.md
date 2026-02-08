# K-Pop Pulse

## Auto-Updating News (Static)
- Local run: `npm install` then `npm run fetch:news`
- Daily updates: GitHub Actions workflow runs on a cron and commits `public/news.json`
- Configure feeds and keywords in `scripts/fetch-news.mjs`
- GitHub Actions needs **Read and write permissions** enabled in repo Settings → Actions → General → Workflow permissions.

## Admin (Decap CMS)
- Enable GitHub Pages for the `main` branch root.
- Admin URL: `/admin/`
- Netlify CMS-only site can have **Build status = Stopped** to avoid production deploy credits.
- Data files:
  - `content/comebacks.json`
  - `content/tours.json`
