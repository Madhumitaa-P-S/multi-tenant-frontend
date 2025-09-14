# Notes Backend API

Multi-tenant SaaS Notes application backend built with Hono and PostgreSQL, deployed on Vercel.

## Architecture

**Multi-tenancy Approach**: Shared schema with tenant ID column
- Single database with `tenant_id` column in all tenant-specific tables
- Row Level Security enforced at application level
- Strict tenant isolation in all API endpoints

## Features

- JWT-based authentication
- Role-based access control (Admin/Member)
- Multi-tenant data isolation
- Subscription-based feature gating (Free/Pro plans)
- CRUD operations for notes
- RESTful API design

## Environment Variables

Set these in your Vercel project:

- `DATABASE_URL`: PostgreSQL connection string (Vercel Postgres or Neon)
- `JWT_SECRET`: Secret key for JWT signing

## API Endpoints

### Health Check
- `GET /health` - Returns API status

### Authentication
- `POST /auth/login` - Login with email/password

### Tenant Management
- `POST /tenants/:slug/upgrade` - Upgrade tenant to Pro plan (Admin only)
- `POST /tenants/:slug/invite` - Invite user to tenant (Admin only)

### Notes CRUD
- `GET /notes` - List all notes for current tenant
- `GET /notes/:id` - Get specific note
- `POST /notes` - Create new note
- `PUT /notes/:id` - Update note
- `DELETE /notes/:id` - Delete note

## Test Accounts

All passwords: `password`

**Acme Tenant:**
- `admin@acme.test` (Admin)
- `user@acme.test` (Member)

**Globex Tenant:**
- `admin@globex.test` (Admin)
- `user@globex.test` (Member)

## Deployment

1. Create new Vercel project
2. Connect your GitHub repository
3. Add environment variables in Vercel dashboard
4. Deploy

## Local Development

```bash
npm install
vercel dev
```

## Database Schema

- `tenants`: id, slug, name, plan
- `users`: id, email, password_hash, role, tenant_id
- `notes`: id, tenant_id, user_id, title, content, created_at