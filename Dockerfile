FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
RUN npm i node-hill

COPY . .

CMD [ "npm", "start" ]
