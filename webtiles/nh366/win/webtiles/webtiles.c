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
#include "wintty.h"
#include <termios.h>


#define STRING_BUFFER_SIZE 131072
#define STRING_BUFFER_SIZE_HALF 65536

/* GAME PATH */
#define DEFAULT_GAME_UDS_PATH "/tmp/nethack-webtiles-game"
#define DEFAULT_SERVER_UDS_PATH "/tmp/nethack-webtiles-server"
#define CLIENT_ENDPOINT_PATH "default"

char *GAME_UDS_PATH() {
    char pid_array[BUFSIZ];
    sprintf(pid_array, "%d", getpid());
    int pid_length = strlen(pid_array);
    int dgp_length = strlen(DEFAULT_GAME_UDS_PATH);
    char *game_uds_path = (char *) malloc(pid_length + dgp_length + 1 + 1);
    strcat(game_uds_path, DEFAULT_GAME_UDS_PATH);
    strcat(game_uds_path, "-");
    strcat(game_uds_path, pid_array);
    return game_uds_path;
}

char *SERVER_UDS_PATH() {
    int dsp_length = strlen(DEFAULT_SERVER_UDS_PATH);
    int cep_length = strlen(CLIENT_ENDPOINT_PATH);
    char *server_uds_path = (char *) malloc(dsp_length + cep_length + 1 + 1);
    strcat(server_uds_path, DEFAULT_SERVER_UDS_PATH);
    strcat(server_uds_path, "-");
    strcat(server_uds_path, CLIENT_ENDPOINT_PATH);
    return server_uds_path;
}

/* CORE UTIL */
void die(char *errmsg) {
    perror(errmsg);
    exit(1);
}

boolean print_error_mode = FALSE;

int get_print_error_mode() {
    return print_error_mode;
}

int set_print_error_mode(boolean mode) {
    print_error_mode = mode;
}

boolean update_inventory_mode = FALSE;

int get_update_inventory_mode() {
    return update_inventory_mode;
}

int set_update_inventory_mode(boolean mode) {
    update_inventory_mode = mode;
}

boolean exit_mode = FALSE;

int get_exit_mode() {
    return exit_mode;
}

void send_debug(char *format, ...);

boolean force_exit = FALSE;

int get_force_exit() {
    return force_exit;
}

void set_force_exit(boolean exit) {
    force_exit = exit;
}

bool is_key_triggered = false;
int key_code = -1;
int travel_position = -1;
int click = 1;
int exit_fail = 0;
int exit_fail_count = 0;

void exit_with_save() {
    if (force_exit) {
        clearlocks();
        nh_terminate(EXIT_SUCCESS);
    } else {
        exit_mode = TRUE;
        for (int i = 0; i < 10; i++) {
            if (dosave0()) {
                nh_terminate(EXIT_SUCCESS);
            }
        }
        is_key_triggered = true;
        key_code = 27;
    }
    if (exit_fail_count++ > 100) {
        // clearlocks();
        nh_terminate(EXIT_SUCCESS);
    }
}

/* RAW UDS SOCKET */
int create_socket(bool blocking) {
    int sockfd;
    sockfd = socket(AF_UNIX, SOCK_DGRAM, 0);
    if (!blocking) {
        int flag = fcntl(sockfd, F_GETFL, 0);
        fcntl(sockfd, F_SETFL, flag | O_NONBLOCK);
    }
    return sockfd;
}

int bind_socket(int sockfd, struct sockaddr_un address) {
    unlink(address.sun_path);
    return bind(sockfd, (struct sockaddr *) &address, sizeof(address));
}

struct sockaddr_un get_path_address(char *path) {
    struct sockaddr_un address;
    memset(&address, '\0', sizeof(address));
    address.sun_family = AF_UNIX;
    strcpy(address.sun_path, path);
    return address;
}

int get_connect_status(struct sockaddr_un address) {
    int sockfd = socket(AF_UNIX, SOCK_DGRAM, 0);
    int connect_status = connect(sockfd, (struct sockaddr *) &address, sizeof(address));
    close(sockfd);
    return connect_status;
}

/* SOCKET INIT */
int sockfd;
struct sockaddr_un game_address;
struct sockaddr_un server_address;

