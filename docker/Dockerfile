FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY apps/ ./apps/
COPY integrations/ ./integrations/
COPY standards/ ./standards/
RUN mkdir -p /app/data && chown node:node /app/data
EXPOSE 4318
USER node
CMD ["node", "apps/web/server.mjs"]
