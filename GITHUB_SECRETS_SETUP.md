# GitHub Secrets Setup Guide

## Your Cloudflare Credentials

You have these credentials ready to use:

- **Account ID**: `ede6590ac0d2fb7daf155b35653457b2`
- **API Token**: `cCvHyeJ9xLgfFGgV-L_5xhPz-_wbafF5r0JrtbOF`

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
- **Value**: `cCvHyeJ9xLgfFGgV-L_5xhPz-_wbafF5r0JrtbOF`
- Click **Add secret**

#### 2. CF_ACCOUNT_ID
- **Name**: `CF_ACCOUNT_ID`
- **Value**: `ede6590ac0d2fb7daf155b35653457b2`
- Click **Add secret**

#### 3. CLOUDFLARE_ACCOUNT_ID (alternative name, some workflows use this)
- **Name**: `CLOUDFLARE_ACCOUNT_ID`
- **Value**: `ede6590ac0d2fb7daf155b35653457b2`
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

Once secrets are added, your GitHub Actions workflows will automatically:
1. Deploy to GitHub Pages (via `deploy-github-pages.yml`)
2. Deploy to Cloudflare Workers (via `ci-di-deploy`)

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
https://dash.cloudflare.com/ede6590ac0d2fb7daf155b35653457b2/workers

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
