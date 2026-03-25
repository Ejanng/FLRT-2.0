# Cloudflare Tunnel Setup Guide - FLRT 2.0

## Overview
Cloudflare Tunnel allows you to expose your local application to the internet without opening ports or dealing with firewalls. Perfect for testing on multiple devices (phones, tablets, other computers).

**Two Modes:**
- **Quick Tunnel** (no account needed) - Temporary, URLs change on restart
- **Permanent Tunnel** (requires Cloudflare account) - Stable URLs, custom domains

---

## Option 1: Quick Tunnel (Easiest - No Account)

### Prerequisites
- cloudflared installed (`cloudflared.exe` in your PATH)
- Backend Flask server running on `http://localhost:5000`
- Frontend Vite dev server running on `http://localhost:3000` (or next available port)

### Step 1: Start Backend Tunnel

Open a terminal and run:

```powershell
# Make sure you're in the project directory
cd C:\Users\tulal\FLRT-2.0

# Start the backend tunnel
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5000
```

**Output will look like:**
```
Your quick tunnel is ready! Visit it:
https://aviation-university-drainage-films.trycloudflare.com
```

✅ **Copy this URL** (backend tunnel URL)

### Step 2: Start Frontend Tunnel

Open a **new terminal** and run:

```powershell
# Make sure you're in the project directory
cd C:\Users\tulal\FLRT-2.0

# Start the frontend tunnel (on port 3000 or whatever Vite is running on)
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
```

**Output will look like:**
```
Your quick tunnel is ready! Visit it:
https://importantly-vegetables-denver-possible.trycloudflare.com
```

✅ **Copy this URL** (frontend tunnel URL)

### Step 3: Update Frontend Environment

Edit `main/client/.env`:

```
VITE_API_URL=https://aviation-university-drainage-films.trycloudflare.com
```

Replace with your **actual backend tunnel URL** from Step 1.

### Step 4: Restart Frontend Dev Server

In the client directory terminal:

```powershell
cd main\client
npm run dev
```

The dev server will restart and pick up the new `.env` value.

### Step 5: Update Vite Config (if needed)

The [main/client/vite.config.ts](main/client/vite.config.ts) already allows `.trycloudflare.com` domains:

```typescript
server: {
  allowedHosts: [
    '.trycloudflare.com',
    'localhost',
    '127.0.0.1',
  ],
}
```

### Step 6: Test on Other Devices

1. On your phone/tablet, open the **frontend tunnel URL**:
   ```
   https://importantly-vegetables-denver-possible.trycloudflare.com
   ```

2. Navigate to Dashboard or Reports
3. Verify data loads from the database

✅ If you see statistics and data, everything is working!

---

## Option 2: Permanent Tunnel (Recommended for Production)

### Prerequisites
- Cloudflare account (free at cloudflare.com)
- Your own domain (or use free cloudflare.page subdomain)
- cloudflared installed

### Step 1: Authenticate Cloudflared

```powershell
"C:\Program Files (x86)\cloudflared\cloudflared.exe" login
```

This will:
- Open your browser
- Ask you to authorize with Cloudflare
- Store credentials locally

### Step 2: Create Backend Tunnel Config

Create `main\server\cloudflare-tunnel.yml`:

```yaml
tunnel: flrt-backend
credentials-file: C:\Users\tulal\AppData\Roaming\cloudflared\flrt-backend.json

ingress:
  - hostname: backend.yoursite.com  # Or your actual domain
    service: http://localhost:5000
  - service: http_status:404
```

### Step 3: Create and Run Backend Tunnel

```powershell
# Create the tunnel
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel create flrt-backend

# Run it with config
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run flrt-backend --config main\server\cloudflare-tunnel.yml
```

### Step 4: Create Frontend Tunnel Config

Create `main\client\cloudflare-tunnel.yml`:

```yaml
tunnel: flrt-frontend
credentials-file: C:\Users\tulal\AppData\Roaming\cloudflared\flrt-frontend.json

ingress:
  - hostname: app.yoursite.com  # Or your actual domain
    service: http://localhost:3000
  - service: http_status:404
```

### Step 5: Run Frontend Tunnel

```powershell
# Create the tunnel
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel create flrt-frontend

# Run it with config
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run flrt-frontend --config main\client\cloudflare-tunnel.yml
```

### Step 6: Update DNS Records

In your Cloudflare dashboard:
1. Add CNAME records:
   - `backend.yoursite.com` → tunnel UUID from Step 3 output
   - `app.yoursite.com` → tunnel UUID from Step 5 output

2. Proxy both through Cloudflare (orange cloud icon)

### Step 7: Update Frontend .env

```
VITE_API_URL=https://backend.yoursite.com
```

### Step 8: Test

Visit: `https://app.yoursite.com`

---

## Troubleshooting

### "Cannot fetch data" on other devices

**Problem:** Frontend loads but dashboard shows no data.

**Solution:**
1. Check `main/client/.env` has correct **backend tunnel URL**
2. Restart frontend dev server (`npm run dev`)
3. Clear browser cache (Ctrl+Shift+Delete)
4. Check browser console for API errors

### "Blocked request" error

**Problem:** Vite rejects tunnel domain.

**Solution:** Verify [main/client/vite.config.ts](main/client/vite.config.ts) has:
```typescript
server: {
  allowedHosts: ['.trycloudflare.com', 'localhost']
}
```

### Tunnel URL changes after restart

**Problem:** Quick Tunnel URLs are temporary.

**Solution:** Use Option 2 (Permanent Tunnel) for stable URLs.

### Backend API returns 500 errors

**Problem:** Database or Redis connection issues.

**Solution:**
- Ensure PostgreSQL is running
- Ensure Redis is running on `localhost:6379`
- Check `main/server/.env` has correct `DB_*` variables

### "Connection refused" on tunnel

**Problem:** Local service not running.

**Solution:**
- Backend: Flask app must be running on `http://localhost:5000`
- Frontend: Vite must be running on `http://localhost:3000`

---

## Quick Reference - Current Setup

| Component | Local | Tunnel |
|-----------|-------|--------|
| Backend | http://localhost:5000 | https://aviation-university-drainage-films.trycloudflare.com |
| Frontend | http://localhost:3000 | https://importantly-vegetables-denver-possible.trycloudflare.com |
| API Base | (env: VITE_API_URL) | https://aviation-university-drainage-films.trycloudflare.com |

---

## Files Modified

- [main/client/.env](main/client/.env) - Added `VITE_API_URL` (backend tunnel)
- [main/client/vite.config.ts](main/client/vite.config.ts) - Added `allowedHosts` for tunnel domains
- [main/client/src/services/api.ts](main/client/src/services/api.ts) - Uses `VITE_API_URL` env var
- [main/server/.env](main/server/.env) - Already configured

---

## Next Steps

1. **For Testing:** Use Option 1 (Quick Tunnel) - you're already set up
2. **For Production:** Follow Option 2 (Permanent Tunnel) with your domain
3. **Security:** Add authentication to your Tunnel routes on Cloudflare dashboard

---

