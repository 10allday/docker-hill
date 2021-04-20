FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm i node-hill
RUN npm install

COPY . .

CMD [ "npm", "start" ]
