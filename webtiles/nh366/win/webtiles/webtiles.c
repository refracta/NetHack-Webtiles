#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdarg.h>
#include <stdbool.h>


#include <sys/types.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include <sys/un.h>

#include <unistd.h>
#include <fcntl.h>
#include <time.h>
#include <bits/time.h>

#include <pthread.h>
#include <json-c/json.h>

#include "hack.h"

#define STRING_BUFFER_SIZE 131072
#define STRING_BUFFER_SIZE_HALF 65536

/* GAME PATH */
#define DEFAULT_GAME_UDS_PATH "/tmp/nethack-webtiles-game"
#define DEFAULT_SERVER_UDS_PATH "/tmp/nethack-webtiles-server"
#define CLIENT_ENDPOINT_PATH "default"

char *GAME_UDS_PATH() {
    char pidArray[BUFSIZ];
    sprintf(pidArray, "%d", getpid());
    int pidLength = strlen(pidArray);
    int dgpLength = strlen(DEFAULT_GAME_UDS_PATH);
    char *gameUDSPath = (char *) malloc(pidLength + dgpLength + 1 + 1);
    strcat(gameUDSPath, DEFAULT_GAME_UDS_PATH);
    strcat(gameUDSPath, "-");
    strcat(gameUDSPath, pidArray);
    return gameUDSPath;
}

char *SERVER_UDS_PATH() {
    int dspLength = strlen(DEFAULT_SERVER_UDS_PATH);
    int cepLength = strlen(CLIENT_ENDPOINT_PATH);
    char *serverUDSPath = (char *) malloc(dspLength + cepLength + 1 + 1);
    strcat(serverUDSPath, DEFAULT_SERVER_UDS_PATH);
    strcat(serverUDSPath, "-");
    strcat(serverUDSPath, CLIENT_ENDPOINT_PATH);
    return serverUDSPath;
}

/* CORE UTIL */
void die(char *errmsg) {
    perror(errmsg);
    exit(1);
}

void exitWithSave() {
    dosave0();
    nh_terminate(EXIT_SUCCESS);
}

/* RAW UDS SOCKET */
int createSocket(bool blocking) {
    int sockfd;
    sockfd = socket(AF_UNIX, SOCK_DGRAM, 0);
    if (!blocking) {
        int flag = fcntl(sockfd, F_GETFL, 0);
        fcntl(sockfd, F_SETFL, flag | O_NONBLOCK);
    }
    return sockfd;
}

int bindSocket(int sockfd, struct sockaddr_un address) {
    unlink(address.sun_path);
    return bind(sockfd, (struct sockaddr *) &address, sizeof(address));
}

struct sockaddr_un getPathAddress(char *path) {
    struct sockaddr_un address;
    memset(&address, '\0', sizeof(address));
    address.sun_family = AF_UNIX;
    strcpy(address.sun_path, path);
    return address;
}

int getConnectStatus(struct sockaddr_un address) {
    int sockfd = socket(AF_UNIX, SOCK_DGRAM, 0);
    int connectStatus = connect(sockfd, (struct sockaddr *) &address, sizeof(address));
    close(sockfd);
    return connectStatus;
}

/* SOCKET INIT */
int sockfd;
struct sockaddr_un gameAddress;
struct sockaddr_un serverAddress;

void sendMsg(char *);

void startHandleSocketRunner();

void initSocket() {
    char *gamePath = GAME_UDS_PATH();
    gameAddress = getPathAddress(gamePath);
    free(gamePath);

    char *serverPath = SERVER_UDS_PATH();
    serverAddress = getPathAddress(serverPath);
    free(serverPath);

    sockfd = createSocket(false);
    sockfd < 0 ? die("createSocketError") : 0;
    int bindStatus = bindSocket(sockfd, gameAddress);
    bindStatus < 0 ? die("bindSocketError") : 0;

    int connectStatus = getConnectStatus(serverAddress);
    connectStatus < 0 ? die("getConnectStatusError") : 0;

    char initSocketMsg[STRING_BUFFER_SIZE];
    sprintf(initSocketMsg, "{\"msg\":\"init_socket\", \"pid\":%d}", getpid());
    sendMsg(initSocketMsg);

#if defined(X11_GRAPHICS)
    startHandleSocketRunner();
#endif
}


