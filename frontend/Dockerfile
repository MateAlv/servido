# Production image: builds the app and serves it with nginx (infra/ec2/compose.yml).
# Local development does not use it; `make up` runs the Vite dev server instead.
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.30-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
