# Production Deployment Setup Guide

## Architecture
- **Frontend**: React + Vite → Deployed on Vercel
- **Backend**: Express + Socket.IO → Deployed on Render
- **Database**: MongoDB → MongoDB Atlas
- **Media**: Cloudinary

---

## Step 1: Backend Deployment (Render)

### Create Render Account & Service
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Select `backend` as root directory
5. Set Build Command: `npm install`
6. Set Start Command: `npm start`

### Environment Variables for Render
Add these in Render dashboard (Settings → Environment):

```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chat-app
JWT_SECRET=your-secret-key-here
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
FRONTEND_URL=https://your-vercel-app.vercel.app
```

**Note**: Replace placeholder values with your actual credentials.

---

## Step 2: Frontend Deployment (Vercel)

### Create Vercel Account & Project
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set Framework: `Vite`
4. Set Root Directory: `frontend`
5. Build Command: `npm run build`
6. Output Directory: `dist`

### Environment Variables for Vercel
Add these in Vercel Project Settings → Environment Variables:

```
VITE_SERVER_URL=https://your-render-backend.onrender.com
VITE_API_URL=https://your-render-backend.onrender.com
VITE_SOCKET_URL=https://your-render-backend.onrender.com
```

Replace `your-render-backend` with your actual Render backend URL.

---

## Step 3: MongoDB Atlas Setup

1. Create account at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a new cluster
3. Create a database user with username and password
4. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/chat-app`
5. Add this to both Render and Backend `.env` as `MONGODB_URI`

---

## Step 4: Cloudinary Setup

1. Create account at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard to find:
   - Cloud Name
   - API Key
   - API Secret
3. Add these to Render environment variables

---

## Step 5: Local Configuration Files

### Frontend: `.env.production`
```
VITE_SERVER_URL=https://your-render-backend.onrender.com
VITE_API_URL=https://your-render-backend.onrender.com
VITE_SOCKET_URL=https://your-render-backend.onrender.com
```

### Frontend: `vercel.json`
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Frontend: `public/_redirects`
```
/* /index.html 200
```

---

## Step 6: Commit & Push Changes

```bash
git add .
git commit -m "Add production deployment configuration"
git push origin main
```

Once pushed:
- **Vercel** will automatically redeploy frontend
- **Render** will automatically redeploy backend

---

## Troubleshooting

### "Cannot GET /"
- Check `vercel.json` or `_redirects` file exists in frontend

### WebSocket connection failed
- Verify `VITE_SOCKET_URL` matches your Render backend URL
- Check CORS settings in backend (FRONTEND_URL)

### 404 on API calls
- Ensure `VITE_API_URL` points to correct Render backend
- Verify backend is running on Render (check logs)

### Database connection error
- Verify `MONGODB_URI` is set in Render environment
- Check MongoDB Atlas IP whitelist includes Render IPs
- Use connection string format: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`

---

## Important Notes

1. **Never commit `.env` file** - Always use platform's environment variable settings
2. **Production SECRET**: Use a strong, random JWT_SECRET (not the one in .env)
3. **CORS Origin**: Keep FRONTEND_URL in sync with actual Vercel deployment URL
4. **WebSocket**: Socket.IO requires secure WebSocket (wss://) in production
5. **Cold Starts**: Render free tier has 15-minute inactivity cold starts

---

## Deployment Checklist

- [ ] Backend `.env` configured locally
- [ ] Frontend `.env.production` created
- [ ] `vercel.json` added to frontend
- [ ] `_redirects` file verified in frontend/public/
- [ ] MongoDB Atlas cluster created with database user
- [ ] Cloudinary account with credentials
- [ ] Render account with backend service configured
- [ ] Vercel account with frontend project configured
- [ ] All environment variables set in Render dashboard
- [ ] All environment variables set in Vercel dashboard
- [ ] Changes committed and pushed to GitHub
- [ ] Frontend deployed on Vercel
- [ ] Backend deployed on Render
- [ ] WebSocket connection tested
- [ ] API endpoints tested from production

