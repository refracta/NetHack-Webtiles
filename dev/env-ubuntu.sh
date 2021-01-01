#!/bin/bash

WEBTILES_PATH=`pwd`
sudo apt-get -y update
sudo apt-get install -y gcc git cmake bison flex gdb curl g++ libncurses5-dev ttyrec tmux nano
curl -sL https://deb.nodesource.com/setup_10.x | sudo bash -
sudo apt-get install -y nodejs
git clone https://github.com/json-c/json-c.git
mkdir jsonc-build
cd jsonc-build
cmake ../json-c
sudo make install
cd ../
git clone https://github.com/NetHack/NetHack -b NetHack-3.6 ./sources/nh366
cp ./webtiles/nh366/* ./sources/nh366 -r
cd ./sources/nh366
sed -i "s#/usr/src/NetHack-Webtiles#$WEBTILES_PATH#g" sys/unix/hints/linux-webtiles
sudo sh build.sh
cd ../../
printf "\n\nexport LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib\n\n" >> ~/.bashrc
sh dev/install-node-dependency.sh
sed -i "s#/usr/src/NetHack-Webtiles#$WEBTILES_PATH#g" games.json