# ClickView Setup Guide

## Quick Start with Aiven PostgreSQL

Your Aiven PostgreSQL database is already configured in the `.env` file. Follow these steps to get ClickView running:

### 1. Navigate to the Project Directory

```bash
cd /Users/larry.cortez/Library/CloudStorage/OneDrive-InformationServicesGroup(ISG)/Documents/Projects/ClickView
```

### 2. Run the Automated Setup

```bash
./setup-database.sh
```

This script will:
- Install all dependencies (backend and frontend)
- Run database migrations on your Aiven PostgreSQL instance
- Set up the application for development

### 3. Start the Application

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 3000) servers.

### 4. Access ClickView

Open your browser and navigate to: **http://localhost:3000**

## Database Connection Details

Your Aiven PostgreSQL database is hosted at:
- **Host**: pg-1e0081a1-lcortez86-7b78.h.aivencloud.com
- **Port**: 12161
- **Database**: clickview
- **User**: avnadmin
- **SSL**: Required

The connection string is already configured in your `.env` file.

## First Steps in ClickView

1. **Create a Workspace**
   - Click "Add Workspace" 
   - Enter a name for your workspace
   - Add your ClickUp API key

2. **Get Your ClickUp API Key**
   - Log into ClickUp
   - Go to Settings → Apps → API Token
   - Generate or copy your personal token

3. **Create Your First Dashboard**
   - Select your workspace
   - Navigate to Dashboards
   - Click "Create Dashboard"
   - Start adding widgets!

## Manual Database Setup (if needed)

If you need to manually run migrations:

```bash
cd backend
npm run db:migrate
```

To verify the database connection:

```bash
cd backend
npm run dev
# Check the console for "Database migration completed successfully!"
```

## Troubleshooting

### Database Connection Issues

If you encounter connection errors:

1. Verify the `.env` file has the correct DATABASE_URL
2. Ensure your IP is whitelisted in Aiven (if IP restrictions are enabled)
3. Check that SSL is enabled (sslmode=require in the connection string)

### Port Already in Use

If ports 3000 or 3001 are already in use:

```bash
# Change frontend port in frontend/vite.config.ts
# Change backend port in .env file (PORT=3001)
```

### Dependencies Installation Failed

If npm install fails:

```bash
# Clear npm cache
npm cache clean --force

# Try with legacy peer deps
npm install --legacy-peer-deps
```

## Development Commands

```bash
# Start development servers
npm run dev

# Run only backend
npm run dev:backend

# Run only frontend  
npm run dev:frontend

# Build for production
npm run build

# Run database migrations
npm run db:migrate

# Lint code
npm run lint
```

## Support

If you encounter any issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure PostgreSQL connection is working
4. Check that all dependencies are installed

## Next Steps

Once ClickView is running:
1. Connect your ClickUp workspace
2. Create dashboards with various widget types
3. Set up automated data refresh intervals
4. Share dashboards with your team
5. Customize filters and aggregations

Enjoy using ClickView! 🚀