// queued send support
json_object *sendQueue[BUFSIZ];
int sendQueueIndex = 0;

int addSendQueueRaw(json_object *obj) {
    if (sendQueueIndex < BUFSIZ) {
        sendQueue[sendQueueIndex++] = obj;
    } else {
        die('sendQueueOverflowError');
    }
}

int isPreprocessing = 0;

struct Cursor {
    int x;
    int y;
    int isChanged
};
struct Cursor cursor = {-1, -1, false};

void preprocessSendQueuedMsg() {
    if(!isPreprocessing){
        isPreprocessing = 1;
        if (0 < sendQueueIndex && sendQueueIndex < BUFSIZ) {
            json_object *last_obj = json_object_object_get(sendQueue[sendQueueIndex - 1], "msg");
            char *last_msg = json_object_get_string(last_obj);

            if (last_msg != NULL && strcmp(last_msg, "tile") == 0) {
                sendCharacterPos(u.ux, u.uy);
            }
        } else if (sendQueueIndex == 0) {
            if (cursor.isChanged) {
                sendCursor();
                cursor.isChanged = false;
            }
        }
        isPreprocessing = 0;
    }

}

void preprocessAddSendQueue(json_object *obj) {
    if(!isPreprocessing){
        isPreprocessing = 1;
        if (sendQueueIndex < BUFSIZ && !isPreprocessing) {
            json_object *last_obj = json_object_object_get(sendQueue[sendQueueIndex - 1], "msg");
            json_object *curr_obj = json_object_object_get(obj, "msg");
            char *last_msg = json_object_get_string(last_obj);
            char *curr_msg = json_object_get_string(curr_obj);

            if (!(strcmp(curr_msg, "tile") == 0) && last_msg != NULL && strcmp(last_msg, "tile") == 0) {
                sendCharacterPos(u.ux, u.uy);
            }
        }
        isPreprocessing = 0;
    }

}

int addSendQueue(json_object *obj) {
    preprocessAddSendQueue(obj);
    addSendQueueRaw(obj);
}

// sendto wrapper
void sendMsg(char *msg) {
    while (true) {
        int status = sendto(sockfd, (void *) msg, strlen(msg) + 1, 0, (struct sockaddr *) &serverAddress,
                            sizeof(serverAddress));
        if (status != -1) {
            break;
        }
        usleep(1);
    }
}

// send queued msg
char *sendQueuedMsg() {
    preprocessSendQueuedMsg();
    if (sendQueueIndex > 0) {
        json_object *request = json_object_new_object();
        json_object *array = json_object_new_array();

        json_object_object_add(request, "msg", json_object_new_string("queued_msg"));

        for (int i = 0; i < sendQueueIndex; i++) {
            json_object *current_obj = sendQueue[i];
            json_object_array_add(array, current_obj);
            sendQueue[i] = NULL;
        }

        json_object_object_add(request, "list", array);
        char *json = json_object_to_json_string(request);

        sendMsg(json);

        sendQueueIndex = 0;
        json_object_put(request);
    }
}

// blocking socket support
bool threadExit = false;
int threadId;
pthread_t thread;
void *threadReturn;

void handleSocketRunner(void *arg) {
    while (!threadExit) {
        handleSocket();
    }
    pthread_exit((void *) 0);
}

void startHandleSocketRunner() {
    threadExit = false;
    threadId = pthread_create(&thread, NULL, handleSocketRunner, NULL);
}

void stopHandleSocketRunner() {
    threadExit = true;
    threadId = pthread_join(thread, &threadReturn);
}

/* HANDLE SOCKET */
#define PING_TIMEOUT 10000
const char PING_MSG[] = "{\"msg\":\"ping\"}";
const char PONG_MSG[] = "{\"msg\":\"pong\"}";

