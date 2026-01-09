# Vercel Multi-Tenant Subdomain Setup

## The Issue
`devnet-test3.degenbox.fun` returns 404: DEPLOYMENT_NOT_FOUND because Vercel doesn't know to handle wildcard subdomains yet.

## Solution

### Step 1: Add Wildcard Domain in Vercel

1. Go to https://vercel.com/dashboard
2. Select your `3eyes-fatebox-v3` project
3. Click **Settings** → **Domains**
4. Click **Add Domain**
5. Enter: `*.degenbox.fun`
6. Click **Add**

Vercel will give you DNS instructions.

### Step 2: Configure DNS

In your DNS provider (Cloudflare, Namecheap, GoDaddy, etc.), add these records:

#### For Root Domain (if not already added):
```
Type: A
Name: @
Value: 76.76.21.21
```

#### For Wildcard Subdomains:
```
Type: CNAME
Name: *
Value: cname.vercel-dns.com
```

Or use Vercel's provided nameservers if you want to manage DNS through Vercel.

### Step 3: Wait for DNS Propagation

DNS changes can take 5-60 minutes to propagate. Check status with:
```bash
nslookup devnet-test3.degenbox.fun
```

Should return Vercel's IP address.

### Step 4: Test

Visit your subdomain:
- `https://devnet-test3.degenbox.fun` → Should load your project page
- `https://degenbox.fun` → Main landing page
- `https://degenbox.fun/dashboard` → Dashboard

## How It Works

1. **User visits**: `devnet-test3.degenbox.fun`
2. **DNS resolves**: Points to Vercel via `*.degenbox.fun` CNAME
3. **Vercel receives**: Request with hostname `devnet-test3.degenbox.fun`
4. **Middleware runs**: Extracts `devnet-test3` subdomain
5. **Next.js rewrites**: To `/project/devnet-test3` route
6. **Page loads**: Project-specific content from database

## Vercel Dashboard Screenshot Locations

1. **Domains**: `Settings` → `Domains` → `Add Domain`
2. **Deployments**: `Deployments` tab to see if latest code is deployed
3. **Environment Variables**: `Settings` → `Environment Variables` (already set up)

## Common Issues

### "Domain is not configured"
- Make sure you added `*.degenbox.fun` in Vercel Domains
- Not just individual subdomains, but the wildcard

### Still 404 after adding wildcard
- Check if DNS propagated: `dig devnet-test3.degenbox.fun`
- Clear browser cache
- Try incognito mode

### Works on one subdomain but not others
- The wildcard should handle all subdomains
- Make sure the subdomain exists in your database `projects` table

## Testing Locally

Use the query param method:
```
http://localhost:3000?subdomain=devnet-test3
```

This simulates the subdomain routing without DNS setup.

## Current Setup

✅ Middleware configured correctly
✅ Code deployed to Vercel
✅ Database has project with subdomain `devnet-test3`
⏳ Need to add `*.degenbox.fun` to Vercel Domains
⏳ Need to configure DNS wildcard CNAME

## DNS Records Summary

| Type  | Name | Value                 | Purpose                    |
|-------|------|-----------------------|----------------------------|
| A     | @    | 76.76.21.21           | Root domain                |
| CNAME | www  | cname.vercel-dns.com  | www subdomain              |
| CNAME | *    | cname.vercel-dns.com  | All other subdomains       |

**Note**: Some DNS providers use `*` for wildcard, others use `*.degenbox.fun` or just `*`. Check your provider's documentation.