void send_msg(char *);

void start_handle_socket_runner();

void send_init_socket(char *username) {
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("init_socket"));
    json_object_object_add(obj, "pid", json_object_new_int(getpid()));
    json_object_object_add(obj, "username", json_object_new_string(username));

    char *json = json_object_to_json_string(obj);
    send_msg(json);
    json_object_put(obj);
}

void init_keyboard();

void init_socket(char *username) {
    char *game_path = GAME_UDS_PATH();
    game_address = get_path_address(game_path);
    free(game_path);

    char *serverPath = SERVER_UDS_PATH();
    server_address = get_path_address(serverPath);
    free(serverPath);

    sockfd = create_socket(false);
    sockfd < 0 ? die("createSocketError") : 0;
    int bind_status = bind_socket(sockfd, game_address);
    bind_status < 0 ? die("bindSocketError") : 0;

    int connect_status = get_connect_status(server_address);
    connect_status < 0 ? die("getConnectStatusError") : 0;

    init_keyboard();
    send_init_socket(username);
}


// queued send support
json_object *send_queue[BUFSIZ];
int send_queue_index = 0;

int add_send_queue(json_object *obj) {
    if (send_queue_index < BUFSIZ) {
        send_queue[send_queue_index++] = obj;
    } else {
        die("add_send_queue OverflowError");
    }
}

// sendto wrapper
void send_msg(char *msg) {
    while (true) {
        int length = strlen(msg);
        if (length > (STRING_BUFFER_SIZE - 1)) {
            int split = length / (STRING_BUFFER_SIZE - 1) + 1;
            char big_msg[STRING_BUFFER_SIZE];
            sprintf(big_msg, "{\"msg\":\"big_msg\", \"split\":%d}", split);
            send_msg(big_msg);
            char *ptr = msg;
            for (int i = 0; i < split - 1; i++) {
                char buffer[STRING_BUFFER_SIZE];
                strncpy(buffer, ptr, STRING_BUFFER_SIZE - 1);
                buffer[STRING_BUFFER_SIZE - 1] = '\0';
                send_msg(buffer);
                ptr += STRING_BUFFER_SIZE - 1;
            }
            char buffer[STRING_BUFFER_SIZE];
            strncpy(buffer, ptr, length % (STRING_BUFFER_SIZE - 1));
            buffer[length % (STRING_BUFFER_SIZE - 1)] = '\0';
            send_msg(buffer);
            return;
        }
        int status = sendto(sockfd, (void *) msg, strlen(msg) + 1, 0, (struct sockaddr *) &server_address,
                            sizeof(server_address));
        if (status != -1) {
            break;
        }
        usleep(1);
    }
}

// send queued msg
char *send_queued_msg() {
    if (send_queue_index > 0) {
        json_object *request = json_object_new_object();
        json_object *array = json_object_new_array();

        json_object_object_add(request, "msg", json_object_new_string("queued_msg"));

        for (int i = 0; i < send_queue_index; i++) {
            json_object *current_obj = send_queue[i];
            json_object_array_add(array, current_obj);
            send_queue[i] = NULL;
        }

        json_object_object_add(request, "list", array);
        char *json = json_object_to_json_string(request);

        send_msg(json);

        send_queue_index = 0;
        json_object_put(request);
    }
}

/* HANDLE SOCKET */
#define PING_TIMEOUT 10000
const char PING_MSG[] = "{\"msg\":\"ping\"}";
const char PONG_MSG[] = "{\"msg\":\"pong\"}";

#define MILLISECOND_DIFF(begin, end) (((double) (end.tv_sec - begin.tv_sec) + (end.tv_nsec - begin.tv_nsec) * 1.0e-9) * 1000)
struct timespec last_receive_ping_time;
struct timespec last_send_ping_time;

void handle_socket();

void handle_msg(json_object *obj);

void handle_core(char *, json_object *);

