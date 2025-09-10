FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY build.js ./
RUN npm ci --only=production || true
RUN node build.js

FROM nginx:stable-alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["/bin/sh","-c","nginx -g 'daemon off;'"]
