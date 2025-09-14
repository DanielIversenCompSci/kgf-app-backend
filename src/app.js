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

const allowlist = [
  process.env.FRONTEND_ORIGIN,        // https://klintehuse.dk
  process.env.FRONTEND_ORIGIN_WWW,    // https://www.klintehuse.dk
  'http://localhost:3000',            // keep for local dev (optional)
].filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // allow non-browser tools with no Origin (curl/Postman)
    if (!origin) return cb(null, true);
    if (allowlist.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

/* app.use(cors()); */

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