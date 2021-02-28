#!/bin/bash

npm install
git clone https://github.com/sendanor/node-crypt3
cd node-crypt3
npm install
cd ../
git clone https://github.com/refracta/unix-dgram-socket
cd unix-dgram-socket
npm install
npm run build
mv ./build ./dist/
mkdir ../node_modules/unix-dgram-socket
mv ./dist/* ../node_modules/unix-dgram-socket
cd ../
rm -rf ./unix-dgram-socket
mv ./node_modules/unix-dgram-socket ./