// <handleSocket> -> handleMsg -> handle_core
void handle_socket() {
    char receive_buffer[STRING_BUFFER_SIZE];
    int server_address_size = sizeof(server_address);
    int recv = recvfrom(sockfd, (void *) &receive_buffer, sizeof(receive_buffer), 0,
                        (struct sockaddr *) &server_address,
                        &server_address_size);
    if (recv != -1) {
        json_object *obj = json_tokener_parse(receive_buffer);
        if (obj != NULL) {
            handle_msg(obj);
            json_object_put(obj);
        } else {
            perror("json_tokener_parse-Error");
        }
    }
    struct timespec current_time;
    clock_gettime(CLOCK_MONOTONIC, &current_time);

    if (last_send_ping_time.tv_sec != 0 && MILLISECOND_DIFF(last_send_ping_time, current_time) >= PING_TIMEOUT / 3) {
        int status = sendto(sockfd, (void *) &PING_MSG, sizeof(PING_MSG), 0, (struct sockaddr *) &server_address,
                            server_address_size);
        if (status != -1) {
            clock_gettime(CLOCK_MONOTONIC, &last_send_ping_time);
        }
    }

    if (last_receive_ping_time.tv_sec != 0 && MILLISECOND_DIFF(last_receive_ping_time, current_time) >= PING_TIMEOUT) {
        exit_with_save();
    }
}

// handleSocket -> <handleMsg> -> handle_core
void handle_msg(json_object *obj) {
    json_object *msg_obj = json_object_object_get(obj, "msg");
    if (msg_obj != NULL) {
        char *msg = json_object_get_string(msg_obj);
        if (strcmp(msg, "init_socket_end") == 0) {
            clock_gettime(CLOCK_MONOTONIC, &last_receive_ping_time);
            clock_gettime(CLOCK_MONOTONIC, &last_send_ping_time);
        } else if (strcmp(msg, "ping") == 0) {
            clock_gettime(CLOCK_MONOTONIC, &last_receive_ping_time);
            sendto(sockfd, (void *) &PONG_MSG, sizeof(PONG_MSG), 0, (struct sockaddr *) &server_address,
                   sizeof(server_address));
        } else if (strcmp(msg, "pong") == 0) {
        } else if (strcmp(msg, "close") == 0) {
            exit_with_save();
        } else {
            handle_core(msg, obj);
        }
    }
}

// handleSocket -> handleMsg -> <handle_core>

int get_travel_position() {
    return travel_position;
}

int get_click() {
    return click;
}

void set_travel_position(int i) {
    travel_position = i;
}

typedef struct {
    winid window;
    tty_menu_item *page_start;
    tty_menu_item *page_end;
    int page_lines;
    int counting;
    int count;
    struct WinDesc *cw;
    boolean *finished;
    boolean is_unused;
} MenuStatus;

MenuStatus menuStatus = {0,};

void save_menu_status(winid window, tty_menu_item *page_start, tty_menu_item *page_end, int page_lines, int counting,
                      int count, struct WinDesc *cw, boolean *finished) {
    menuStatus.window = window;
    menuStatus.page_start = page_start;
    menuStatus.page_end = page_end;
    menuStatus.page_lines = page_lines;
    menuStatus.counting = counting;
    menuStatus.count = count;
    menuStatus.cw = cw;
    menuStatus.finished = finished;
    menuStatus.is_unused = TRUE;
}

void clear_menu_status() {
    menuStatus.is_unused = FALSE;
}

bool clear_current_data();

bool init_current_data(char *type);

void send_delayed_msg();

void process_select_by_index(int sIndex) {
    boolean is_current_page = 0;
    int current_page_index = 0;
    tty_menu_item *cItem;
    int csIndex = 0;
    for (cItem = menuStatus.cw->mlist; cItem; cItem = cItem->next) {
        if (menuStatus.page_start == cItem) {
            is_current_page = TRUE;
        } else if (menuStatus.page_end == cItem) {
            is_current_page = FALSE;
        }
        if (cItem->identifier.a_void) {
            if (csIndex == sIndex) {
                toggle_menu_curr(menuStatus.window, cItem, current_page_index, is_current_page, menuStatus.counting,
                                 menuStatus.count);
                if (menuStatus.cw->how == PICK_ONE) {
                    *(menuStatus.finished) = TRUE;
                    key_code = 13;
                    is_key_triggered = TRUE;
                }
                menuStatus.counting = FALSE;
                menuStatus.count = 0;
                break;
            }
            csIndex++;
        }
        if (is_current_page) {
            current_page_index++;
        }
    }

    tty_curs(menuStatus.window, (int) strlen(menuStatus.cw->morestr) + 2, menuStatus.page_lines);
    (void) fflush(stdout);

    tty_menu_item *cItem1;
    for (cItem1 = menuStatus.cw->mlist; cItem1; cItem1 = cItem1->next) {
        if (cItem1->identifier.a_void) {
            send_update_menu_item(cItem1);
        }
    }
    clear_current_data();
}


