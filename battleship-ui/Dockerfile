FROM --platform=linux/amd64 nginx:alpine

#This is required to install envsubst
#RUN apt-get update
#RUN apt-get install -y gettext-base

COPY ./.nginx/nginx.conf /etc/nginx/nginx.conf

## Remove default nginx index page
RUN rm -rf /usr/share/nginx/html/*

COPY ./dist /usr/share/nginx/html
COPY ./.nginx/config.tpl.json /usr/share/nginx/html/config.tpl.json
COPY ./.nginx/run-nginx.sh /run-nginx.sh

EXPOSE 3000 8080

CMD ["/run-nginx.sh"]
