# Stage 1

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Stage 2

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY  package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN mkdir -p uploads

EXPOSE 3000

CMD [ "npm", "start" ]