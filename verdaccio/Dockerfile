FROM verdaccio/verdaccio
USER root
ADD plugins /verdaccio/plugins
RUN cd /verdaccio/plugins && sh install.sh
ADD config/config.yaml /verdaccio/conf/config.yaml