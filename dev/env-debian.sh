#!/bin/bash

sh dev/install-prerequisite-debian.sh
sh dev/install-jsonc.sh
sh dev/install-nethack-source.sh
sh dev/build-nethack.sh
sh dev/install-node-dependency.sh

