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

// middleware to run on all requests
// express
app.use(express.json());

// allow origin for frontend
app.use(cors({
  origin: 'http://localhost:3000', // Allow your frontend
  credentials: true
}));
app.use(cors());

// healt check pings
app.get('/health', (req, res) => {
    res.json({ status: "server is alive :)"});
});

// mount api routes - abstraction list of all routers
app.use('/api/documents', require('./routes/documents'));

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