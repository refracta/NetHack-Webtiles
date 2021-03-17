#!/bin/bash

git clone https://github.com/json-c/json-c.git
mkdir jsonc-build
cd jsonc-build
cmake ../json-c
sudo make install
cd ../
printf "\n\nexport LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib\n\n" >> ~/.bashrc