void handle_core(char *msg, json_object *obj) {
    if (strcmp(msg, "key") == 0) {
        json_object *key_obj = json_object_object_get(obj, "keyCode");
        key_code = json_object_get_int(key_obj);
        is_key_triggered = true;
    } else if (strcmp(msg, "travel") == 0) {
        travel_position = json_object_get_int(json_object_object_get(obj, "i"));
        click = json_object_get_int(json_object_object_get(obj, "click"));
        key_code = 0;
        is_key_triggered = true;
    } else if (strcmp(msg, "select_index") == 0) {
        if (menuStatus.is_unused) {
            int select_index = json_object_get_int(json_object_object_get(obj, "index"));
            process_select_by_index(select_index);
        }
    } else if (strcmp(msg, "debug") == 0) {

    } else {
        // Unknown Request!
    }
}

static struct termios initial_settings, new_settings;

int kbhit() {
    struct timeval tv = {0L, 0L};
    fd_set fds;
    FD_ZERO(&fds);
    FD_SET(0, &fds);
    return select(1, &fds, NULL, NULL, &tv);
}

int getch() {
    int r;
    unsigned char c;
    if ((r = read(0, &c, sizeof(c))) < 0) {
        return r;
    } else {
        return c;
    }
}

void init_keyboard() {
    tcgetattr(0, &initial_settings);
    new_settings = initial_settings;
    new_settings.c_lflag &= ~ICANON;
    new_settings.c_lflag &= ~ECHO;
    new_settings.c_lflag &= ~ISIG;
    new_settings.c_cc[VMIN] = 1;
    new_settings.c_cc[VTIME] = 0;
    tcsetattr(0, TCSANOW, &new_settings);
}

/* KEY EMULATION */
int getch_by_webtiles() {
    while (true) {
        usleep(1);
        if (exit_mode) {
            exit_with_save();
        }
        clear_current_data();
        send_delayed_msg();
        send_queued_msg();
        handle_socket();
        if (is_key_triggered) {
            is_key_triggered = false;
            return key_code;
        }
        if (kbhit()) {
            return getch();
        }
    }
}

#define MATRIX_COL 256
json_object *current_data;

bool clear_current_data() {
    if (current_data != NULL) {
        add_send_queue(current_data);
        current_data = NULL;
    }
}

bool init_current_data(char *type) {
    if (current_data != NULL) {
        if (strcmp(type, json_object_get_string(json_object_object_get(current_data, "msg"))) == 0) {
            return false;
        } else {
            add_send_queue(current_data);
        }
    }
    current_data = json_object_new_object();
    json_object_object_add(current_data, "msg", json_object_new_string(type));
    return true;
}


int to_2d_index(x, y) {
    return y * MATRIX_COL + x;
}

int to_2d_y(index) {
    return index / MATRIX_COL;
}

int to_2d_x(index) {
    return index - to_2d_y(index) * MATRIX_COL;
}

void send_close_large_text() {
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("close_large_text"));
    add_send_queue(obj);
}

void send_character_pos(int x, int y) {
    json_object *obj = json_object_new_object();
    int i = to_2d_index(x, y);
    json_object_object_add(obj, "msg", json_object_new_string("tile"));
    json_object_object_add(obj, "i", json_object_new_int(i));
    json_object_object_add(obj, "u", json_object_new_boolean(1));
}

void send_tile(int x, int y, int t) {
    bool is_inited = init_current_data("tile");

    int i = to_2d_index(x, y);
    char i_string[5];

    sprintf(i_string, "%d", i);

    json_object *data = json_object_object_get(current_data, "data");
    if (data == NULL) {
        data = json_object_new_object();
        json_object_object_add(current_data, "data", data);
    }

    json_object *tile_data = json_object_object_get(data, i_string);
    if (tile_data == NULL) {
        tile_data = json_object_new_object();
        json_object_object_add(data, i_string, tile_data);
    }

    json_object_object_add(tile_data, "t", json_object_new_int(t));
    json_object_object_del(tile_data, "f");
}

