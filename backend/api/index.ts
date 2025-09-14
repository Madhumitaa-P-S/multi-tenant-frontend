import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/vercel';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const config = { runtime: 'nodejs18.x' };

type JWTPayload = {
  sub: number;
  email: string;
  role: 'admin' | 'member';
  tenantId: number;
  tenantSlug: string;
  plan: 'free' | 'pro';
};

const app = new Hono();

// CORS configuration - allows all origins for testing
app.use('*', cors({ 
  origin: '*', 
  allowHeaders: ['Content-Type', 'Authorization'], 
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] 
}));

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

if (!DATABASE_URL) {
  console.warn('DATABASE_URL is not set. Please configure it in Vercel environment variables.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function query<T = any>(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(text, params);
    return result;
  } finally {
    client.release();
  }
}

let initialized = false;

async function initializeDatabase() {
  if (initialized) return;
  
  try {
    // Create tables
    await query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro')),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin','member')),
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notes_tenant ON notes(tenant_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);`);

    // Insert default tenants
    await query(`
      INSERT INTO tenants (slug, name, plan) VALUES
        ('acme', 'Acme Corporation', 'free'),
        ('globex', 'Globex Corporation', 'free')
      ON CONFLICT (slug) DO NOTHING;
    `);

    // Get tenant IDs
    const acmeTenant = (await query<{id: number}>(`SELECT id FROM tenants WHERE slug = 'acme'`)).rows[0];
    const globexTenant = (await query<{id: number}>(`SELECT id FROM tenants WHERE slug = 'globex'`)).rows[0];

    // Hash default password
    const passwordHash = await bcrypt.hash('password', 10);

    // Insert default users for Acme
    await query(`
      INSERT INTO users (email, password_hash, role, tenant_id) VALUES
        ('admin@acme.test', $1, 'admin', $2),
        ('user@acme.test', $1, 'member', $2)
      ON CONFLICT (email) DO NOTHING;
    `, [passwordHash, acmeTenant.id]);

    // Insert default users for Globex
    await query(`
      INSERT INTO users (email, password_hash, role, tenant_id) VALUES
        ('admin@globex.test', $1, 'admin', $2),
        ('user@globex.test', $1, 'member', $2)
      ON CONFLICT (email) DO NOTHING;
    `, [passwordHash, globexTenant.id]);

    initialized = true;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { 
    algorithm: 'HS256', 
    expiresIn: '7d' 
  });
}

function requireAuth(requiredRole?: 'admin' | 'member') {
  return async (c: any, next: any) => {
    const authHeader = c.req.header('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      if (requiredRole && decoded.role !== requiredRole) {
        return c.json({ error: 'Forbidden' }, 403);
      }
      c.set('auth', decoded);
      await next();
    } catch (error) {
      return c.json({ error: 'Invalid token' }, 401);
    }
  };
}

// Health check endpoint
app.get('/health', async (c) => {
  try {
    await initializeDatabase();
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    return c.json({ status: 'error', error: 'Database connection failed' }, 500);
  }
});

// Authentication endpoint
app.post('/auth/login', async (c) => {
  await initializeDatabase();
  
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  try {
    const userResult = await query<{
      id: number;
      email: string;
      password_hash: string;
      role: 'admin' | 'member';
      tenant_id: number;
    }>(`SELECT id, email, password_hash, role, tenant_id FROM users WHERE email = $1`, [email]);

    const user = userResult.rows[0];
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const tenantResult = await query<{
      id: number;
      slug: string;
      name: string;
      plan: 'free' | 'pro';
    }>(`SELECT id, slug, name, plan FROM tenants WHERE id = $1`, [user.tenant_id]);

    const tenant = tenantResult.rows[0];

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      plan: tenant.plan
    });

    return c.json({
      token,
      user: {
        email: user.email,
        role: user.role,
        tenant: {
          slug: tenant.slug,
          name: tenant.name,
          plan: tenant.plan
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Upgrade tenant to Pro (Admin only)
app.post('/tenants/:slug/upgrade', requireAuth('admin'), async (c) => {
  await initializeDatabase();
  
  const auth = c.get('auth') as JWTPayload;
  const { slug } = c.req.param();
  
  if (slug !== auth.tenantSlug) {
    return c.json({ error: 'Forbidden: Cannot upgrade other tenants' }, 403);
  }

  try {
    await query(`UPDATE tenants SET plan = 'pro' WHERE id = $1`, [auth.tenantId]);
    return c.json({ success: true, plan: 'pro' });
  } catch (error) {
    console.error('Upgrade error:', error);
    return c.json({ error: 'Upgrade failed' }, 500);
  }
});

// Admin invite endpoint (for testing role enforcement)
app.post('/tenants/:slug/invite', requireAuth('admin'), async (c) => {
  await initializeDatabase();
  
  const auth = c.get('auth') as JWTPayload;
  const { slug } = c.req.param();
  
  if (slug !== auth.tenantSlug) {
    return c.json({ error: 'Forbidden: Cannot invite to other tenants' }, 403);
  }

  const { email, role } = await c.req.json();
  if (!email || !['admin', 'member'].includes(role)) {
    return c.json({ error: 'Email and valid role are required' }, 400);
  }

  try {
    const passwordHash = await bcrypt.hash('password', 10);
    await query(`
      INSERT INTO users (email, password_hash, role, tenant_id) 
      VALUES ($1, $2, $3, $4)
    `, [email, passwordHash, role, auth.tenantId]);
    
    return c.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('duplicate')) {
      return c.json({ error: 'User already exists' }, 409);
    }
    console.error('Invite error:', error);
    return c.json({ error: 'Failed to invite user' }, 500);
  }
});

// Notes CRUD endpoints with tenant isolation and plan gating

// Get all notes for current tenant
app.get('/notes', requireAuth(), async (c) => {
  await initializeDatabase();
  
  const auth = c.get('auth') as JWTPayload;
  
  try {
    const result = await query(`
      SELECT id, title, content, user_id, created_at, updated_at 
      FROM notes 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC
    `, [auth.tenantId]);
    
    return c.json(result.rows);
  } catch (error) {
    console.error('Get notes error:', error);
    return c.json({ error: 'Failed to fetch notes' }, 500);
  }
});

// Get specific note
app.get('/notes/:id', requireAuth(), async (c) => {
  await initializeDatabase();
  
  const auth = c.get('auth') as JWTPayload;
  const { id } = c.req.param();
  
  try {
    const result = await query(`
      SELECT id, title, content, user_id, created_at, updated_at 
      FROM notes 
      WHERE id = $1 AND tenant_id = $2
    `, [id, auth.tenantId]);
    
    const note = result.rows[0];
    if (!note) {
      return c.json({ error: 'Note not found' }, 404);
    }
    
    return c.json(note);
  } catch (error) {
    console.error('Get note error:', error);
    return c.json({ error: 'Failed to fetch note' }, 500);
  }
});

// Create new note
app.post('/notes', requireAuth(), async (c) => {
  await initializeDatabase();
  
  const auth = c.get('auth') as JWTPayload;
  const { title, content } = await c.req.json();
  
  if (!title || !content) {
    return c.json({ error: 'Title and content are required' }, 400);
  }

  try {
    // Check free plan limit
    const tenantResult = await query<{plan: 'free' | 'pro'}>(`
      SELECT plan FROM tenants WHERE id = $1
    `, [auth.tenantId]);
    
    const tenant = tenantResult.rows[0];
    
    if (tenant.plan === 'free') {
      const countResult = await query<{count: string}>(`
        SELECT COUNT(*)::text as count FROM notes WHERE tenant_id = $1
      `, [auth.tenantId]);
      
      const noteCount = parseInt(countResult.rows[0].count);
      if (noteCount >= 3) {
        return c.json({ 
          error: 'note_limit_reached', 
          message: 'Free plan is limited to 3 notes. Upgrade to Pro for unlimited notes.' 
        }, 402);
      }
    }

    const result = await query(`
      INSERT INTO notes (tenant_id, user_id, title, content) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, title, content, user_id, created_at, updated_at
    `, [auth.tenantId, auth.sub, title, content]);
    
    return c.json(result.rows[0], 201);
  } catch (error) {
    console.error('Create note error:', error);
    return c.json({ error: 'Failed to create note' }, 500);
  }
});

// Update note
app.put('/notes/:id', requireAuth(), async (c) => {
  await initializeDatabase();
  
  const auth = c.get('auth') as JWTPayload;
  const { id } = c.req.param();
  const { title, content } = await c.req.json();
  
  try {
    // Check if note exists and belongs to tenant
    const noteResult = await query<{user_id: number}>(`
      SELECT user_id FROM notes WHERE id = $1 AND tenant_id = $2
    `, [id, auth.tenantId]);
    
    const note = noteResult.rows[0];
    if (!note) {
      return c.json({ error: 'Note not found' }, 404);
    }
    
    // Members can only edit their own notes
    if (auth.role === 'member' && note.user_id !== auth.sub) {
      return c.json({ error: 'Forbidden: You can only edit your own notes' }, 403);
    }

    const result = await query(`
      UPDATE notes 
      SET title = COALESCE($1, title), content = COALESCE($2, content), updated_at = NOW()
      WHERE id = $3 
      RETURNING id, title, content, user_id, created_at, updated_at
    `, [title, content, id]);
    
    return c.json(result.rows[0]);
  } catch (error) {
    console.error('Update note error:', error);
    return c.json({ error: 'Failed to update note' }, 500);
  }
});

// Delete note
app.delete('/notes/:id', requireAuth(), async (c) => {
  await initializeDatabase();
  
  const auth = c.get('auth') as JWTPayload;
  const { id } = c.req.param();
  
  try {
    // Check if note exists and belongs to tenant
    const noteResult = await query<{user_id: number}>(`
      SELECT user_id FROM notes WHERE id = $1 AND tenant_id = $2
    `, [id, auth.tenantId]);
    
    const note = noteResult.rows[0];
    if (!note) {
      return c.json({ error: 'Note not found' }, 404);
    }
    
    // Members can only delete their own notes
    if (auth.role === 'member' && note.user_id !== auth.sub) {
      return c.json({ error: 'Forbidden: You can only delete your own notes' }, 403);
    }

    await query(`DELETE FROM notes WHERE id = $1`, [id]);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    return c.json({ error: 'Failed to delete note' }, 500);
  }
});

export default handle(app);