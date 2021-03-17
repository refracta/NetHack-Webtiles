#!/bin/bash

sh sys/unix/setup.sh sys/unix/hints/linux-webtiles
make -j4 && make install
