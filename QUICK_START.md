# 🚀 MeauxOS Quick Start Guide

## ✅ What's Already Configured

Your repository is now fully set up with:
- ✅ GCLOUD files merged (MeauxOS dashboard)
- ✅ Cloudflare Workers configuration
- ✅ GitHub Actions workflows
- ✅ Environment variables template
- ✅ Local `.env` file with your credentials

## 🔐 Your Cloudflare Credentials

**Account ID**: `<your_cf_account_id>`
**API Token**: `<your_cloudflare_api_token>`

## 📋 Next Steps - GitHub Secrets Setup

You need to add secrets to GitHub for CI/CD workflows to work:

### Go to GitHub Settings
👉 https://github.com/InnerAnimal/app/settings/secrets/actions

### Add These 3 Required Secrets:

| Secret Name | Value | Purpose |
|------------|-------|---------|
| `CLOUDFLARE_API_TOKEN` | `<your_cloudflare_api_token>` | Cloudflare deployment |
| `CF_ACCOUNT_ID` | `<your_cf_account_id>` | Your Cloudflare account |
| `MEAUXBILITY_GH_DASHBOARD` | (your GitHub PAT token) | GitHub integration |

**Optional** (if using Supabase):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_SYNC_TOKEN`

### How to Add a Secret:
1. Click "New repository secret"
2. Enter the **Name** exactly as shown above
3. Paste the **Value**
4. Click "Add secret"
5. Repeat for each secret

## 🧪 Test Your Setup

After adding secrets, push a commit to trigger workflows:

```bash
git commit --allow-empty -m "Test CI/CD workflows"
git push
```

Then check: https://github.com/InnerAnimal/app/actions

## 🌐 Where Your Site Will Deploy

1. **GitHub Pages** (dev): https://inneranimal.github.io/app/
2. **Cloudflare Workers** (prod): https://meaux-os.workers.dev (or your custom domain)

## 🛠️ Local Development

### View locally:
```bash
# Simple HTTP server
npm run serve
# Then visit: http://localhost:8000
```

### Deploy to Cloudflare manually:
```bash
npm install
npm run deploy
```

## 📁 Project Structure

```
/home/user/app/
├── index.html              # MeauxOS dashboard (main UI)
├── src/
│   └── index.js           # Cloudflare Worker entry point
├── .github/workflows/
│   └── ci-cd.yml          # Checks + deploy Pages + deploy Worker
├── wrangler.toml          # Cloudflare Workers config
├── package.json           # NPM scripts and dependencies
├── .env                   # Local environment variables (not committed)
├── .env.example           # Environment template
└── README.md              # Full documentation

```

## 🔗 Useful Links

- **Cloudflare Dashboard**: https://dash.cloudflare.com/<your_cf_account_id>/workers
- **GitHub Actions**: https://github.com/InnerAnimal/app/actions
- **Live Demo**: https://samprimeaux.github.io/GCLOUD/

## 📞 Need Help?

See the full setup guide: `GITHUB_SECRETS_SETUP.md`

## ⚡ TL;DR

1. Add 3 secrets to GitHub (link above)
2. Push any commit
3. Watch GitHub Actions deploy automatically
4. Visit your deployed site!

---

**Last Updated**: 2025-12-22
**Status**: ✅ Ready for deployment
