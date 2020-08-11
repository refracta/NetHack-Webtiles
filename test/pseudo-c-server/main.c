#include <sys/types.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>

#include <stdbool.h>
#include <json-c/json.h>
#include <bits/time.h>
#include <time.h>


#define DEFAULT_SERVER_PATH "/tmp/nethack-webtiles-server"
#define DEFAULT_CLIENT_PATH "/tmp/nethack-webtiles-client"
#define CLIENT_ENDPOINT_PATH "default"
#define PING_TIMEOUT 30000
#define DEFAULT_BUFFER_SIZE 8192
#define millisecondDiff(begin, end) (((double) (end.tv_sec - begin.tv_sec) + (end.tv_nsec - begin.tv_nsec) * 1.0e-9) * 1000)

char *SERVER_PATH() {
    char pidArray[BUFSIZ];
    sprintf(pidArray, "%d", getpid());
    int pidLength = strlen(pidArray);
    int dspLength = strlen(DEFAULT_SERVER_PATH);
    char *serverPath = (char *) malloc(pidLength + dspLength + 1 + 1);
    strcat(serverPath, DEFAULT_SERVER_PATH);
    strcat(serverPath, "-");
    strcat(serverPath, pidArray);
    return serverPath;
}

char *CLIENT_PATH() {
    int dcpLength = strlen(DEFAULT_CLIENT_PATH);
    int cepLength = strlen(CLIENT_ENDPOINT_PATH);
    char *clientPath = (char *) malloc(dcpLength + cepLength + 1 + 1);
    strcat(clientPath, DEFAULT_CLIENT_PATH);
    strcat(clientPath, "-");
    strcat(clientPath, CLIENT_ENDPOINT_PATH);
    return clientPath;
}

void die(char *errmsg) {
    perror(errmsg);
    exit(1);
}

int getConnectStatus(struct sockaddr_un address) {
    int sockfd = socket(AF_UNIX, SOCK_DGRAM, 0);
    int connectStatus = connect(sockfd, (struct sockaddr *) &address, sizeof(address));
    close(sockfd);
    return connectStatus;
}

struct sockaddr_un getPathAddress(char *path) {
    struct sockaddr_un address;
    memset(&address, '\0', sizeof(address));
    address.sun_family = AF_UNIX;
    strcpy(address.sun_path, path);
    return address;
}

int createSocket(bool isNonBlock) {
    int sockfd;
    sockfd = socket(AF_UNIX, SOCK_DGRAM, 0);
    if (isNonBlock) {
        int flag = fcntl(socket, F_GETFL, 0);
        fcntl(sockfd, F_SETFL, flag | O_NONBLOCK);
    }
    return sockfd;
}

int bindSocket(int sockfd, struct sockaddr_un address) {
    unlink(address.sun_path);
    return bind(sockfd, (struct sockaddr *) &address, sizeof(address));
}

void sendInitMsg(int sockfd, struct sockaddr_un address) {
    char initSocketMsg[BUFSIZ];
    sprintf(initSocketMsg, "{\"msg\":\"init_socket\", \"pid\":%d}", getpid());
    printf("%s\n", initSocketMsg);
    sendto(sockfd, (void *) &initSocketMsg, sizeof(initSocketMsg), 0, (struct sockaddr *) &address, sizeof(address));
}

void handleCore(int sockfd, struct sockaddr_un address, json_object *obj, char *msg) {
    if (strcmp(msg, "debug") == 0) {

    } else {
        printf("Unknown Request!");
    }
}

// https://blog.habets.se/2010/09/gettimeofday-should-never-be-used-to-measure-time.html
struct timespec lastReceivePingTime;
struct timespec lastSendPingTime;
const char PING_MSG[] = "{\"msg\":\"ping\"}";
const char PONG_MSG[] = "{\"msg\":\"pong\"}";

void handleMsg(int sockfd, struct sockaddr_un address, json_object *obj) {
    json_object *msgObj = json_object_object_get(obj, "msg");
    if (msgObj != NULL) {
        char *msg = json_object_get_string(msgObj);
        if (strcmp(msg, "init_socket_end") == 0) {
            clock_gettime(CLOCK_MONOTONIC, &lastReceivePingTime);
            clock_gettime(CLOCK_MONOTONIC, &lastSendPingTime);
        } else if (strcmp(msg, "ping") == 0) {
            clock_gettime(CLOCK_MONOTONIC, &lastReceivePingTime);
            sendto(sockfd, (void *) &PONG_MSG, sizeof(PONG_MSG), 0, (struct sockaddr *) &address, sizeof(address));
        } else if (strcmp(msg, "pong") == 0) {

        } else if (strcmp(msg, "close") == 0) {
            die("SafeExit");
        } else {
            handleCore(sockfd, address, obj, msg);
        }
    }
}

void handleSocket(int sockfd, struct sockaddr_un address) {
    char receiveBuffer[DEFAULT_BUFFER_SIZE];
    int recv = recvfrom(sockfd, (void *) &receiveBuffer, sizeof(receiveBuffer), 0, (struct sockaddr *) &address,
                        &address);
    if (recv != -1) {
        printf("RECEIVE(%d): %s\n", recv, receiveBuffer);
        json_object *obj = json_tokener_parse(receiveBuffer);
        if (obj != NULL) {
            handleMsg(sockfd, address, obj);
        } else {
            perror("json_tokener_parse-Error");
        }
    }

    struct timespec currentTime;
    clock_gettime(CLOCK_MONOTONIC, &currentTime);

    if (lastSendPingTime.tv_sec != 0 && millisecondDiff(lastSendPingTime, currentTime) >= PING_TIMEOUT / 3) {
        sendto(sockfd, (void *) &PING_MSG, sizeof(PING_MSG), 0, (struct sockaddr *) &address, sizeof(address));
        clock_gettime(CLOCK_MONOTONIC, &lastSendPingTime);
    }

    if (lastReceivePingTime.tv_sec != 0 && millisecondDiff(lastReceivePingTime, currentTime) >= PING_TIMEOUT) {
        die("PingTimeoutError");
    }
}

int main() {
    char *serverPath = SERVER_PATH();
    struct sockaddr_un serverAddress = getPathAddress(serverPath);
    free(serverPath);

    char *clientPath = CLIENT_PATH();
    struct sockaddr_un clientAddress = getPathAddress(clientPath);
    free(clientPath);

    int sockfd = createSocket(true);
    sockfd < 0 ? die("createSocketError") : 0;
    int bindStatus = bindSocket(sockfd, serverAddress);
    bindStatus < 0 ? die("bindSocketError") : 0;

    int connectStatus = getConnectStatus(clientAddress);
    connectStatus < 0 ? die("getConnectStatusError") : 0;

    sendInitMsg(sockfd, clientAddress);
    while (true) {
        handleSocket(sockfd, clientAddress);
    }
    close(sockfd);
    exit(0);
}
