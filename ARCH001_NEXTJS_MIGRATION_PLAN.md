# ARCH-001: Next.js 14 Migration Plan

## Overview

Migrate ClickView frontend from Vite + React to Next.js 14 with App Router for improved performance, SEO, and developer experience.

**Status**: Planned (Phase 2)
**Priority**: Medium (after GraphQL and TimescaleDB)
**Estimated Effort**: 60-80 hours
**Dependencies**: None

---

## Current Architecture

### Frontend Stack (Vite)
- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.10
- **Router**: React Router DOM 6.20.1
- **State Management**: Zustand 4.4.7 + React Query 3.39.3
- **Styling**: Tailwind CSS 3.3.6
- **Charts**: Recharts 2.10.3

### File Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── WorkspacesPage.tsx
│   │   └── ...
│   ├── services/
│   │   └── api.ts
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

---

## Next.js 14 Target Architecture

### Benefits
1. **Performance**:
   - Server-Side Rendering (SSR)
   - Static Site Generation (SSG)
   - Automatic code splitting
   - Built-in image optimization
   - Font optimization

2. **SEO**:
   - Better search engine indexing
   - Meta tag management
   - Dynamic OG images

3. **Developer Experience**:
   - File-based routing
   - API routes co-located
   - TypeScript first-class support
   - Built-in optimization

4. **Enterprise Features**:
   - Middleware for auth
   - Edge runtime support
   - Streaming SSR
   - React Server Components

### New File Structure
```
frontend-nextjs/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── workspaces/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── dashboards/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── ... (proxy to backend)
│   ├── layout.tsx (root)
│   └── page.tsx (home)
├── components/
│   ├── auth/
│   ├── dashboard/
│   ├── shared/
│   └── ui/
├── lib/
│   ├── auth.ts
│   ├── api-client.ts
│   └── utils.ts
├── middleware.ts
├── next.config.js
└── package.json
```

---

## Migration Strategy

### Phase 1: Setup & Infrastructure (8 hours)

#### 1.1 Initialize Next.js Project
```bash
npx create-next-app@latest frontend-nextjs --typescript --tailwind --app --src-dir
```

#### 1.2 Install Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.14.2",
    "zustand": "^4.4.7",
    "recharts": "^2.10.3",
    "date-fns": "^2.30.0",
    "lucide-react": "^0.294.0",
    "react-hot-toast": "^2.4.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "typescript": "^5"
  }
}
```

#### 1.3 Configure Next.js
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // API proxy to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/api/:path*',
      },
    ];
  },

  // Image optimization
  images: {
    domains: ['localhost', 'your-cdn-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
```

#### 1.4 Configure TypeScript
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Phase 2: Authentication Migration (12 hours)

#### 2.1 Create Middleware for Auth
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('clickview_token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/register');

  // Redirect to login if not authenticated
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if already authenticated
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/workspaces', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

#### 2.2 Create Auth Context (Client Component)
```typescript
// app/providers.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Similar to existing AuthContext but adapted for Next.js
```

