FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.js ./
RUN install -d -o node -g node /data

USER node
EXPOSE 3001
CMD ["node", "server.js"]
