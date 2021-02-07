FROM ubuntu:latest
MAINTAINER 10allday hello@10allday.com

RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get install -y node-hill@latest