void send_tile_flag(int x, int y, char *f) {
    bool is_inited = init_current_data("tile");

    int i = to_2d_index(x, y);
    char i_string[5];
    sprintf(i_string, "%d", i);

    json_object *data = json_object_object_get(current_data, "data");
    if (data == NULL) {
        data = json_object_new_object();
        json_object_object_add(current_data, "data", data);
    }

    json_object *tile_data = json_object_object_get(data, i_string);
    if (tile_data == NULL) {
        tile_data = json_object_new_object();
        json_object_object_add(data, i_string, tile_data);
    }

    json_object_object_add(tile_data, "f", json_object_new_string(f));
}

void send_close_menu_item() {
    bool is_inited = init_current_data("close_menu_item");
}

void send_update_menu_item(tty_menu_item *menu_item) {
    bool is_inited = init_current_data("update_menu_item");

    json_object *data = json_object_object_get(current_data, "list");
    if (data == NULL) {
        data = json_object_new_array();
        json_object_object_add(current_data, "list", data);
    }

    json_object *menu_item_data = json_object_new_object();

    json_object_object_add(menu_item_data, "count", json_object_new_int64(menu_item->count));
    json_object_object_add(menu_item_data, "selected", json_object_new_boolean(menu_item->selected));
    json_object_array_add(data, menu_item_data);
}

void send_built_in_menu_item(tty_menu_item *menu_item, int color, int attr) {
    bool is_inited = init_current_data("built_in_menu_item");

    json_object *data = json_object_object_get(current_data, "list");
    if (data == NULL) {
        data = json_object_new_array();
        json_object_object_add(current_data, "list", data);
    }

    json_object *menu_item_data = json_object_new_object();
    char selector_string[2];
    selector_string[0] = menu_item->selector;
    selector_string[1] = '\0';
    char ch_string[2];
    ch_string[0] = menu_item->ch;
    ch_string[1] = '\0';

    json_object_object_add(menu_item_data, "selector", json_object_new_string(selector_string));
    json_object_object_add(menu_item_data, "ch", json_object_new_string(ch_string));
    json_object_object_add(menu_item_data, "a_void", json_object_new_boolean(menu_item->identifier.a_void != 0 ? TRUE : FALSE));
    json_object_object_add(menu_item_data, "count", json_object_new_int64(menu_item->count));
    json_object_object_add(menu_item_data, "o_str", json_object_new_string(menu_item->o_str));
    json_object_object_add(menu_item_data, "attr", json_object_new_int(menu_item->attr));
    json_object_object_add(menu_item_data, "selected", json_object_new_boolean(menu_item->selected));
    json_object_object_add(menu_item_data, "tile", json_object_new_int(menu_item->tile));
    json_object_object_add(menu_item_data, "color", json_object_new_int(color));
    json_object_object_add(menu_item_data, "text_attr", json_object_new_int(attr));
    json_object_array_add(data, menu_item_data);
}


void send_menu_item(tty_menu_item *menu_item, int color, int attr) {
    bool is_inited = init_current_data("menu_item");

    json_object *data = json_object_object_get(current_data, "list");
    if (data == NULL) {
        data = json_object_new_array();
        json_object_object_add(current_data, "list", data);
    }

    json_object *menu_item_data = json_object_new_object();
    char selector_string[2];
    selector_string[0] = menu_item->selector;
    selector_string[1] = '\0';
    char ch_string[2];
    ch_string[0] = menu_item->ch;
    ch_string[1] = '\0';

    json_object_object_add(menu_item_data, "selector", json_object_new_string(selector_string));
    json_object_object_add(menu_item_data, "ch", json_object_new_string(ch_string));
    json_object_object_add(menu_item_data, "a_void", json_object_new_boolean(menu_item->identifier.a_void != 0 ? TRUE : FALSE));
    json_object_object_add(menu_item_data, "count", json_object_new_int64(menu_item->count));
    json_object_object_add(menu_item_data, "o_str", json_object_new_string(menu_item->o_str));
    json_object_object_add(menu_item_data, "attr", json_object_new_int(menu_item->attr));
    json_object_object_add(menu_item_data, "selected", json_object_new_boolean(menu_item->selected));
    json_object_object_add(menu_item_data, "tile", json_object_new_int(menu_item->tile));
    json_object_object_add(menu_item_data, "color", json_object_new_int(color));
    json_object_object_add(menu_item_data, "text_attr", json_object_new_int(attr));
    json_object_array_add(data, menu_item_data);
}

