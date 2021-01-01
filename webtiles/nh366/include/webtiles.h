#include <stdio.h>
#include <string.h>
#include <stdlib.h>
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


void initSocket();


int addSendQueueRaw(json_object*);

void setCursor(int, int);

void preprocessSendQueuedMsg();
void preprocessAddSendQueue(json_object*);
int addSendQueue(json_object*);

void sendMsg(char *);
void sendQueuedMsg();

int getch_by_webtiles();
int getch_nb_by_webtiles();

void menu_test();
void append_json_array(json_object *, char *);
char *make_json_msg(json_object *, json_object *);

void sendText(char *);
void sendTile(int, int, int);
void sendTileFlag(int, int, char *);
void sendStatus(int, int, char * );
void sendClearTile();
void sendMore(char *);
void sendDebug(char *, ...);
char * stringify(char *);