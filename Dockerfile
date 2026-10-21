# Cloud Run image. Build the web export locally first (npx expo export -p web) so EXPO_PUBLIC_* are inlined.
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY vendor ./vendor
RUN npm ci --no-audit --no-fund
COPY dist ./dist
COPY assets/samples ./assets/samples
COPY server.js ./
ENV NODE_ENV=production
CMD ["node", "server.js"]
