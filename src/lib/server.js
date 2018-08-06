'use strict';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import logger from './logger';

// middleware
import errorMiddleWare from './middleware/error-middleware';
import loggerMiddleware from './middleware/logger-middleware';

// our routes
import authRouter from '../router/auth-router';
import messageRouter from '../router/message-router';
import imageRouter from '../router/image-router';
import profileRouter from '../router/prof-router';
import reminderRouter from '../router/reminder-router';
import googleOAuthRouter from '../router/google-oauth-router';

const app = express();
const PORT = process.env.PORT || 3000;
let server = null;

// third party apps
// app.use(cors());
const corsOptions = {
  // origin: process.env.CORS_ORIGINS,
  // "origin" defines what front end domains are permitted to access our API, we need to implement this to prevent any potential attacks
  origin: (origin, cb) => {
    if (!origin) {
      // assume Google API or Cypress
      cb(null, true);
    } else if (origin.includes(process.env.CORS_ORIGINS)) {
      cb(null, true);
    } else {
      throw new Error(`${origin} not allowed by CORS`);
    }
  },
  credentials: true, // Configures the Access-Control-Allow-Credentials CORS header. Set to true to pass the header, otherwise it is omitted.
};
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// our own api routers or middleware
app.use(loggerMiddleware);
app.use(authRouter);
app.use(messageRouter);
app.use(reminderRouter);
app.use(imageRouter);
app.use(profileRouter);
app.use(googleOAuthRouter);

// catch all
app.use(errorMiddleWare);
app.all('*', (request, response) => {
  return response.sendStatus(404).send('Route Not Registered');
});

const startServer = () => {
  return mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log(`Listening on PORT: ${process.env.PORT}`); // eslint-disable-line
      server = app.listen(PORT, () => {
      }); 
    })
    .catch((err) => {
      throw err;
    });
};

const stopServer = () => {
  return mongoose.disconnect()
    .then(() => {
      server.close(() => {
        logger.log(logger.INFO, 'Server is off');
      });
    })
    .catch((err) => {
      throw err;
    });
};

export { startServer, stopServer };
