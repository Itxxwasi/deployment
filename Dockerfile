FROM node:18

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

# Environment variables should be passed at runtime
CMD ["npm", "start"]
