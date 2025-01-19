FROM node:18
WORKDIR /app
COPY ./package.json ./
COPY ./dist ./dist
CMD ["node", "dist/bundle.js"]
