# MeauxOS Operations Hub

Connected repository from [SamPrimeaux/GCLOUD](https://github.com/SamPrimeaux/GCLOUD.git)

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in your secrets:

```bash
cp .env.example .env
```

### 2. Required Secrets

#### Cloudflare Configuration

**For Claude Code Environment:**
- Set these as environment variables in your Claude Code project settings
- **DO NOT** use `WRANGLER_SECRET_TOKEN` - use `CLOUDFLARE_API_TOKEN` instead

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | API token with Workers edit permissions | [Cloudflare Dashboard → Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) |
| `CF_ACCOUNT_ID` | Your Cloudflare Account ID | [Cloudflare Dashboard → Workers & Pages](https://dash.cloudflare.com/) (in URL or sidebar) |

**Creating a Cloudflare API Token:**
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use the "Edit Cloudflare Workers" template
4. Required permissions:
   - Account → Workers Scripts → Edit
   - Account → Account Settings → Read
5. Copy the token immediately (shown only once)

#### Supabase Configuration

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL (e.g., `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key from Supabase project settings |

#### Other Secrets

| Variable | Description |
|----------|-------------|
| `INTERNAL_SYNC_TOKEN` | Any secure random string for internal API authentication |
| `MEAUXBILITY_GH_DASHBOARD` | GitHub Personal Access Token for dashboard integration |

### 3. GitHub Secrets Configuration

For GitHub Actions workflows, add these secrets to your repository:

**Settings → Secrets and variables → Actions → New repository secret**

- `CLOUDFLARE_API_TOKEN`
- `CF_ACCOUNT_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_SYNC_TOKEN`

### 4. Deployment

The repository includes two GitHub Actions workflows:

1. **`deploy-github-pages.yml`** - Deploys static site to GitHub Pages
2. **`ci-di-deploy`** - Full CI/CD pipeline with Cloudflare Workers deployment

## Live Site

View the deployed dashboard: [https://samprimeaux.github.io/GCLOUD/](https://samprimeaux.github.io/GCLOUD/)

## Architecture

- **Frontend**: Static HTML with Tailwind CSS and Three.js
- **Deployment**: GitHub Pages (dev), Cloudflare Workers (prod)
- **Database**: Supabase
- **CI/CD**: GitHub Actions

## Development

Open `index.html` in a browser to view locally, or use a local server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then visit `http://localhost:8000`
