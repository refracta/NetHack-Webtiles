#!/bin/bash

git clone https://github.com/NetHack/NetHack -b NetHack-3.6 ./sources/nh366
cp ./webtiles/nh366/* ./sources/nh366 -r

sudo docker build -t emalron/nethack ./dev
sudo docker stop nethack-webtiles-dev &> /dev/null
sudo docker rm nethack-webtiles-dev &> /dev/null
sudo docker run -it \
    -v "$PWD":/usr/src/NetHack-Webtiles \
	-p 8080:80 \
	-p 8081:81 \
	-p 8082:82 \
    --name nethack-webtiles-dev \
    emalron/nethack \
    bash
