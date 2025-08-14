# Vercel Deployment Guide for GrayZoneBench Dashboard

This guide explains how to deploy only the Next.js dashboard (`site/` directory) from your monorepo to Vercel.

## 📋 Prerequisites

- Git repository with your code pushed to GitHub/GitLab/Bitbucket
- Google Cloud Storage bucket with benchmark results
- Service account with GCS permissions (`storage.objects.get`, `storage.objects.list`)
- Vercel account

## 🚀 Deployment Steps

### Step 1: Repository Setup

Your monorepo structure should look like:
```
openai-safety-bench/
├── vercel.json              ← Root config (created)
├── .vercelignore           ← Ignore non-site files (created)
├── site/                   ← Next.js app directory
│   ├── package.json
│   ├── next.config.ts
│   └── ...
├── utils/                  ← Python utils (ignored)
├── docs/                   ← Documentation (ignored)
└── gray-zone-bench.py      ← Main Python script (ignored)
```

### Step 2: Import Project to Vercel

1. **Connect Repository:**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your repository from Git provider

2. **Configure Project Settings:**
   ```
   Framework Preset: Next.js
   Root Directory: site
   Build Command: pnpm run build
   Output Directory: (leave default)
   Install Command: pnpm install
   ```

3. **Advanced Settings:**
   - Node.js Version: `20.x` 
   - Package Manager: `pnpm`

### Step 3: Environment Variables

1. **Navigate to Project Settings:**
   - Go to your project dashboard
   - Click "Settings" tab
   - Select "Environment Variables"

2. **Add Required Variables:**

   **GCS_SERVICE_ACCOUNT:**
   ```json
   {"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n","client_email":"your-service@project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/your-service%40project.iam.gserviceaccount.com"}
   ```
   
   **GCS_BUCKET_NAME:**
   ```
   your-bucket-name
   ```

   **NEXT_TELEMETRY_DISABLED:** (Optional)
   ```
   1
   ```

3. **Environment Scope:**
   - Set to "All Environments" or "Production"

### Step 4: Deploy

1. **Trigger Deployment:**
   - Click "Deploy" button
   - Or push changes to your main branch for auto-deployment

2. **Monitor Build:**
   - Watch the build logs in Vercel dashboard
   - First build may take 2-3 minutes

### Step 5: Verify Deployment

1. **Check Build Status:**
   - Ensure build completes successfully
   - Look for any error messages in logs

2. **Test Application:**
   - Visit your deployment URL
   - Navigate to `/results` page
   - Verify GCS data loading works
   - Test charts and interactive features

## ⚙️ Advanced Configuration

### Custom Domain

1. Go to Project Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed

### Performance Optimization

The deployment includes:
- ✅ Next.js 15 canary with caching
- ✅ Server-side data fetching with 'use cache'
- ✅ Optimized bundle splitting
- ✅ Security headers configured

### Monitoring

Enable monitoring in Vercel:
- Analytics: Track page views and performance
- Speed Insights: Monitor Core Web Vitals
- Runtime Logs: Debug serverless function issues

## 🔧 Troubleshooting

### Common Issues

**Build Failures:**
- Check Node.js version is 20.x
- Ensure pnpm is selected as package manager
- Verify all dependencies are in `site/package.json`

**Environment Variable Errors:**
- Ensure GCS_SERVICE_ACCOUNT is valid JSON (single line)
- Verify service account has proper permissions
- Check bucket name spelling

**Data Loading Issues:**
- Test GCS credentials locally first
- Verify bucket permissions in Google Cloud Console
- Check Vercel function logs for specific errors

### Getting Help

1. **Vercel Documentation:** [vercel.com/docs](https://vercel.com/docs)
2. **Build Logs:** Available in deployment details
3. **Function Logs:** Check Runtime logs for serverless functions

## 🎯 Next Steps After Deployment

1. **Domain Setup:** Configure custom domain if needed
2. **Analytics:** Enable Vercel Analytics for usage insights
3. **Monitoring:** Set up alerts for failed deployments
4. **Scaling:** Monitor usage and upgrade plan if needed

Your dashboard will be available at: `https://your-project.vercel.app`