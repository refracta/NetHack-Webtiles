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

WORKDIR /usr/src/NetHack-Webtiles

CMD service nginx start