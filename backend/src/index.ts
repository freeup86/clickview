import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import authorizationRoutes from './routes/authorization.routes';
import adminRoutes from './routes/admin.routes';
import workspaceRoutes from './routes/workspace.routes';
import dashboardRoutes from './routes/dashboard.routes';
import widgetRoutes from './routes/widget.routes';
import dataRoutes from './routes/data.routes';
import clickupRoutes from './routes/clickup.routes';
import tasksRoutes from './routes/tasks.routes';
import tasksSyncRoutes from './routes/tasks.sync.routes';

// Import services
import { logger, requestLogger } from './config/logger';
import { pool } from './config/database';
import { cacheService } from './services/cache.service';

// Import GraphQL
import { createApolloServer, graphqlPlaygroundHTML } from './graphql/server';

// Import Swagger
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Make pool available to routes
app.locals.pool = pool;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    requestLogger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// API Routes
app.use('/api/auth', authRoutes); // Enterprise authentication (public + protected)
app.use('/api/authorization', authorizationRoutes); // Advanced authorization (RBAC/ABAC)
app.use('/api/admin', adminRoutes); // Admin portal endpoints (user, org, role, audit log management)
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/widgets', widgetRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/clickup', clickupRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/tasks', tasksSyncRoutes);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'ClickView API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

// WebSocket connection for real-time updates
io.on('connection', (socket) => {
  logger.info('New WebSocket connection', { id: socket.id });

  socket.on('subscribe:dashboard', (dashboardId: string) => {
    socket.join(`dashboard:${dashboardId}`);
    logger.info('Client subscribed to dashboard', { dashboardId, socketId: socket.id });
  });

  socket.on('unsubscribe:dashboard', (dashboardId: string) => {
    socket.leave(`dashboard:${dashboardId}`);
    logger.info('Client unsubscribed from dashboard', { dashboardId, socketId: socket.id });
  });

  socket.on('disconnect', () => {
    logger.info('WebSocket disconnected', { id: socket.id });
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Cleanup function
async function cleanup() {
  logger.info('Shutting down server...');
  
  try {
    await cacheService.disconnect();
    await pool.end();
    httpServer.close();
    logger.info('Server shut down gracefully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// Clean expired cache periodically
setInterval(async () => {
  try {
    await cacheService.cleanExpired();
  } catch (error) {
    logger.error('Failed to clean expired cache', error);
  }
}, 5 * 60 * 1000); // Every 5 minutes

// GraphQL Playground (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/playground', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(graphqlPlaygroundHTML);
  });
}

// Initialize GraphQL Server
let apolloServer: any;

async function startServer() {
  try {
    // Initialize Apollo GraphQL Server
    apolloServer = await createApolloServer(app, httpServer);

    // Start HTTP server
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`
    🚀 ClickView Backend Server
    ============================
    Environment: ${process.env.NODE_ENV || 'development'}
    Port: ${PORT}
    REST API: http://localhost:${PORT}/api
    GraphQL API: http://localhost:${PORT}/graphql
    GraphQL Playground: http://localhost:${PORT}/playground
    WebSocket (Socket.io): ws://localhost:${PORT}
    WebSocket (GraphQL): ws://localhost:${PORT}/graphql
    ============================
      `);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();