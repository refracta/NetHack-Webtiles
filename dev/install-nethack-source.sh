#!/bin/bash

WEBTILES_PATH=`pwd`
git clone https://github.com/NetHack/NetHack -b NetHack-3.6 ./sources/nh366
cp ./webtiles/nh366/* ./sources/nh366 -r
cd ./sources/nh366
sed -i "s#/usr/src/NetHack-Webtiles#$WEBTILES_PATH#g" sys/unix/hints/linux-webtiles
cd ../../
sed -i "s#/usr/src/NetHack-Webtiles#$WEBTILES_PATH#g" games.json