# Running ClickView Locally - Complete Guide

This guide will help you set up and run the ClickView application on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (v9 or higher) - Comes with Node.js
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

Verify installations:
```bash
node --version    # Should be v18+
npm --version     # Should be v9+
psql --version    # Should be v14+
```

---

## Quick Start (TL;DR)

```bash
# 1. Clone the repository
git clone <repository-url>
cd clickview

# 2. Setup PostgreSQL database
createdb clickview_dev

# 3. Backend setup
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev

# 4. Frontend setup (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev

# 5. Open browser
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

---

## Detailed Setup Instructions

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd clickview
```

### Step 2: Database Setup

#### Create PostgreSQL Database

```bash
# Option 1: Using createdb command
createdb clickview_dev

# Option 2: Using psql
psql postgres
CREATE DATABASE clickview_dev;
\q
```

#### Create Database User (Optional but recommended)

```bash
psql postgres
CREATE USER clickview_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE clickview_dev TO clickview_user;
\q
```

### Step 3: Backend Setup

#### Navigate to Backend Directory

```bash
cd backend
```

#### Create Environment File

```bash
# Copy example environment file
cp .env.example .env

# Or create manually
touch .env
```

#### Configure Backend Environment Variables

Edit `backend/.env`:

```bash
# Database Configuration
DATABASE_URL=postgresql://clickview_user:your_password@localhost:5432/clickview_dev
# Or if using default postgres user:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clickview_dev

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=24h

# Encryption (for share tokens, etc.)
ENCRYPTION_KEY=your-32-character-encryption-key

# ClickUp API (if you have it)
CLICKUP_CLIENT_ID=your_client_id
CLICKUP_CLIENT_SECRET=your_client_secret

# Optional: Enable mock data for development without ClickUp
USE_MOCK_DATA=true

# File Storage for Exports
EXPORT_STORAGE_PATH=/tmp/clickview/exports

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

#### Install Backend Dependencies

```bash
npm install
```

#### Run Database Migrations

```bash
# Run all migrations
npm run migrate

# Or manually if migrate script doesn't exist:
npm run migrate:latest

# Check migration status
npm run migrate:status

# If you need to rollback
npm run migrate:rollback
```

If the migration commands don't exist, you can run migrations directly:

```bash
# Using the database tool
npm run db:migrate

# Or manually execute SQL files
psql clickview_dev < src/database/migrations/001_initial_schema.sql
psql clickview_dev < src/database/migrations/002_widgets.sql
# ... repeat for all migration files
psql clickview_dev < src/database/migrations/009_dashboard_features.sql
```

#### Start Backend Server

```bash
# Development mode with hot reload
npm run dev

# Or production mode
npm start
```

Backend should now be running at: **http://localhost:5000**

Check health endpoint: **http://localhost:5000/api/health**

### Step 4: Frontend Setup

Open a **new terminal window/tab** and navigate to frontend:

```bash
cd frontend
```

#### Create Frontend Environment File

```bash
# Copy example
cp .env.example .env

# Or create manually
touch .env
```

#### Configure Frontend Environment Variables

Edit `frontend/.env`:

```bash
# Backend API URL
VITE_API_URL=http://localhost:5000/api

# App Configuration
VITE_APP_NAME=ClickView
VITE_APP_ENV=development

# Optional: GraphQL endpoint
VITE_GRAPHQL_URL=http://localhost:5000/graphql

# Optional: WebSocket URL (for future real-time features)
VITE_WS_URL=ws://localhost:5000
```

#### Install Frontend Dependencies

```bash
npm install
```

#### Start Frontend Development Server

```bash
# Development mode with hot reload
npm run dev

# Build for production (optional)
npm run build

# Preview production build
npm run preview
```

Frontend should now be running at: **http://localhost:3000**

---

## Accessing the Application

### 1. Open Your Browser

Navigate to: **http://localhost:3000**

### 2. Create Your First User

If authentication is required, you may need to register:

```bash
# Using API directly
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "username": "admin",
    "password": "password123",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

Or use the registration UI if available.

### 3. Create a Workspace

After logging in, create your first workspace to get started.

---

## Verify Everything is Working

### Backend Health Check

```bash
# Check API health
curl http://localhost:5000/api/health

# Expected response:
# {"status":"ok","timestamp":"...","database":"connected"}
```

### Database Connection Test

```bash
# Connect to database
psql clickview_dev

# Check tables exist
\dt

# Expected output should show tables like:
# - users
# - workspaces
# - dashboards
# - widgets
# - dashboard_templates
# - calculated_fields
# etc.

# Exit
\q
```

### API Documentation

Visit: **http://localhost:5000/api-docs**

This should show Swagger API documentation.

### GraphQL Playground (if enabled)

Visit: **http://localhost:5000/graphql**

---

## Development Workflow

### Running Both Servers

I recommend using **two terminal windows/tabs**:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Alternative: Using tmux or screen

```bash
# Using tmux
tmux new-session -s clickview
# Split window: Ctrl+b then "
# Switch panes: Ctrl+b then arrow keys
```

### Alternative: Using a Process Manager

Install `concurrently` in the root:

```bash
# In root directory
npm install --save-dev concurrently

# Add to root package.json:
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev"
  }
}

# Then run both with:
npm run dev
```

---

## Common Issues and Solutions

### Issue 1: Port Already in Use

**Error:** `Port 5000 is already in use`

**Solution:**
```bash
# Find process using port
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change port in backend/.env
PORT=5001
```

### Issue 2: Database Connection Failed

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
# macOS (Homebrew):
brew services start postgresql@14

# Linux (systemd):
sudo systemctl start postgresql

# Windows:
# Start from Services panel or:
net start postgresql-x64-14
```

### Issue 3: Migration Errors

**Error:** `relation "users" does not exist`

**Solution:**
```bash
# Run migrations again
cd backend
npm run migrate

# Or manually:
psql clickview_dev -f src/database/migrations/009_dashboard_features.sql
```

### Issue 4: Frontend Can't Connect to Backend

**Error:** `Network Error` or `CORS error`

**Solutions:**
1. Verify backend is running: http://localhost:5000/api/health
2. Check `VITE_API_URL` in `frontend/.env`
3. Verify `FRONTEND_URL` in `backend/.env` matches frontend URL
4. Clear browser cache and restart

### Issue 5: Missing Dependencies

**Error:** `Cannot find module 'express'`

**Solution:**
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Issue 6: TypeScript Errors

**Solution:**
```bash
# Frontend
cd frontend
npm run type-check

# Backend
cd backend
npm run build
```

---

## Optional: Sample Data

### Load Sample Data (Development)

```bash
# Connect to database
psql clickview_dev

# Insert sample workspace
INSERT INTO workspaces (id, name, clickup_team_id, api_key, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Sample Workspace',
  'team_123',
  'pk_sample_key',
  true
);

# Insert sample user
INSERT INTO users (id, email, username, password_hash, first_name, last_name)
VALUES (
  '660e8400-e29b-41d4-a716-446655440000',
  'demo@example.com',
  'demo',
  '$2b$10$sample_hash',  -- This won't work for login, use registration
  'Demo',
  'User'
);
```

---

## Testing

### Run Backend Tests

```bash
cd backend
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Run Frontend Tests

```bash
cd frontend
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

---

## Building for Production

### Backend Production Build

```bash
cd backend
npm run build
npm start
```

### Frontend Production Build

```bash
cd frontend
npm run build

# Files will be in frontend/dist/
# Serve with any static file server
npx serve -s dist
```

---

## Development Tools

### API Testing

**Using curl:**
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"demo","password":"password123"}'

# Get dashboards
curl http://localhost:5000/api/dashboards \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Using Postman:**
1. Import API collection from `/postman/` folder (if available)
2. Set environment variables
3. Test endpoints

### Database GUI Tools

**Recommended:**
- **pgAdmin** - Full-featured GUI
- **DBeaver** - Multi-database tool
- **Postico** - macOS only, simple and clean
- **TablePlus** - Cross-platform

Connection details:
- Host: localhost
- Port: 5432
- Database: clickview_dev
- Username: clickview_user (or postgres)
- Password: your_password

### VS Code Extensions

Recommended extensions:
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **PostgreSQL** - Database management
- **Thunder Client** - API testing
- **GitLens** - Git integration

---

## Environment-Specific Configurations

### Development
- Hot reload enabled
- Detailed error messages
- Source maps enabled
- Mock data available
- Logging: verbose

### Staging (Optional)
```bash
# Backend
NODE_ENV=staging
USE_MOCK_DATA=false

# Frontend
VITE_APP_ENV=staging
```

### Production
```bash
# Backend
NODE_ENV=production
USE_MOCK_DATA=false

# Frontend
VITE_APP_ENV=production
```

---

## Stopping the Application

```bash
# Stop servers with Ctrl+C in each terminal

# Or if running as background processes:
# Find processes
ps aux | grep node

# Kill processes
kill <PID>
```

---

## Cleaning Up

### Reset Database

```bash
# Drop and recreate database
dropdb clickview_dev
createdb clickview_dev

# Run migrations again
cd backend
npm run migrate
```

### Clear Node Modules

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Clear Build Files

```bash
# Backend
cd backend
rm -rf dist build

# Frontend
cd frontend
rm -rf dist .vite
```

---

## Getting Help

### Documentation
- Frontend Features: `/DASHBOARD_FEATURES.md`
- User Guide: `/DASHBOARD_USER_GUIDE.md`
- Backend API: `/backend/BACKEND_IMPLEMENTATION.md`
- API Docs: http://localhost:5000/api-docs

### Logs
- Backend logs: Check terminal output
- Frontend logs: Browser console (F12)
- Database logs: PostgreSQL logs location varies by OS

### Support
- Check GitHub Issues
- Review documentation
- Check error logs

---

## Next Steps

After getting the application running:

1. ✅ Create your first workspace
2. ✅ Connect to ClickUp (or use mock data)
3. ✅ Create your first dashboard
4. ✅ Add widgets to visualize data
5. ✅ Explore all 7 weeks of features!

Enjoy using ClickView! 🚀

---

*Last updated: 2025*
