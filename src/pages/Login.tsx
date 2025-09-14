import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';

const TEST_ACCOUNTS = [
  { email: 'admin@acme.test', tenant: 'Acme', role: 'Admin' },
  { email: 'user@acme.test', tenant: 'Acme', role: 'Member' },
  { email: 'admin@globex.test', tenant: 'Globex', role: 'Admin' },
  { email: 'user@globex.test', tenant: 'Globex', role: 'Member' },
];

export default function Login() {
  const [email, setEmail] = useState('admin@acme.test');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await login(email, password);
      
      // Store authentication data
      localStorage.setItem('token', response.token);
      localStorage.setItem('email', response.user.email);
      localStorage.setItem('role', response.user.role);
      localStorage.setItem('tenantSlug', response.user.tenant.slug);
      localStorage.setItem('tenantName', response.user.tenant.name);
      localStorage.setItem('plan', response.user.tenant.plan);
      
      navigate('/notes');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function selectTestAccount(testEmail: string) {
    setEmail(testEmail);
    setPassword('password');
  }

  return (
    <div className="container-narrow">
      <main className="card" style={{ marginTop: '80px' }}>
        <header className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">SaaS Notes</h1>
          <p className="text-secondary">
            Multi-tenant notes application with JWT authentication and role-based access control
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex-col gap-4 mb-6">
          <div>
            <label htmlFor="email" className="text-sm font-medium mb-2" style={{ display: 'block' }}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium mb-2" style={{ display: 'block' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <section className="card-compact">
          <h2 className="text-sm font-medium mb-3">Test Accounts</h2>
          <p className="text-xs text-muted mb-3">
            Click any account below to auto-fill the login form:
          </p>
          
          <div className="flex-col gap-2">
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="btn text-sm"
                onClick={() => selectTestAccount(account.email)}
                style={{ 
                  justifyContent: 'flex-start', 
                  textAlign: 'left',
                  padding: '8px 12px'
                }}
              >
                <div className="flex-col">
                  <div className="font-medium">{account.email}</div>
                  <div className="text-xs text-muted">
                    {account.tenant} • {account.role} • Password: password
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 p-3" style={{ 
            background: 'rgb(34 197 94 / 0.1)', 
            border: '1px solid rgb(34 197 94 / 0.2)', 
            borderRadius: '8px' 
          }}>
            <h3 className="text-xs font-medium text-primary mb-1">Features Demonstrated:</h3>
            <ul className="text-xs text-muted" style={{ paddingLeft: '16px', margin: 0 }}>
              <li>Multi-tenant data isolation</li>
              <li>Role-based access control</li>
              <li>Subscription plan limits (Free: 3 notes max)</li>
              <li>Admin upgrade capabilities</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}