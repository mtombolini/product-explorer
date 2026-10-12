# Runtime stage: Nginx serves static files and proxies the API.
# The Node build stage is added together with the Vite project; until then
# the image serves a static placeholder page.
FROM nginx:1.30-alpine

# Replaces the default site of the base image.
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY placeholder/ /usr/share/nginx/html/

EXPOSE 80
