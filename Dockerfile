FROM node:20-alpine as builder

WORKDIR /usr/src/app
COPY package.json tsconfig.json package-lock.json .npmrc nest-cli.json tsconfig.build.json ./
COPY tsconfig.json ./
COPY ./patches ./patches
RUN npm install
COPY ./src ./src
COPY .env .env
RUN npm run build

EXPOSE 3123
CMD ["node", "dist/main.js"]