#define millisecondDiff(begin, end) (((double) (end.tv_sec - begin.tv_sec) + (end.tv_nsec - begin.tv_nsec) * 1.0e-9) * 1000)
struct timespec lastReceivePingTime;
struct timespec lastSendPingTime;

void handleSocket();

void handleMsg(json_object *);

void handleCore(char *, json_object *);

// <handleSocket> -> handleMsg -> handleCore
void handleSocket() {
    char receiveBuffer[STRING_BUFFER_SIZE];
    int serverAddressSize = sizeof(serverAddress);
    int recv = recvfrom(sockfd, (void *) &receiveBuffer, sizeof(receiveBuffer), 0, (struct sockaddr *) &serverAddress,
                        &serverAddressSize);
    if (recv != -1) {
        json_object *obj = json_tokener_parse(receiveBuffer);
        if (obj != NULL) {
            handleMsg(obj);
            json_object_put(obj);
        } else {
            perror("json_tokener_parse-Error");
        }
    }
    struct timespec currentTime;
    clock_gettime(CLOCK_MONOTONIC, &currentTime);

    if (lastSendPingTime.tv_sec != 0 && millisecondDiff(lastSendPingTime, currentTime) >= PING_TIMEOUT / 3) {
        int status = sendto(sockfd, (void *) &PING_MSG, sizeof(PING_MSG), 0, (struct sockaddr *) &serverAddress,
                            serverAddressSize);
        if (status != -1) {
            clock_gettime(CLOCK_MONOTONIC, &lastSendPingTime);
        }
    }

    if (lastReceivePingTime.tv_sec != 0 && millisecondDiff(lastReceivePingTime, currentTime) >= PING_TIMEOUT) {
        exitWithSave();
    }
}

// handleSocket -> <handleMsg> -> handleCore
void handleMsg(json_object *obj) {
    json_object *msg_obj = json_object_object_get(obj, "msg");
    if (msg_obj != NULL) {
        char *msg = json_object_get_string(msg_obj);
        if (strcmp(msg, "init_socket_end") == 0) {
            clock_gettime(CLOCK_MONOTONIC, &lastReceivePingTime);
            clock_gettime(CLOCK_MONOTONIC, &lastSendPingTime);
        } else if (strcmp(msg, "ping") == 0) {
            clock_gettime(CLOCK_MONOTONIC, &lastReceivePingTime);
            sendto(sockfd, (void *) &PONG_MSG, sizeof(PONG_MSG), 0, (struct sockaddr *) &serverAddress,
                   sizeof(serverAddress));
        } else if (strcmp(msg, "pong") == 0) {
        } else if (strcmp(msg, "close") == 0) {
            exitWithSave();
        } else {
            handleCore(msg, obj);
        }
    }
}

// handleSocket -> handleMsg -> <handleCore>
bool isKeyTriggered = false;
int keyCode = -1;

// TODO FREE 말고 put으로 해제
void handleCore(char *msg, json_object *obj) {
    if (strcmp(msg, "key") == 0) {
        json_object *keyObj = json_object_object_get(obj, "keyCode");
        keyCode = json_object_get_int(keyObj);
        isKeyTriggered = true;
    }
    if (strcmp(msg, "debug") == 0) {

    } else {
        // printf("Unknown Request!");
    }
}

/* KEY EMULATION */
int getch_by_webtiles() {
    while (true) {
        usleep(1);
        sendQueuedMsg();
        handleSocket();
        if (isKeyTriggered) {
            isKeyTriggered = false;
            return keyCode;
        }
    }
}

int getch_nb_by_webtiles() {
    if (isKeyTriggered) {
        isKeyTriggered = false;
        return keyCode;
    }
    return -1;
}

