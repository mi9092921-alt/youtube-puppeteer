FROM ghcr.io/puppeteer/puppeteer:21.0.1

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

CMD ["node", "dist/index.js"]
