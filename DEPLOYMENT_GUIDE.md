# Complete Deployment Guide

## Quick Overview

You now have two directories ready for GitHub:
- **`backend/`** - Hono + PostgreSQL API (Vercel Serverless)
- **`frontend/`** - React + TypeScript SPA (Vercel Static)

## Step 1: Push to GitHub

### Option A: Single Repository (Monorepo)
```bash
git init
git add .
git commit -m "Multi-tenant SaaS Notes application"
git branch -M main
git remote add origin https://github.com/yourusername/saas-notes.git
git push -u origin main
```

### Option B: Separate Repositories
```bash
# Backend
cd backend
git init
git add .
git commit -m "Notes API backend"
git remote add origin https://github.com/yourusername/notes-backend.git
git push -u origin main

# Frontend  
cd ../frontend
git init
git add .
git commit -m "Notes React frontend"
git remote add origin https://github.com/yourusername/notes-frontend.git
git push -u origin main
```

## Step 2: Deploy Backend

### 2.1 Create Vercel Project
1. Go to [vercel.com](https://vercel.com)
2. "New Project" → Import from GitHub
3. Select your backend repository (or `backend/` folder if monorepo)

### 2.2 Set Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

**Required:**
- `DATABASE_URL` = Your PostgreSQL connection string
- `JWT_SECRET` = Any random 32+ character string

**Getting DATABASE_URL:**

**Option A: Vercel Postgres (Recommended)**
1. In your Vercel project → Storage → Create Database → Postgres
2. Copy the `POSTGRES_URL` and use as `DATABASE_URL`

**Option B: Neon (Free tier)**
1. Sign up at [neon.tech](https://neon.tech)
2. Create database → Copy connection string
3. Use as `DATABASE_URL`

**Option C: Railway**
1. Sign up at [railway.app](https://railway.app)  
2. New Project → PostgreSQL → Copy connection string

### 2.3 Deploy
Click "Deploy" - your backend will be live at `https://your-backend.vercel.app`

**Test it:**
```bash
curl https://your-backend.vercel.app/health
# Should return: {"status":"ok","timestamp":"..."}
```

## Step 3: Deploy Frontend

### 3.1 Create Vercel Project  
1. "New Project" → Import your frontend repository
2. Framework: Vite detected automatically

### 3.2 Set Environment Variables
In Vercel Dashboard → Settings → Environment Variables:
- `VITE_API_URL` = `https://your-backend.vercel.app`

### 3.3 Deploy
Click "Deploy" - your frontend will be live at `https://your-frontend.vercel.app`

## Step 4: Test Complete Application

### 4.1 Test Accounts (password: `password`)
- `admin@acme.test` - Acme Admin
- `user@acme.test` - Acme Member  
- `admin@globex.test` - Globex Admin
- `user@globex.test` - Globex Member

### 4.2 Verify Requirements

**Multi-tenancy:**
- Login as Acme user → create notes
- Login as Globex user → should see different notes
- Data should be completely isolated

**Role-based Access:**  
- Member: Can only create/view/edit/delete notes
- Admin: Can upgrade subscription + invite users

**Subscription Limits:**
- Free plan: Max 3 notes per tenant
- Try creating 4th note → should show upgrade prompt
- Admin can upgrade to Pro → unlimited notes

**API Endpoints:**
```bash
# Health check
GET https://your-backend.vercel.app/health

# Login  
POST https://your-backend.vercel.app/auth/login
{"email":"admin@acme.test","password":"password"}

# Notes CRUD
GET/POST/PUT/DELETE https://your-backend.vercel.app/notes

# Upgrade (Admin only)
POST https://your-backend.vercel.app/tenants/acme/upgrade
```

## Step 5: Submit Assignment

**Your submission URLs:**
- **Frontend:** `https://your-frontend.vercel.app`
- **Backend:** `https://your-backend.vercel.app` 
- **Health:** `https://your-backend.vercel.app/health`
- **GitHub:** `https://github.com/yourusername/your-repo`

## Troubleshooting

### Backend Issues
- **500 errors:** Check Vercel logs → Functions tab
- **Database connection:** Verify `DATABASE_URL` format
- **CORS errors:** Check `cors()` configuration in `api/index.ts`

### Frontend Issues  
- **API calls fail:** Verify `VITE_API_URL` points to backend
- **Login doesn't work:** Check browser console for errors
- **Build fails:** Check TypeScript errors in Vercel build logs

### Common Solutions
```bash
# Check backend logs
vercel logs https://your-backend.vercel.app

# Test API directly
curl -X POST https://your-backend.vercel.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.test","password":"password"}'

# Verify environment variables
# Backend: DATABASE_URL, JWT_SECRET
# Frontend: VITE_API_URL
```

## Architecture Summary

**Multi-tenancy Approach:** Shared schema with tenant ID
- Single database with `tenant_id` column  
- Application-level isolation in all queries
- Strict tenant verification in middleware

**Key Features Implemented:**
✅ JWT authentication with 4 test accounts  
✅ Role-based access (Admin/Member)  
✅ Multi-tenant data isolation  
✅ Subscription limits (Free: 3 notes, Pro: unlimited)  
✅ CRUD operations with proper authorization  
✅ Admin upgrade functionality  
✅ Responsive frontend with error handling  
✅ Health endpoint for monitoring  
✅ CORS enabled for automated testing  

Your application is now ready for submission! 🚀