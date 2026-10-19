# Three stages:
#   source   Node with the dependencies and the code. Lint and tests run
#            here (see the frontend-test service in docker-compose.yml).
#   build    the production bundle made by Vite
#   runtime  Nginx with the bundle. It is the last stage, so it is what
#            "docker compose up" and a plain "docker build" produce.

FROM node:24-alpine AS source

WORKDIR /app

# Dependencies are installed before the code is copied, so this layer is
# reused from the build cache until package-lock.json changes. "npm ci"
# installs exactly the versions of the lock file.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npm", "test"]


FROM source AS build

RUN npm run build


FROM nginx:1.30-alpine AS runtime

# Replaces the default site of the base image. The headers snippet is kept
# out of conf.d, whose files Nginx loads on their own at http level.
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
