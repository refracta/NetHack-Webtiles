#!/bin/bash
CURRENT_PATH=$(pwd)
sudo su - root -c "cd $CURRENT_PATH && PORT=8080 npm start 2>&1 | tee server.log"