void add_status_condition(int fldidx, char *condtext, int coloridx, int attrmask) {
    bool is_inited = init_current_data("status");
    char fldidx_string[3];
    sprintf(fldidx_string, "%d", fldidx);

    json_object *data = json_object_object_get(current_data, "data");
    if (data == NULL) {
        data = json_object_new_object();
        json_object_object_add(current_data, "data", data);
    }

    json_object *status_data = json_object_object_get(data, fldidx_string);
    if (status_data == NULL) {
        status_data = json_object_new_object();
        json_object_object_add(data, fldidx_string, status_data);
    }

    json_object *condition_list = json_object_object_get(status_data, "condition_list");
    if (condition_list == NULL) {
        condition_list = json_object_new_array();
        json_object_object_add(status_data, "condition_list", condition_list);
    }
    json_object *condition_data = json_object_new_object();
    json_object_object_add(condition_data, "condtext", json_object_new_string(condtext));
    json_object_object_add(condition_data, "coloridx", json_object_new_int(coloridx));
    json_object_object_add(condition_data, "attrmask", json_object_new_int(attrmask));
    json_object_array_add(condition_list, condition_data);
}


void add_status_attr(int fldidx, int attr) {
    bool is_inited = init_current_data("status");
    char fldidx_string[3];
    sprintf(fldidx_string, "%d", fldidx);

    json_object *data = json_object_object_get(current_data, "data");
    if (data == NULL) {
        data = json_object_new_object();
        json_object_object_add(current_data, "data", data);
    }

    json_object *status_data = json_object_object_get(data, fldidx_string);
    if (status_data == NULL) {
        status_data = json_object_new_object();
        json_object_object_add(data, fldidx_string, status_data);
    }

    json_object_object_add(status_data, "attr", json_object_new_int(attr));
}

void send_status(int fldidx, int chg, int percent, int color, genericptr_t *ptr) {
    bool is_inited = init_current_data("status");

    char fldidx_string[3];
    sprintf(fldidx_string, "%d", fldidx);

    json_object *data = json_object_object_get(current_data, "data");
    if (data == NULL) {
        data = json_object_new_object();
        json_object_object_add(current_data, "data", data);
    }

    json_object *status_data = json_object_object_get(data, fldidx_string);
    if (status_data == NULL) {
        status_data = json_object_new_object();
        json_object_object_add(data, fldidx_string, status_data);
    }

    // json_object_object_add(status_data, "fldidx", json_object_new_int(fldidx));
    json_object_object_add(status_data, "chg", json_object_new_int(chg));
    json_object_object_add(status_data, "percent", json_object_new_int(percent));
    json_object_object_add(status_data, "color", json_object_new_int(color));
    if (fldidx != BL_CONDITION && ptr != NULL) {
        char *text = (char *) ptr;
        json_object_object_add(status_data, "text", json_object_new_string(text));
    } else {
        long *condition = (long *) ptr;
        json_object_object_add(status_data, "condition", json_object_new_int64(condition));
    }
}


void send_more(char *prompt) {
    bool is_inited = init_current_data("more");
    json_object_object_add(current_data, "prompt", json_object_new_string(prompt));
}

void send_close_more() {
    bool is_inited = init_current_data("close_more");
}

int cursor = -1;
int last_send_cursor = -1;
boolean screen_change = TRUE;
boolean built_in_menu_lock = FALSE;

void set_built_in_menu_lock(boolean flag) {
    built_in_menu_lock = flag;
}

boolean get_built_in_menu_lock() {
    return built_in_menu_lock;
}

void set_screen_change(boolean flag) {
    screen_change = flag;
}

