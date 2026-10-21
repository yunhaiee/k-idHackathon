/// <reference types="node" />
// Vercel entry: every request goes through the Expo server runtime (web export + API routes).
const { createRequestHandler } = require('expo-server/adapter/vercel');

module.exports = createRequestHandler({
  build: require('path').join(__dirname, '../dist/server'),
});
