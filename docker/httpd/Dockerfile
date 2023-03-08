# alpine is more secure
FROM nginx:stable-alpine

COPY docker/httpd/vhost.conf /etc/nginx/conf.d/default.conf
COPY api/public/ /var/www/html/api/public/