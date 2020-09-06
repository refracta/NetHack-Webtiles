#!/bin/bash

git clone https://github.com/NetHack/NetHack -b NetHack-3.6 ./sources/nh366
cp ./webtiles/nh366/* ./sources/nh366 -r

xhost +local:docker
sudo docker build -t emalron/nethack ./dev
sudo docker stop nethack-webtiles-dev &> /dev/null
sudo docker rm nethack-webtiles-dev &> /dev/null
sudo docker run -it \
    -v /tmp/.X11-unix:/tmp/.X11-unix \
    -e DISPLAY=unix$DISPLAY \
    -v "$PWD":/usr/src/NetHack-Webtiles \
	-p 80:80 \
	-p 81:81 \
	-p 82:82 \
    --name nethack-webtiles-dev \
    emalron/nethack \
    bash
