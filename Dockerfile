FROM node:12.10.0-stretch

RUN apt-get update
RUN apt-get install -y supervisor

RUN apt-get clean; rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /usr/share/doc/* \
    && export TERM=xterm

RUN mkdir -p /app
ADD ./ /app
WORKDIR /app

COPY supervisord.conf /etc/supervisord.conf
COPY ./entrypoint.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh

CMD ["/usr/bin/supervisord", "-n", "-c",  "/etc/supervisord.conf"]