#### 2.3 Server Actions for Auth
```typescript
// app/actions/auth.ts
'use server';

import { cookies } from 'next/headers';

export async function loginAction(email: string, password: string) {
  // Server-side login logic
  const response = await fetch(`${process.env.API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (response.ok) {
    const { token } = await response.json();
    cookies().set('clickview_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }

  return response;
}
```

### Phase 3: Component Migration (20 hours)

#### 3.1 Convert Pages to App Router

**Before (React Router)**:
```typescript
// src/pages/WorkspacesPage.tsx
export const WorkspacesPage = () => {
  // Component logic
};
```

**After (Next.js App Router)**:
```typescript
// app/(dashboard)/workspaces/page.tsx
export default function WorkspacesPage() {
  // Component logic - same
}

// Optional: Add metadata
export const metadata = {
  title: 'Workspaces | ClickView',
  description: 'Manage your workspaces',
};
```

#### 3.2 Layout Components

**Root Layout**:
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'ClickView - Enterprise BI Platform',
  description: 'World-class business intelligence and reporting',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

**Dashboard Layout**:
```typescript
// app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### 3.3 Client vs Server Components

**Server Component (Default)**:
```typescript
// app/(dashboard)/workspaces/page.tsx
import { getWorkspaces } from '@/lib/api';

// This runs on the server
export default async function WorkspacesPage() {
  const workspaces = await getWorkspaces();

  return (
    <div>
      <h1>Workspaces</h1>
      {workspaces.map(workspace => (
        <WorkspaceCard key={workspace.id} workspace={workspace} />
      ))}
    </div>
  );
}
```

**Client Component (Interactive)**:
```typescript
// components/WorkspaceCard.tsx
'use client';

import { useState } from 'react';

export function WorkspaceCard({ workspace }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Client-side interactivity
  return (
    <div onClick={() => setIsExpanded(!isExpanded)}>
      {/* ... */}
    </div>
  );
}
```

### Phase 4: API Routes Migration (8 hours)

#### 4.1 Create API Route Handlers
```typescript
// app/api/workspaces/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const token = cookies().get('clickview_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Proxy to backend API
  const response = await fetch(`${process.env.API_URL}/api/workspaces`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  // POST handler
}
```

### Phase 5: Optimization & Performance (12 hours)

#### 5.1 Implement SSG for Static Pages
```typescript
// app/(dashboard)/dashboards/[id]/page.tsx
export async function generateStaticParams() {
  const dashboards = await getDashboards();

  return dashboards.map((dashboard) => ({
    id: dashboard.id,
  }));
}

export default async function DashboardPage({ params }: { params: { id: string } }) {
  const dashboard = await getDashboard(params.id);

  return <Dashboard data={dashboard} />;
}
```

#### 5.2 Image Optimization
```typescript
import Image from 'next/image';

// Before
<img src={user.avatar} alt={user.name} />

// After
<Image
  src={user.avatar}
  alt={user.name}
  width={40}
  height={40}
  className="rounded-full"
  priority={false}
/>
```

#### 5.3 Streaming & Suspense
```typescript
import { Suspense } from 'react';
import { DashboardSkeleton } from '@/components/skeletons';

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
```

---

## Migration Checklist

### Pre-Migration
- [ ] Audit current component usage
- [ ] Identify client vs server components
- [ ] Document API endpoints
- [ ] Create migration test plan

### Setup
- [ ] Initialize Next.js 14 project
- [ ] Configure TypeScript
- [ ] Set up Tailwind CSS
- [ ] Install dependencies
- [ ] Configure environment variables

### Authentication
- [ ] Create middleware for route protection
- [ ] Migrate AuthContext to client component
- [ ] Implement server actions for login/logout
- [ ] Set up HTTP-only cookies
- [ ] Test auth flow

### Components
- [ ] Create root layout
- [ ] Create dashboard layout
- [ ] Migrate Login page
- [ ] Migrate Register page
- [ ] Migrate Workspaces page
- [ ] Migrate Dashboards page
- [ ] Migrate Widget components
- [ ] Update all imports and paths

### API Routes
- [ ] Create API route handlers
- [ ] Implement request proxying
- [ ] Add error handling
- [ ] Test all endpoints

### Optimization
- [ ] Implement image optimization
- [ ] Add loading states with Suspense
- [ ] Configure font optimization
- [ ] Set up caching strategies
- [ ] Add meta tags for SEO

### Testing
- [ ] Test authentication flow
- [ ] Test all pages render correctly
- [ ] Test client-side interactions
- [ ] Test API routes
- [ ] Performance testing
- [ ] SEO audit

### Deployment
- [ ] Update build scripts
- [ ] Configure production environment
- [ ] Set up CDN for static assets
- [ ] Deploy to staging
- [ ] Deploy to production

---

## Performance Targets

### Before (Vite + React)
- First Contentful Paint (FCP): ~1.2s
- Largest Contentful Paint (LCP): ~2.5s
- Time to Interactive (TTI): ~3.0s
- Total Bundle Size: ~800KB

### After (Next.js 14)
- First Contentful Paint (FCP): ~0.6s (50% improvement)
- Largest Contentful Paint (LCP): ~1.2s (52% improvement)
- Time to Interactive (TTI): ~1.5s (50% improvement)
- Total Bundle Size: ~400KB (50% reduction via code splitting)
- Lighthouse Score: 95+ (Performance)

---

## Risks & Mitigation

### Risk 1: Breaking Changes
- **Mitigation**: Run both Vite and Next.js in parallel during migration
- **Rollback Plan**: Keep Vite version until Next.js is fully tested

### Risk 2: Third-Party Library Compatibility
- **Mitigation**: Test all libraries in Next.js environment first
- **Alternative**: Find Next.js-compatible alternatives

### Risk 3: Learning Curve
- **Mitigation**: Team training on App Router and Server Components
- **Resources**: Official Next.js documentation, tutorials

### Risk 4: SSR Performance
- **Mitigation**: Use Static Site Generation where possible
- **Monitoring**: Set up performance monitoring from day 1

---

## Timeline

### Week 1-2: Setup & Authentication (16 hours)
- Project initialization
- Configure build tools
- Migrate authentication

### Week 3-4: Component Migration (24 hours)
- Convert all pages
- Update layouts
- Test thoroughly

### Week 5: API & Optimization (16 hours)
- API route handlers
- Image optimization
- Performance tuning

### Week 6: Testing & Deployment (4 hours)
- Comprehensive testing
- Staging deployment
- Production rollout

**Total Estimated Time**: 60 hours over 6 weeks

---

## Alternative: Incremental Migration

Instead of full migration, consider incremental approach:

1. **Keep Vite for now**: Continue using Vite + React
2. **Add Next.js for new features**: Use Next.js for new pages only
3. **Migrate gradually**: Move one page at a time over months
4. **Use micro-frontends**: Run both frameworks side-by-side

This reduces risk but increases complexity.

---

## Decision

**Recommendation**: Defer ARCH-001 until after completing:
1. ARCH-002 (GraphQL API)
2. ARCH-003 (TimescaleDB)
3. VIZ-001 (Visualization Engine)

**Rationale**:
- Backend architecture is more critical right now
- GraphQL will improve frontend regardless of framework
- TimescaleDB enables better time-series queries
- Visualization engine provides immediate business value
- Next.js migration can leverage improved backend APIs

**Status**: PLANNED (Phase 2 - Priority 3)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-21
**Author**: Claude Code AI Agent
