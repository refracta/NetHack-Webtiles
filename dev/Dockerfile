FROM ubuntu:bionic

WORKDIR /usr/src
RUN apt-get -y update && \
        apt-get install -y \
        gcc git cmake bison flex gdb libxaw7-dev xfonts-utils libncurses5-dev nodejs npm ttyrec nginx tmux nano && \
        git clone https://github.com/json-c/json-c.git && \
        mkdir jsonc-build
WORKDIR /usr/src/jsonc-build
RUN cmake ../json-c && \
        make install
ENV LD_LIBRARY_PATH $LD_LIBRARY_PATH:/usr/local/lib

WORKDIR /usr/NetHack-Webtiles
RUN cp ./dev/archive.index-normal /etc/nginx/site-available/
RUN cp ./dev/archive.index-json /etc/nginx/site-available/
RUN sudo ln -s /etc/nginx/sites-available/archive.index-normal /etc/nginx/sites-enabled/
RUN sudo ln -s /etc/nginx/sites-available/archive.index-json /etc/nginx/sites-enabled/
RUN rm /etc/nginx/sites-enabled/default

CMD service nginx start