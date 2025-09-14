# Notes Frontend

Modern React frontend for the multi-tenant SaaS Notes application with TypeScript, Vite, and responsive design.

## Features

- **Modern React**: Built with React 18 and TypeScript
- **Responsive Design**: Mobile-first CSS with custom design system
- **Authentication**: JWT-based login with secure token storage
- **Role-based UI**: Different interfaces for Admin and Member users
- **Real-time Updates**: Instant feedback and state management
- **Accessibility**: WCAG-compliant components with proper ARIA labels
- **SEO Optimized**: Semantic HTML and meta tags

## Architecture

- **State Management**: React hooks with localStorage persistence
- **Routing**: React Router v6 with protected routes
- **API Layer**: Centralized API service with error handling
- **Styling**: Custom CSS design system with CSS variables
- **Build Tool**: Vite for fast development and optimized builds

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=https://your-backend-domain.vercel.app
```

## Available Scripts

```bash
# Development
npm install
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Test Accounts

All passwords: `password`

- **admin@acme.test** - Acme Admin (can upgrade, invite users)
- **user@acme.test** - Acme Member (can manage own notes)
- **admin@globex.test** - Globex Admin (can upgrade, invite users)  
- **user@globex.test** - Globex Member (can manage own notes)

## Component Structure

```
src/
├── pages/
│   ├── Login.tsx       # Authentication page
│   └── Notes.tsx       # Main notes dashboard
├── api.ts              # API service layer
├── App.tsx             # Router and route protection
├── main.tsx            # Application entry point
└── styles.css          # Design system and components
```

## Key Features Implemented

### Authentication & Security
- JWT token-based authentication
- Automatic token refresh and logout
- Protected route components
- Secure localStorage token storage

### Multi-tenancy
- Tenant-aware API calls
- Visual tenant identification
- Isolated data per tenant

### Role-based Access
- Admin vs Member UI differences
- Conditional feature access
- Role-based action permissions

### Subscription Management
- Free plan limit enforcement (3 notes max)
- Pro plan upgrade flow
- Usage indicators and warnings

### User Experience
- Loading states and error handling
- Success/error message system
- Responsive mobile design
- Accessible form controls
- Confirmation dialogs for destructive actions

## Deployment

### Vercel (Recommended)

1. **Create New Project**
   ```bash
   # Push code to GitHub
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/notes-frontend.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Connect your GitHub repository
   - Set environment variable: `VITE_API_URL`
   - Deploy

3. **Environment Variables**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://your-backend-domain.vercel.app`

### Other Platforms

The built application is a static SPA that can be deployed to any static hosting service:

- **Netlify**: Connect GitHub repo, set build command `npm run build`, publish directory `dist`
- **GitHub Pages**: Use GitHub Actions with build artifacts from `dist` folder
- **Firebase Hosting**: `npm run build` then `firebase deploy`

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Optimized bundle size with Vite
- Code splitting for route-based loading
- Efficient re-renders with React hooks
- Cached API responses where appropriate