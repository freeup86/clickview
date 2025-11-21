/**
 * Apollo GraphQL Server Setup
 *
 * Configures Apollo Server with:
 * - Express integration
 * - WebSocket support for subscriptions
 * - Authentication middleware
 * - Data loaders
 * - Error handling
 * - Performance monitoring
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { Server as HTTPServer } from 'http';
import { Express } from 'express';
import { typeDefs } from './schema';
import { resolvers, createContext, GraphQLContext } from './resolvers';

/**
 * Create and configure Apollo GraphQL Server
 */
export async function createApolloServer(app: Express, httpServer: HTTPServer) {
  // Create executable schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Set up WebSocket handling for subscriptions
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        // Extract auth token from connection params
        const token = ctx.connectionParams?.authorization as string;

        return {
          token,
          loaders: (await import('./resolvers')).default,
        } as GraphQLContext;
      },
      onConnect: async (ctx) => {
        console.log('GraphQL WebSocket client connected');
      },
      onDisconnect: () => {
        console.log('GraphQL WebSocket client disconnected');
      },
    },
    wsServer
  );

  // Create Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    schema,
    plugins: [
      // Proper shutdown for HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Proper shutdown for WebSocket server
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },

      // Custom error formatting
      {
        async requestDidStart() {
          return {
            async didEncounterErrors(requestContext) {
              console.error('GraphQL Errors:', requestContext.errors);
            },
          };
        },
      },

      // Performance monitoring
      {
        async requestDidStart() {
          const start = Date.now();

          return {
            async willSendResponse(requestContext) {
              const elapsed = Date.now() - start;

              if (elapsed > 1000) {
                console.warn(`Slow GraphQL query: ${elapsed}ms`, {
                  operationName: requestContext.request.operationName,
                  query: requestContext.request.query?.substring(0, 200),
                });
              }
            },
          };
        },
      },
    ],

    // Include stack traces in errors for development
    includeStacktraceInErrorResponses: process.env.NODE_ENV === 'development',

    // Introspection and playground enabled in dev
    introspection: process.env.NODE_ENV !== 'production',

    // Format errors
    formatError: (formattedError, error) => {
      // Don't expose internal server errors in production
      if (
        process.env.NODE_ENV === 'production' &&
        formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR'
      ) {
        return {
          ...formattedError,
          message: 'An internal error occurred',
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        };
      }

      return formattedError;
    },
  });

  // Start Apollo Server
  await server.start();

  // Apply Apollo middleware to Express
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: createContext,
    })
  );

  console.log('🚀 GraphQL Server ready at /graphql');
  console.log('🔌 GraphQL Subscriptions ready at ws://localhost:3001/graphql');

  return server;
}

/**
 * GraphQL Playground HTML (for development)
 */
export const graphqlPlaygroundHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ClickView GraphQL Playground</title>
  <link rel="stylesheet" href="https://unpkg.com/graphql-playground-react/build/static/css/index.css" />
  <link rel="shortcut icon" href="https://unpkg.com/graphql-playground-react/build/favicon.png" />
  <script src="https://unpkg.com/graphql-playground-react/build/static/js/middleware.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Source Sans Pro', sans-serif;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.addEventListener('load', function (event) {
      GraphQLPlayground.init(document.getElementById('root'), {
        endpoint: '/graphql',
        subscriptionEndpoint: 'ws://localhost:3001/graphql',
        settings: {
          'editor.theme': 'light',
          'editor.cursorShape': 'line',
          'editor.reuseHeaders': true,
          'request.credentials': 'include',
        },
        tabs: [
          {
            endpoint: '/graphql',
            query: \`# Welcome to ClickView GraphQL API
#
# Example Queries:

# Get current user
query Me {
  me {
    id
    username
    email
    fullName
    organizations {
      id
      name
    }
  }
}

# Get workspaces with dashboards
query Workspaces {
  myWorkspaces {
    id
    name
    description
    dashboardCount
    dashboards {
      id
      name
      widgetCount
    }
  }
}

# Get dashboard with widgets
query Dashboard($id: ID!) {
  dashboard(id: $id) {
    id
    name
    description
    widgets {
      id
      type
      title
      config
      x
      y
      width
      height
    }
  }
}

# Example Mutations:

# Create workspace
mutation CreateWorkspace {
  createWorkspace(
    name: "My Workspace"
    description: "A new workspace"
    color: "#3b82f6"
  ) {
    id
    name
  }
}

# Create dashboard
mutation CreateDashboard($workspaceId: ID!) {
  createDashboard(
    workspaceId: $workspaceId
    name: "Sales Dashboard"
    theme: "light"
  ) {
    id
    name
    workspace {
      id
      name
    }
  }
}

# Example Subscriptions:

subscription DashboardUpdates($dashboardId: ID!) {
  dashboardUpdated(dashboardId: $dashboardId) {
    id
    name
    widgets {
      id
      title
    }
  }
}
\`,
          },
        ],
      })
    })
  </script>
</body>
</html>
`;
