# pseudo-c-server
Nethack-Webtiles-Injector가 적용된 상태의 넷핵 역활을 해줄 의사(Pseudo) 서버입니다.
```
cd pseudo-c-server
cmake CMakeLists.txt
make

/* json-c가 설치되지 않은 경우 참조 */
git clone https://github.com/json-c/json-c.git
mkdir json-c-build
cd json-c-build
cmake ../json-c 
make
make install

/* 링크 오류가 나는 경우 <WSL Ubuntu 18.04> */
// CLion-CMakeList.txt: target_link_libraries(ProjectName json-c)
// 다른 방법(안해봄) https://chipmaker.tistory.com/entry/cjson-simple-parsing-example

printf "/user/local/lib/libjson-c.so.5\n" >> /etc/ld.so.conf.d/user.conf
ldconfig
```

# pseudo-node-server
Nethack-Webtiles 처리용 Node 의사 서버입니다.

```
cd pseudo-node-server
npm install
npm start
```