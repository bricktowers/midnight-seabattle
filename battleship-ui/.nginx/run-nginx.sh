cat /usr/share/nginx/html/config.tpl.json | envsubst > /usr/share/nginx/html/config.json
nginx -g "daemon off;"
