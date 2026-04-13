/**
 * Swagger Configuration
 * ---------------------
 * Auto-generates API documentation from JSDoc comments.
 * Accessible at /api-docs endpoint.
 */

const swaggerJSDoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Perfume E-commerce API',
      version: '1.0.0',
      description: 'A production-ready REST API for a Perfume E-commerce Application. Supports user authentication, product management, cart, orders, and reviews.',
      contact: {
        name: 'API Support',
        email: 'support@perfume-ecommerce.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js'], // Path to route files with JSDoc annotations
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

module.exports = swaggerSpec;
