#!/bin/bash

WEBTILES_PATH=`pwd`
sh dev/install-jsonc.sh
sh dev/install-nethack-source.sh
sh dev/build-nethack.sh
sh dev/install-node-dependency.sh