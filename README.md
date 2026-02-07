# K-Pop Pulse

## Auto-Updating News (Static)
- Local run: `npm install` then `npm run fetch:news`
- Daily updates: GitHub Actions workflow runs on a cron and commits `public/news.json`
- Configure feeds and keywords in `scripts/fetch-news.mjs`