/* MENU TEST */
void menu_test() {
    winid win;
    anything any;
    menu_item *pick_list = 0;

    win = create_nhwindow(NHW_MENU);
    any = zeroany;
    any.a_int = 0;
    add_menu(win, NO_GLYPH, &any, 0, 0, ATR_NONE, "[TEST] menu #1", MENU_UNSELECTED);
    end_menu(win, "Jes's New MENU");
    select_menu(win, PICK_NONE, &pick_list);
}

void append_json_array(json_object *arr, char *str) {
    json_object *jitem = json_object_new_string(str);
    json_object *new_object = json_object_new_object();
    json_object_object_add(new_object, "item", jitem);
    json_object_array_add(arr, new_object);
}

char *make_json_msg(json_object *obj, json_object *arr) {
    json_object_object_add(obj, "msg", json_object_new_string("inventory"));
    json_object_object_add(obj, "items", arr);
    return json_object_to_json_string(obj);
}

/* SEND LOGIC */
void sendText(char *text) {
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("text"));
    json_object_object_add(obj, "text", json_object_new_string(text));
    addSendQueue(obj);
}

#define MATRIX_COL 256

int to2DIndex(x, y) {
    return y * MATRIX_COL + x;
}

int to2DY(index) {
    return index / MATRIX_COL;
}

int to2DX(index) {
    return index - to2DY(index) * MATRIX_COL;
}

void setCursor(int x, int y) {
    if (x != cursor.x || y != cursor.y) {
        cursor.x = x;
        cursor.y = y;
        cursor.isChanged = true;
    }
}


void sendCharacterPos(int x, int y) {
    json_object *obj = json_object_new_object();
    int i = to2DIndex(x, y);
    json_object_object_add(obj, "msg", json_object_new_string("tile"));
    json_object_object_add(obj, "i", json_object_new_int(i));
    json_object_object_add(obj, "u", json_object_new_boolean(1));
    addSendQueue(obj);
}

void sendTile(int x, int y, int t) {
    json_object *obj = json_object_new_object();
    int i = to2DIndex(x, y);
    json_object_object_add(obj, "msg", json_object_new_string("tile"));
    json_object_object_add(obj, "i", json_object_new_int(i));
    json_object_object_add(obj, "t", json_object_new_int(t));
    addSendQueue(obj);
}

void sendTileFlag(int x, int y, char *f) {
    json_object *obj = json_object_new_object();
    int i = to2DIndex(x, y);
    json_object_object_add(obj, "msg", json_object_new_string("tile"));
    json_object_object_add(obj, "i", json_object_new_int(i));
    json_object_object_add(obj, "f", json_object_new_string(f));
    addSendQueue(obj);
}

void sendStatus(int fldidx, int percent, char *text) {
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("status"));
    json_object_object_add(obj, "fldidx", json_object_new_int(fldidx));
    json_object_object_add(obj, "percent", json_object_new_int(percent));
    if (text != NULL) {
        json_object_object_add(obj, "text", json_object_new_string(text));
    } else {
        json_object_object_add(obj, "text", json_object_new_string(""));
    }
    addSendQueue(obj);
}

void sendClearTile() {
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("clear_tile"));
    addSendQueue(obj);
}

void sendMore(char *prompt) {
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("more"));
    json_object_object_add(obj, "prompt", json_object_new_string(prompt));
    addSendQueue(obj);
}

void sendCursor() {
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("cursor"));
    json_object_object_add(obj, "x", json_object_new_int(cursor.x));
    json_object_object_add(obj, "y", json_object_new_int(cursor.y));
    addSendQueue(obj);
}sendDebug

void sendDebug(char *format, ...) {
    char debug[STRING_BUFFER_SIZE_HALF];
    va_list arg_ptr;

    va_start(arg_ptr, format);
    vsnprintf(debug, STRING_BUFFER_SIZE_HALF, format, arg_ptr);
    va_end(arg_ptr);

    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("debug"));
    json_object_object_add(obj, "debug", json_object_new_string(debug));
    addSendQueue(obj);
}

char *stringify(char *str) {
    return json_object_to_json_string(json_object_new_string(str));
}