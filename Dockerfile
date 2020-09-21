FROM node:12.10.0-alpine

ENV TZ=Asia/Dubai
RUN echo '@edge http://nl.alpinelinux.org/alpine/edge/main'>> /etc/apk/repositories \
	&& apk --update add curl

RUN apk add --update supervisor && rm  -rf /tmp/* /var/cache/apk/*

RUN mkdir -p /app
ADD ./ /app
WORKDIR /app

COPY supervisord.conf /etc/supervisord.conf
COPY ./entrypoint.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh

CMD ["/usr/bin/supervisord", "-n", "-c",  "/etc/supervisord.conf"]
