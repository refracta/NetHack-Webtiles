#!/bin/bash

cp ./dev/archive.index-normal /etc/nginx/sites-available/
cp ./dev/archive.index-json /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/archive.index-normal /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/archive.index-json /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default