# GitHub Secrets Setup Guide

## Your Cloudflare Credentials

You will need these credentials:

- **Account ID**: `<your_cf_account_id>`
- **API Token**: `<your_cloudflare_api_token>`

## Setting Up GitHub Repository Secrets

### Step 1: Navigate to Secrets Settings

1. Go to your GitHub repository: `https://github.com/InnerAnimal/app`
2. Click **Settings** (top navigation)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click the **New repository secret** button

### Step 2: Add Each Secret

Add these secrets one by one:

#### 1. CLOUDFLARE_API_TOKEN
- **Name**: `CLOUDFLARE_API_TOKEN`
- **Value**: `<your_cloudflare_api_token>`
- Click **Add secret**

#### 2. CF_ACCOUNT_ID
- **Name**: `CF_ACCOUNT_ID`
- **Value**: `<your_cf_account_id>`
- Click **Add secret**

#### 3. CLOUDFLARE_ACCOUNT_ID (alternative name, some workflows use this)
- **Name**: `CLOUDFLARE_ACCOUNT_ID`
- **Value**: `<your_cf_account_id>`
- Click **Add secret**

#### 4. MEAUXBILITY_GH_DASHBOARD
- **Name**: `MEAUXBILITY_GH_DASHBOARD`
- **Value**: `<your_github_personal_access_token>`
- Click **Add secret**
- Note: Use the GitHub PAT token you already have configured

### Optional Secrets (if you're using Supabase)

#### 5. SUPABASE_URL
- **Name**: `SUPABASE_URL`
- **Value**: Your Supabase project URL (e.g., `https://xxxx.supabase.co`)

#### 6. SUPABASE_SERVICE_ROLE_KEY
- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: Your Supabase service role key

#### 7. INTERNAL_SYNC_TOKEN
- **Name**: `INTERNAL_SYNC_TOKEN`
- **Value**: Any secure random string (generate one with: `openssl rand -base64 32`)

## Verification

After adding all secrets, you should see them listed in:
**Settings → Secrets and variables → Actions**

The secrets will be masked and only show their names.

## Testing the Setup

Once secrets are added, your GitHub Actions workflow will automatically:
1. Run checks on PRs
2. Deploy to GitHub Pages and Cloudflare Workers on merges/pushes to `main` (via `ci-cd.yml`)

Push any commit to trigger the workflows:
```bash
git commit --allow-empty -m "Test workflow with secrets"
git push
```

Check the **Actions** tab to see the workflows running!

## Cloudflare Workers Deployment

Your workflows will deploy to Cloudflare Workers using these credentials. The worker will be available at:
`https://your-worker-name.your-subdomain.workers.dev`

You can manage your workers at:
https://dash.cloudflare.com/<your_cf_account_id>/workers

## Troubleshooting

If deployment fails:
1. Check the **Actions** tab for error logs
2. Verify secrets are correctly set (Settings → Secrets and variables)
3. Ensure your API token has **Workers Scripts: Edit** permission
4. Check Cloudflare dashboard for any account issues

## Security Note

⚠️ **Never commit secrets to git!**
- The `.env` file is in `.gitignore`
- Always use GitHub Secrets for CI/CD
- Rotate tokens if accidentally exposed
