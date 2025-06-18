FROM node:22.16.0
WORKDIR /app
COPY ./package.json ./
COPY ./dist ./dist
CMD ["node", "dist/bundle.js"]
