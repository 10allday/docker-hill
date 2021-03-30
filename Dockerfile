FROM node:14
MAINTAINER 10allday hello@10allday.com

RUN apt-get -y update
RUN apt-get -y upgrade

COPY package*.json ./

RUN npm install node-hill@latest
RUN npm run start
