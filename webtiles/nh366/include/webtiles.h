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


void init_socket();

int add_send_queue(json_object*);

void send_msg(char *);
void send_queued_msg();

void send_text(char *);
void send_tile_flag(int, int, char *);
void send_clear_tile();
void send_tile(int, int, int);
void send_more(char *);

int getch_by_webtiles();
int getch_nb_by_webtiles();

void send_debug(char *, ...);
char * stringify(char *);