import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Trade Tracker API',
      version: '2.0.0',
      description: 'API documentation for the Trade Tracker AI-integrated trading bot system',
      contact: {
        name: 'Support',
        email: 'support@tradetracker.io',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication related endpoints',
      },
      {
        name: 'Bots',
        description: 'Trading bot management endpoints',
      },
      {
        name: 'Strategies',
        description: 'Trading strategy management endpoints',
      },
      {
        name: 'Broker Credentials',
        description: 'Broker credential management endpoints',
      },
      {
        name: 'Positions',
        description: 'Position and trade management endpoints',
      },
    ],
  },
  apis: ['./api/routes/*.routes.ts'], // Path to the API routes
};

const swaggerSpec = swaggerJSDoc(options);

/**
 * Initialize Swagger documentation
 * @param app Express application
 */
export const setupSwagger = (app: Express): void => {
  // Swagger API docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Serve swagger.json
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('Swagger documentation is available at /api-docs');
};
