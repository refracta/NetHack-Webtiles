#!/bin/bash

npm install
git clone https://github.com/refracta/unix-dgram-socket
cd unix-dgram-socket
npm install
npm run build
mv ./build ./dist/
rm -rf -- !(dist)
mv ./dist/* ./
rm -rf ./dist
cd ../
mv ./unix-dgram-socket ./node_modules/
