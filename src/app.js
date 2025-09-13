/*
 * API endpoints blueprint 
 */

// imports
require('dotenv').config();
const express = require('express');
const app = express();
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const helmet = require('helmet');

// middleware to run on all requests
// express
app.use(express.json());
app.use(helmet());

// allow origin for frontend
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));

// healt check pings
app.get('/health', (req, res) => {
    res.json({ status: "server is alive :)"});
});

// API ROUTES
// mount api routes - abstraction list of all routers
app.use('/api/documents', require('./routes/documents'));
app.use('/api/news', require('./routes/news'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/newsletter', require('./routes/newsletter'));

// swagger config start
// swagger ui @ localhost:xxxx/api-docs
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KGF Backend API',
      version: '1.0.0',
      description: 'Documents management API',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3001}`,
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};
const swaggerSpec = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// swagger config end ----- ----- ----- -----

module.exports = app;