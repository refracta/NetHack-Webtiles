# 예제
tmux -new s server
gcc main.c -o server
./server /tmp/test_udp
Ctrl B, T

tmux -new s client
npm install unix-dgram-socket
node client.js
