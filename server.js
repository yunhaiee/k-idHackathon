#!/usr/bin/env node
// Production server for Cloud Run: serves the Expo web export + API routes (expo-server express adapter).
const path = require('path');
const { createRequestHandler } = require('expo-server/adapter/express');
const express = require('express');
const compression = require('compression');
const morgan = require('morgan');

const CLIENT_BUILD_DIR = path.join(process.cwd(), 'dist/client');
const SERVER_BUILD_DIR = path.join(process.cwd(), 'dist/server');

const app = express();
app.use(compression());
app.disable('x-powered-by');
process.env.NODE_ENV = 'production';
app.use(express.static(CLIENT_BUILD_DIR, { maxAge: '1h', extensions: ['html'] }));
app.use(morgan('tiny'));
app.all('/{*all}', createRequestHandler({ build: SERVER_BUILD_DIR }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Kardza listening on ${port}`));
