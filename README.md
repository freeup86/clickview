# ClickView - ClickUp Dashboard Builder

ClickView is a production-ready web application that creates customizable dashboards from ClickUp data. It provides powerful visualization tools and real-time data synchronization with ClickUp workspaces.

## Features

- 🏢 **Multiple Workspace Support** - Connect and manage multiple ClickUp workspaces
- 📊 **Rich Visualizations** - 11+ chart types including KPI cards, bar charts, line charts, Gantt charts, and more
- 🎨 **Drag-and-Drop Dashboard Builder** - Intuitive grid layout system for arranging widgets
- 🔄 **Real-time Data Sync** - Auto-refresh with configurable intervals
- 🔐 **Secure API Key Storage** - AES-256 encryption for API keys
- 🎯 **Advanced Filtering** - Global and widget-level filters with custom field support
- 📈 **Data Aggregation** - SUM, AVG, COUNT, MIN, MAX operations with grouping
- 🔗 **Dashboard Sharing** - Share dashboards via unique URLs
- 💾 **Caching System** - Redis/PostgreSQL caching for optimal performance

## Tech Stack

- **Frontend**: React 18 with TypeScript, Tailwind CSS, Recharts
- **Backend**: Node.js with Express and TypeScript
- **Database**: PostgreSQL
- **Caching**: Redis (optional) or in-memory cache
- **State Management**: Zustand
- **API Integration**: ClickUp API v2

## Prerequisites

- Node.js 18+ LTS
- PostgreSQL 14+
- Redis (optional, for caching)
- ClickUp API Key

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/clickview.git
cd clickview
```

### 2. Set up PostgreSQL Database

```bash
# Create a new PostgreSQL database
createdb clickup_dashboard

# Or using psql
psql -U postgres
CREATE DATABASE clickup_dashboard;
\q
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# Update DATABASE_URL with your PostgreSQL credentials
# Add a 32-character ENCRYPTION_KEY for API key encryption
# Add a JWT_SECRET for share links
```

### 4. Install Backend Dependencies

```bash
cd backend
npm install

# Run database migrations
npm run db:migrate

# Optional: Seed database with sample data
npm run db:seed
```

### 5. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## Running the Application

### Development Mode

Start both backend and frontend servers:

```bash
# Terminal 1 - Backend (runs on port 3001)
cd backend
npm run dev

# Terminal 2 - Frontend (runs on port 3000)
cd frontend
npm run dev
```

Access the application at http://localhost:3000

### Production Mode

```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd ../backend
npm run build

# Start production server
npm start
```

## Getting Your ClickUp API Key

1. Log in to your ClickUp account
2. Navigate to Settings → Apps
3. Click on "API Token"
4. Generate or copy your personal API token
5. Use this token when creating a workspace in ClickView

## Project Structure

```
ClickView/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── validation/     # Request validation schemas
│   │   └── index.ts        # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # Zustand store
│   │   └── App.tsx         # Main app component
│   ├── package.json
│   └── vite.config.ts
├── database/
│   └── schema.sql          # Database schema
├── .env.example
└── README.md
```

## API Endpoints

### Workspace Endpoints
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces` - List workspaces
- `GET /api/workspaces/:id` - Get workspace details
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `POST /api/workspaces/:id/validate` - Validate API key
- `GET /api/workspaces/:id/hierarchy` - Get spaces/folders/lists

### Dashboard Endpoints
- `POST /api/dashboards` - Create dashboard
- `GET /api/dashboards` - List dashboards
- `GET /api/dashboards/:id` - Get dashboard with widgets
- `PUT /api/dashboards/:id` - Update dashboard
- `DELETE /api/dashboards/:id` - Delete dashboard
- `POST /api/dashboards/:id/duplicate` - Duplicate dashboard
- `POST /api/dashboards/:id/share` - Create share link
- `GET /api/dashboards/shared/:shareToken` - Get shared dashboard

### Widget Endpoints
- `POST /api/widgets` - Create widget
- `PUT /api/widgets/:id` - Update widget
- `DELETE /api/widgets/:id` - Delete widget
- `PUT /api/widgets/:id/position` - Update position
- `POST /api/widgets/batch-update` - Batch update widgets

### Data Endpoints
- `GET /api/data/tasks` - Get tasks with filters
- `GET /api/data/custom-fields` - Get custom fields
- `POST /api/data/refresh` - Trigger data refresh
- `GET /api/data/aggregate` - Get aggregated data

## Widget Types

- **KPI Cards** - Single metric display with trend indicators
- **Bar Charts** - Grouped and stacked options
- **Line Charts** - Multiple series with time-series data
- **Pie/Donut Charts** - With legends and percentage labels
- **Area Charts** - For cumulative data visualization
- **Gantt Charts** - Task timelines and dependencies
- **Heatmaps** - Activity tracking
- **Data Tables** - Sortable, searchable with pagination
- **Progress Bars** - Goal tracking
- **Burndown Charts** - Sprint tracking
- **Custom Field Summary** - Aggregate custom field data

## Database Schema

The application uses PostgreSQL with the following main tables:

- `workspaces` - ClickUp workspace connections
- `dashboards` - User-created dashboards
- `widgets` - Dashboard widgets
- `widget_data_sources` - Widget data configuration
- `widget_filters` - Widget-specific filters
- `filter_presets` - Saved filter configurations
- `cached_data` - Temporary data cache
- `api_request_logs` - API usage tracking

## Performance Optimizations

- Database connection pooling (20 connections)
- Redis caching with TTL
- In-memory caching fallback
- Lazy loading for dashboard widgets
- Virtual scrolling for large data tables
- Debounced search inputs
- Code splitting for React components
- Compressed API responses

## Security Features

- AES-256 encryption for API keys
- Rate limiting (100 requests/minute)
- Helmet.js for security headers
- Input validation with Joi
- SQL injection prevention
- XSS protection
- CORS configuration
- Environment variable isolation

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env file
- Ensure database exists: `psql -U postgres -l`

### API Key Validation Fails
- Verify your ClickUp API key is correct
- Check if the key has necessary permissions
- Ensure no extra spaces in the API key

### Redis Connection (Optional)
- If Redis is not available, the app falls back to in-memory cache
- To disable Redis, remove REDIS_URL from .env

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please create an issue on GitHub.

## Acknowledgments

- Built with ClickUp API v2
- Inspired by modern dashboard builders
- Uses ClickUp's design system colors