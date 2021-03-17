#!/bin/bash

sudo apt-get -y update
sudo apt-get install -y gcc git cmake bison flex gdb curl g++ libncurses5-dev ttyrec tmux nano
curl -sL https://deb.nodesource.com/setup_10.x | sudo bash -
sudo apt-get install -y nodejs