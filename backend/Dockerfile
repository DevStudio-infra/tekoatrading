FROM node:20
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]