void send_start_sharp_input(char *query) {
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("start_sharp_input"));
    json_object_object_add(obj, "query", json_object_new_string(query));
    add_send_queue(obj);
}

void send_sharp_autocomplete(char *autocomplete) {
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("sharp_autocomplete"));
    json_object_object_add(obj, "autocomplete", json_object_new_string(autocomplete));
    add_send_queue(obj);
}


void send_sharp_input(char c) {
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("sharp_input"));
    json_object_object_add(obj, "c", json_object_new_int(c));
    add_send_queue(obj);
}

void send_close_sharp_input() {
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("close_sharp_input"));
    add_send_queue(obj);
}

char *stringify(char *);

void send_tty_raw_print(char *text) {
    bool is_inited = init_current_data("tty_raw_print");

    json_object *data = json_object_object_get(current_data, "list");
    if (data == NULL) {
        data = json_object_new_array();
        json_object_object_add(current_data, "list", data);
    }

    json_object_array_add(data, json_object_new_string(text));
}

void send_text(char *text) {
    if (screen_change) {
        bool is_inited = init_current_data("text");

        json_object *data = json_object_object_get(current_data, "list");
        if (data == NULL) {
            data = json_object_new_array();
            json_object_object_add(current_data, "list", data);
        }

        json_object_array_add(data, json_object_new_string(text));
    }
}

boolean init_game = FALSE;

boolean get_init_game() {
    return init_game;
}

void send_init_game() {
    init_game = true;
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("init_game"));

    char *json = json_object_to_json_string(obj);
    send_msg(json);
    json_object_put(obj);
}

void send_error_start() {
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("error_start"));

    char *json = json_object_to_json_string(obj);
    send_msg(json);
    json_object_put(obj);
}

void send_error(char *error) {
    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("error"));
    json_object_object_add(obj, "error", json_object_new_string(error));

    char *json = json_object_to_json_string(obj);
    send_msg(json);
    json_object_put(obj);
}

void send_start_yn_function(char *query, char *resp, char def) {
    bool is_inited = init_current_data("start_yn_function");
    char def_string[2];
    def_string[0] = def;
    def_string[1] = '\0';
    json_object_object_add(current_data, "resp", resp == NULL ? json_object_new_null() : json_object_new_string(resp));
    json_object_object_add(current_data, "query", json_object_new_string(query));
    json_object_object_add(current_data, "def", json_object_new_string(def_string));
}

void send_end_yn_function() {
    bool is_inited = init_current_data("end_yn_function");
}

void send_large_text(char *text) {
    bool is_inited = init_current_data("large_text");

    json_object *data = json_object_object_get(current_data, "list");
    if (data == NULL) {
        data = json_object_new_array();
        json_object_object_add(current_data, "list", data);
    }

    json_object_array_add(data, json_object_new_string(text));
}

void send_clear_built_in_inventory() {
    init_current_data("clear_built_in_inventory");
}

void send_clear_tile() {
    if (screen_change) {
        bool is_inited = init_current_data("clear_tile");
    }
}

void set_cursor(int x, int y) {
    if (screen_change) {
        cursor = to_2d_index(x, y);
    }
}

void send_cursor() {
    if (last_send_cursor != cursor) {
        json_object *obj = json_object_new_object();
        json_object_object_add(obj, "msg", json_object_new_string("cursor"));
        json_object_object_add(obj, "i", json_object_new_int(cursor));
        add_send_queue(obj);
        last_send_cursor = cursor;
    }
}

void send_delayed_msg() {
    send_cursor();
}

void send_debug(char *format, ...) {
    char debug[STRING_BUFFER_SIZE_HALF];
    va_list arg_ptr;

    va_start(arg_ptr, format);
    vsnprintf(debug, STRING_BUFFER_SIZE_HALF, format, arg_ptr);
    va_end(arg_ptr);

    json_object *obj = json_object_new_object();
    json_object_object_add(obj, "msg", json_object_new_string("debug"));
    json_object_object_add(obj, "debug", json_object_new_string(debug));

    char *json = json_object_to_json_string(obj);
    send_msg(json);
    json_object_put(obj);
}

char *stringify(char *str) {
    if (str != NULL) {
        return json_object_to_json_string(json_object_new_string(str));
    } else {
        return NULL;
    }
}