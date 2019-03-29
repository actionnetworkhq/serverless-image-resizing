FROM amazonlinux:latest

# Relies on this being set via:
#   docker build --build-args NODEVERSION=<version> .
ARG NODEVERSION

ADD etc/nodesource.gpg.key /etc

WORKDIR /tmp

COPY lambda/* ./

RUN curl --silent --location https://rpm.nodesource.com/setup_8.x | bash && \
    yum install -y nodejs gcc-c++ make git sed tar which && \
    npm i -g n && \
    n ${NODEVERSION} && \
    npm install && \
    npm cache clean --force && \
    yum clean all

WORKDIR /build
