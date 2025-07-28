# Deploying to Vercel

## Quick Deploy

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Navigate to website directory**:
   ```bash
   cd website
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project or create new
   - Set project name (e.g., "zkshare-website")
   - Confirm deployment settings

## Automatic Deployment

Once connected to your GitHub repository, Vercel will automatically deploy when you push to the main branch.

## Custom Domain (Optional)

1. **Add custom domain** in Vercel dashboard
2. **Update DNS settings** as instructed
3. **SSL certificate** will be automatically provisioned

## Environment Variables

No environment variables needed for this static site.

## Build Settings

- **Framework Preset**: Other
- **Build Command**: `echo 'Static site - no build required'`
- **Output Directory**: `.`
- **Install Command**: `npm install`

## Performance

- **CDN**: Global edge network
- **Caching**: Automatic static asset caching
- **HTTPS**: Automatic SSL certificates
- **Compression**: Automatic gzip compression

## Monitoring

- **Analytics**: Available in Vercel dashboard
- **Performance**: Real-time monitoring
- **Uptime**: 99.9% SLA 