#define SHM_KEY_PATH "/opt/nethack/nethack.alt.org/dgldir/dgamelaunch.db"
#define USERDATA_DIR "/opt/nethack/nethack.alt.org/dgldir/userdata/%s/ttyrec/"
#define USERDATA_DUMMY_PATH "/opt/nethack/nethack.alt.org/dgldir/userdata/DUMMY%d/1999-99-99.99:99:99.ttyrec"
#define INPROGRESS_DIR "/opt/nethack/nethack.alt.org/dgldir/inprogress-nh343/"
#define INPROGRESS_DUMMY_PATH "/opt/nethack/nethack.alt.org/dgldir/inprogress-nh343/DUMMY:1999-99-99.99:99:99.ttyrec"
#define INPROGRESS_DUMMY_BACKUP_PATH "./dgldir/inprogress/DUMMY:1999-99-99.99:99:99.ttyrec"

#include <stdio.h>
#include <fcntl.h>
#include <sys/shm.h>
#include <semaphore.h>
#include <sys/ipc.h>
#include <sys/types.h>
#include <string.h>
#include <stdlib.h>
#include <dirent.h>

int shm_n_games = 200;   // 공유 메모리에 저장할 수 있는 최대 게임 개수
int num_games = 1;       // parameter --num-games=INT which will set the maximum number of games dgamelaunch supports.

// 공유 메모리로 공유되는 정보
struct dg_shm
{
    sem_t dg_sem;        // 세마포어 변수로, 공유 메모리를 사용할 수 있을 때까지 기다리는 용도로 사용한다.
    long max_n_games;    // 공유 메모리에 저장할 수 있는 최대 게임 개수
    long cur_n_games;    // 현재 실행 중인 게임 개수
};

// 배열 형태로 현재 플레이 중인 게임 목록이 저장된다.
struct dg_shm_game
{
    long  in_use;         // 공유 메모리에서 데이터를 삭제 처리하는 용도이다. 실제로 메모리 안의 값을 수정하거나 삭제하지 않고 이 변수를 통해 마킹만 한다. (0 : 삭제됨, 1 : 값이 존재함)
    long  nwatchers;      // 관전자 수
    char  ttyrec_fn[150]; // 게임 플레이어의 ttyrec(userdata) 파일 경로
};

// 화면에 표시할 게임 정보이다.
struct dg_game
{
    char *ttyrec_fn;      // 게임 플레이어의 ttyrec(userdata) 파일 경로
    char *name;           // 사용자 닉네임
    char *date;           // 게임 시작 날짜
    char *time;           // 게임 시작 시간
    time_t idle_time;     // ttyrec(userdata) 파일의 마지막 수정 시간
    int ws_row, ws_col;   /* Window size */
    int gamenum;          // 게임 종류 식별 번호 (Nethack, DCSS 등 여러 게임을 dgamelaunch가 지원할 때 구별하는 용도로 사용하는 것으로 추측)

    int is_in_shm;        // 공유 메모리에 이 게임 정보가 이미 있다는 것을 표시
    int shm_idx;          // 이 게임 정보가 공유 메모리의 어느 인덱스에 위치하는지 표시
    int nwatchers;        // 관전자 수

    char *extra_info;      // 게임에 의해 쓰여진 추가 정보("100|Astral", "1|D:1")이다. 정렬 기준으로 사용되지만 설정 파일에 주석처리 되어있으므로 사용되지 않는다.
    int extra_info_weight; // 정렬 시 높은 가중치를 가진 게임이 더 앞에 위치하게 된다.
};

// =====================================================================

void
debug_write(char *str)
{
    printf("%s\n", str);
}

void
graceful_exit (int status)
{
    exit (status);
}

// =====================================================================
// 'sem'이 이름에 있다면 세마포어(Semaphore)를 사용,
// 'shm'이 이름에 있다면 공유 메모리(Shared Memory)를 사용한다는 의미이다.
// 공유 메모리를 사용하는 부분을 세마포어(wait, post)로 감싸는 것으로 동기화한다.

/*
    세마포어를 사용하여 공유 메모리를 사용할 수 있을 때까지 대기한다.
    테스트 중 아무 응답 없이 프로그램이 멈추는 경우는
    post로 락을 해제하지 않은 채로 프로그램을 종료해서 무한으로 대기하기 때문일 수 있다.
*/
void
shm_sem_wait(struct dg_shm *shm_dg_data)
{
    if (sem_wait(&(shm_dg_data->dg_sem)) == -1) {
        debug_write("sem_wait");
        graceful_exit(77);
    }
}

/*
    공유 메모리의 세마포어 락을 해제한다.
*/
void
shm_sem_post(struct dg_shm *shm_dg_data)
{
    if (sem_post(&(shm_dg_data->dg_sem)) == -1) {
        debug_write("sem_post");
        graceful_exit(78);
    }
}

// =====================================================================

/*
    공유 메모리와 세마포어를 사용하기 위해서 IPC(Inter-Process Communication)키를 생성한다.
    ftok(file-to-key)의 매개변수에 들어가는 경로에 해당하는 파일이 실제로 있어야 하며
    같은 파일로 생성한 키는 모든 프로세스에서 같은 값을 가진다.
    shm_key : 공유 메모리 키 (shm_get()을 호출하는 곳에서만 사용된다.)
    shm_sem_key : 세마포어 키 (실제 사용되는 곳이 없다.)
*/
void
shm_mk_keys(key_t *shm_key, key_t *shm_sem_key)
{
    char * passwd = SHM_KEY_PATH;
    if ((*shm_key = ftok(passwd, 'R')) == -1) {
        debug_write("ftok shm_key");
        graceful_exit(71);
    }

    // 같은 파일로 생성한 키가 모든 프로세스에서 일치하는지 이 코드로 확인할 수 있다.
    printf("shmkey : 0x%x // %d\n", *shm_key, *shm_key);

    if ((*shm_sem_key = ftok(passwd, 'S')) == -1) {
        debug_write("ftok shm_sem_key");
        graceful_exit(72);
    }
}

/*
    공유 메모리가 없다면 새로 만들고
    이미 있다면 포인터가 공유 메모리를 가리키도록 한다.
*/
void
shm_init(struct dg_shm **shm_dg_data, struct dg_shm_game **shm_dg_game)
{
    key_t shm_key;
    key_t shm_sem_key;
    int   shm_id;
    int   shm_size;
    void *shm_data = NULL;
    int   shm_data_existed = 0;

    shm_mk_keys(&shm_key, &shm_sem_key);
    
    /* 최대 shm_n_games(200)개의 게임이 공유 메모리에 존재할 수 있다.
        max. shm_n_games simultaneous games recorded in the shared memory */
    shm_size = sizeof(struct dg_shm) + shm_n_games * sizeof(struct dg_shm_game);

    /* 공유 메모리를 만들고 식별자를 얻는다.
        connect to (and possibly create) the segment */
    if ((shm_id = shmget(shm_key, shm_size, 0644 | IPC_CREAT | IPC_EXCL)) == -1) {
        /* 만들기에 실패했다면 이미 공유 메모리가 있다는 뜻이므로 그 메모리를 사용한다.
            creation failed, so it already exists. attach to it */
        shm_data_existed = 1;
        if ((shm_id = shmget(shm_key, shm_size, 0644)) == -1) {
            debug_write("shmget");
            graceful_exit(73);
        }
    }

    /* 포인터가 공유 메모리를 가리키게 한다.
        attach to the segment to get a pointer to it: */
    shm_data = shmat(shm_id, (void *)0, 0);
    if (shm_data == (char *)(-1)) {
        debug_write("shmat");
        graceful_exit(74);
    }
    if (!shm_data) {
        debug_write("shm_data == null");
        graceful_exit(75);
    }

    // 공유 메모리의 구역을 나눠서 서로 다른 구조체 포인터가 가리키게 한다.
    (*shm_dg_data) = (struct dg_shm *)shm_data;
    (*shm_dg_game) = (struct dg_shm_game *)((*shm_dg_data) + sizeof(struct dg_shm));
    
    printf("Shared memory size : %d + %d * %d = %d bytes\n", 
        sizeof(struct dg_shm),
        shm_n_games,
        sizeof(struct dg_shm_game),
        sizeof(struct dg_shm) + shm_n_games * sizeof(struct dg_shm_game));

    // 공유 메모리를 직접 생성한 경우 초기화한다.
    if (!shm_data_existed && shm_data) {
        memset(*shm_dg_game, 0, shm_n_games*sizeof(struct dg_shm_game));
        (*shm_dg_data)->max_n_games = shm_n_games;
        (*shm_dg_data)->cur_n_games = 0;
        if (sem_init(&((*shm_dg_data)->dg_sem), 1,1) == -1) {
            debug_write("sem_init");
            graceful_exit(76);
        }
    }
}

/*
    공유 메모리를 해제한다.
    실제 사용되는 곳은 main()에서 argv 옵션으로 'S'를 받았을 때 뿐이다.
*/
int
shm_free()
{
    key_t shm, sem;
    int   shm_id;
    int shm_size = sizeof(struct dg_shm) + shm_n_games * sizeof(struct dg_shm_game);
    shm_mk_keys(&shm, &sem);
    if ((shm_id = shmget(shm, shm_size, 0644)) != -1) {
        shmctl(shm_id, IPC_RMID, NULL);
        return 0;
    }
    return 1;
}

/*
    stderr 출력 스트림에 공유 메모리 상태를 출력한다.
    실제 사용되는 곳은 main()에서 argv 옵션으로 'D'를 받았을 때 뿐이다.
*/
void
shm_dump()
{
    struct dg_shm *shm_dg_data = NULL;
    struct dg_shm_game *shm_dg_game = NULL;
    int di, unused = -1;
    shm_init(&shm_dg_data, &shm_dg_game);
    shm_sem_wait(shm_dg_data);

    for (di = 0; di < shm_dg_data->max_n_games; di++) {
        if (shm_dg_game[di].in_use) {
            if (unused != -1) {
                if (unused != di-1)
                    fprintf(stderr, "%i-%i:\tunused\n", unused, di-1);
                else
                    fprintf(stderr, "%i:\tunused\n", unused);
                unused = -1;
            }
            fprintf(stderr, "%i:\t\"%s\"\twatchers:%li\n", di, shm_dg_game[di].ttyrec_fn, shm_dg_game[di].nwatchers);
        } else {
            if (unused == -1) unused = di;
        }
    }
    if (unused != -1) {
        if (unused != di-1)
            fprintf(stderr, "%i-%i:\tunused\n", unused, di-1);
        else
            fprintf(stderr, "%i:\tunused\n", unused);
        unused = -1;
    }

    shm_sem_post(shm_dg_data);
    //shmdt(shm_dg_data);
}

// =====================================================================

/*
    파일에서 불러온 게임 데이터와 공유 메모리에 있는 게임 데이터를 비교하여 서로 정보를 최신화한다.
    공유 메모리 -> 파일
        1. 관전자 수 불러오기
        2. 공유 메모리 안에 이미 게임 정보가 있는지 파악
        3. 공유 메모리 안에 이미 있는 게임들이 어느 인덱스에 있는지 메모
    파일 -> 공유 메모리
        4. 현재 플레이 중이 아닌 게임을 공유 메모리에서 삭제 (실제로 메모리에서 지우지 않고 in_use값을 0으로 해서 쓰지 않는다고 표시만 해둔다.)
        5. 새로 플레이 중인 게임이 생겼다면 공유 메모리에 정보를 저장
*/
void
shm_update(struct dg_shm *shm_dg_data, struct dg_game **games, int len)
{
    int di, i;
    struct dg_shm_game *shm_dg_game = (struct dg_shm_game *)(shm_dg_data + sizeof(struct dg_shm));

    // 대기 후 임계영역 진입
    shm_sem_wait(shm_dg_data);

    // 공유 메모리 안의 데이터와
    for (di = 0; di < shm_dg_data->max_n_games; di++)
    if (shm_dg_game[di].in_use) {
        int delgame = 1;
        // 파일로부터 읽어온 게임 목록을 비교해서
        for (i = 0; i < len; i++) {
            // ttyrec(userdata)경로가 같은 것을 발견하면
            if (!strcmp(games[i]->ttyrec_fn, shm_dg_game[di].ttyrec_fn)) {
                delgame = 0;
                games[i]->is_in_shm = 1;    // 공유 메모리에 이미 이 게임 데이터가 있다고 표시
                games[i]->shm_idx = di;     // 이 게임 데이터가 공유 메모리의 어느 인덱스에 존재하는지 저장
                games[i]->nwatchers = shm_dg_game[di].nwatchers; // 공유 메모리의 관전자 수 가져오기
                break;
            }
        }
        // 파일로부터 읽어온 게임 목록인 games에 데이터가 없다는 것은 현재 플레이되고 있지 않다는 의미이므로
        // 공유 메모리에만 존재하는 게임 정보를 만료된 것으로 취급하여 지운다.
        // (실제로 메모리에서 지우지 않고 in_use값을 0으로 해서 쓰지 않는다고 표시만 해둔다.)
        if (delgame) {
            shm_dg_game[di].in_use = 0;
            if (shm_dg_data->cur_n_games > 0) shm_dg_data->cur_n_games--;
        }
    }

    // 공유 메모리에 자리가 남아있고
    if (shm_dg_data->cur_n_games < shm_dg_data->max_n_games) {
    // 파일로부터 읽어온 게임 목록에서
    for (i = 0; i < len; i++)
        // 공유 메모리에 올라가지 않은 게임 정보가 있다면
        if (!games[i]->is_in_shm) {
            // 공유 메모리에 남아있는 자리를 찾아서
            for (di = 0; di < shm_dg_data->max_n_games; di++)
            if (!shm_dg_game[di].in_use) {
                shm_dg_game[di].in_use = 1;     // 자리를 사용한다고 표시
                shm_dg_game[di].nwatchers = 0;  // 관전자 수를 초기화

                games[i]->nwatchers = 0;        // 관전자 수를 초기화
                games[i]->is_in_shm = 1;        // 공유 메모리에 올렸다고 표시
                games[i]->shm_idx = di;         // 공유 메모리의 어느 인덱스를 사용 중인지 기록

                shm_dg_data->cur_n_games++;     // 플레이 중인 게임 수가 늘었음을 알림
                strncpy(shm_dg_game[di].ttyrec_fn, games[i]->ttyrec_fn, 150); // ttyrec(userdata)경로를 공유 메모리에 저장
                break;
            }
        }
    }

    // 임계영역 탈출
    shm_sem_post(shm_dg_data);
}

/*
    파일로부터 현재 플레이 중인 게임 정보들을 읽어온다.
*/
struct dg_game **
populate_games (int xgame, int *l, struct dg_user *me)
{
    int fd, len, n, pid;
    DIR *pdir;
    struct dirent *pdirent;
    struct stat pstat;
    char fullname[130], ttyrecname[130], pidws[80], playername[31];
    char *replacestr, *dir_path, *p;
    struct dg_game **games = NULL;
    int game = 0;

    len = 0;

    // inprogress 디렉토리의 ttyrec 파일들을 읽어 현재 플레이 중인 게임 정보를 파악한다.
    dir_path = INPROGRESS_DIR;
    if (!dir_path) return;
    if (!(pdir = opendir (dir_path))) {
        debug_write("cannot open inprogress-dir");
        graceful_exit (140);
    }
    while ((pdirent = readdir (pdir)))
    {
        if (!strcmp (pdirent->d_name, ".") || !strcmp (pdirent->d_name, ".."))
            continue;

        // ttyrec(inprogress) 파일을 연다.
        char *inprog = INPROGRESS_DIR;
        if (!inprog) continue;
        snprintf (fullname, 130, "%s%s", inprog, pdirent->d_name);
        fd = open (fullname, O_RDWR);

        // 파일명에서 플레이어 닉네임을 추출하여 ttyrec(userdata) 폴더를 찾는다.
        strncpy(playername, pdirent->d_name, 31);
        playername[31] = '\0';
        if ((replacestr = strchr(playername, ':')))
            *replacestr = '\0';

        // 파일명에서 날짜 및 시간을 추출하여 ttyrec(userdata) 파일을 찾는다.
        replacestr = strchr(pdirent->d_name, ':');
        if (!replacestr) {
            debug_write("inprogress-filename does not have ':'");
            graceful_exit(145);
        }
        replacestr++;

        // ttyrec(userdata) 파일의 상세 정보를 가져온다.
        char ttrecdir[80] = {};
        sprintf(ttrecdir, USERDATA_DIR, playername); 
        if (!ttrecdir) continue;
        snprintf (ttyrecname, 130, "%s%s", ttrecdir, replacestr);
        
        /* now it's a valid game for sure */
        if (stat (ttyrecname, &pstat)) continue;

        // 플레이 중인 게임 개수에 맞게 정보를 담을 메모리를 동적 할당한다.
        games = realloc (games, sizeof (struct dg_game) * (len + 1));
        games[len] = malloc (sizeof (struct dg_game));

        // ttyrec(userdata) 파일명이 규칙에 맞게 지어진 것인지 검사
        if (!(replacestr = strchr (pdirent->d_name, ':'))) {
            debug_write("inprogress-filename does not have ':', pt. 2");
            graceful_exit (146);
        } else {
            *replacestr = '\0';
        }

        games[len]->name = malloc (strlen (pdirent->d_name) + 1);
        games[len]->date = malloc (11);
        games[len]->time = malloc (9);
        strncpy (games[len]->name, pdirent->d_name, strlen (pdirent->d_name) + 1);
        strncpy (games[len]->date, replacestr + 1, 11);     
        strncpy (games[len]->time, replacestr + 12, 9);
        games[len]->ttyrec_fn = strdup (ttyrecname); 
        games[len]->idle_time = pstat.st_mtime;
        games[len]->gamenum = game;
        games[len]->is_in_shm = 0;
        games[len]->nwatchers = 0;
        games[len]->shm_idx = -1;
        
        // ttyrec(inprogress) 파일을 읽어서 pid, 창 크기(ws_row, ws_col)를 얻는다.
        n = read(fd, pidws, sizeof(pidws) - 1);
        if (n > 0) {
            pidws[n] = '\0';
            p = pidws;
        } else {
            p = "";
        }
            
        // pid
        pid = atoi(p);
        while (*p != '\0' && *p != '\n') p++;
        if (*p != '\0') p++;

        // ws_row
        games[len]->ws_row = atoi(p);
        while (*p != '\0' && *p != '\n') p++;
        if (*p != '\0') p++;

        // ws_col
        games[len]->ws_col = atoi(p);

        // 창 크기가 너무 작으면 24*80으로 저장한다.
        if (games[len]->ws_row < 4 || games[len]->ws_col < 4) {
            games[len]->ws_row = 24;
            games[len]->ws_col = 80;
        }

        games[len]->extra_info = NULL;
        games[len]->extra_info_weight = 0;

        len++;

        close (fd);
    }

    closedir (pdir);

    *l = len;
    return games;
}

// =====================================================================
/*
    파일에서 데이터를 읽지 않고 직접 테스트 데이터를 생성한다.
*/
struct dg_game **
populate_games_test (int *return_length)
{
    int fd, n, pid;
    char fullname[130], pidws[80], playername[31];
    char *replacestr, *dir_path, *p;
    struct dg_game **games = NULL;

    char userdataDirectory[31] = "DUMMY";
    char *datetimeStr = ":1999-99-99.99:99:99";
    char ttyrecname[130] = USERDATA_DUMMY_PATH;

    int game_length = 10;
    int game_index;
    for (game_index = 0; game_index < game_length; game_index++) {
        // 플레이 중인 게임 개수에 맞게 정보를 담을 메모리를 동적 할당한다.
        games = realloc (games, sizeof (struct dg_game) * (game_index + 1));
        games[game_index] = malloc (sizeof (struct dg_game));
        games[game_index]->name = malloc (strlen (userdataDirectory) + 1);
        games[game_index]->date = malloc (11);
        games[game_index]->time = malloc (9);

        // 초기 값을 넣어준다.
        strncpy (games[game_index]->name, userdataDirectory, strlen (userdataDirectory) + 1);
        strncpy (games[game_index]->date, datetimeStr + 1, 11);     
        strncpy (games[game_index]->time, datetimeStr + 12, 9);

        char temp_ttyrecname[130] = {};
        sprintf(temp_ttyrecname, ttyrecname, game_index);
        games[game_index]->ttyrec_fn = strdup (temp_ttyrecname); 
        
        games[game_index]->idle_time = 0;
        games[game_index]->gamenum = 0;

        games[game_index]->is_in_shm = 0;
        games[game_index]->nwatchers = 99;
        games[game_index]->shm_idx = -1;

        games[game_index]->ws_row = 24;
        games[game_index]->ws_col = 80;

        games[game_index]->extra_info = NULL;
        games[game_index]->extra_info_weight = 0;
    }

    *return_length = game_index;
    return games;
}

/*
    공유 메모리의 정보를 직접 수정한다.
*/
void
shm_modify_element_test(struct dg_shm *shm_dg_data, struct dg_shm_game *shm_dg_game)
{
    char ttyrecname[130] = "modified";

    // 대기 후 임계영역 진입
    shm_sem_wait(shm_dg_data);

    if (shm_dg_game[1].in_use) {
        shm_dg_game[1].nwatchers = 1;
        strncpy(shm_dg_game[1].ttyrec_fn, ttyrecname, 150);
    }

    if (shm_dg_game[3].in_use) {
        shm_dg_game[3].nwatchers = 333;
    }

    if (shm_dg_game[5].in_use) {
        shm_dg_game[5].nwatchers = 55555;
        strncpy(shm_dg_game[5].ttyrec_fn, ttyrecname, 150);
    }

    if (shm_dg_game[7].in_use) {
        shm_dg_game[7].nwatchers = 7777777;
        strncpy(shm_dg_game[7].ttyrec_fn, ttyrecname, 150);
    }

    if (shm_dg_game[99].in_use) {
        shm_dg_game[99].nwatchers = 99;
        strncpy(shm_dg_game[99].ttyrec_fn, ttyrecname, 150);
    }

    // 임계영역 탈출
    shm_sem_post(shm_dg_data);
}

/*
    공유 메모리 크기는 shm_n_games에 의해 고정되어 있고
    데이터가 있는지 없는지는 in_use 변수를 통해 판단된다. (0 : 삭제됨, 1 : 값이 존재함)
    데이터를 삭제했다면 현재 플레이 중인 게임 수가 줄었다고 cur_n_games 변수를 통해 알려야 한다.
*/
void
shm_delete_element_test(struct dg_shm *shm_dg_data, struct dg_shm_game *shm_dg_game)
{
    // 대기 후 임계영역 진입
    shm_sem_wait(shm_dg_data);

    if (shm_dg_game[0].in_use) {
        shm_dg_game[0].in_use = 0;
        shm_dg_data->cur_n_games--;
    }

    if (shm_dg_game[2].in_use) {
        shm_dg_game[2].in_use = 0;
        shm_dg_data->cur_n_games--;
    }
    if (shm_dg_game[4].in_use) {
        shm_dg_game[4].in_use = 0;
        shm_dg_data->cur_n_games--;
    }

    if (shm_dg_game[6].in_use) {
        shm_dg_game[6].in_use = 0;
        shm_dg_data->cur_n_games--;
    }

    if (shm_dg_game[99].in_use) {
        shm_dg_game[99].in_use = 0;
        shm_dg_data->cur_n_games--;
    }

    // 임계영역 탈출
    shm_sem_post(shm_dg_data);
}

// =====================================================================

void
copy_dummy_file(char *path_from, char *path_to)
{
    int fd_from = open(path_from, O_RDONLY);
    if (fd_from < 0) {
        printf("Failed to open %s\n", path_from);
        return;
    }

    int fd_to = open(path_to, O_WRONLY | O_CREAT | O_EXCL, 0666);
    if (fd_from < 0) {
        printf("Failed to create %s\n", path_to);
        close(fd_from);
        return;
    }

    char buffer[1024];
    int read_bytes = 0;
    while((read_bytes = read(fd_from, buffer, sizeof(buffer))) > 0) {
        write(fd_to, buffer, read_bytes);
    }

    close(fd_from);
    close(fd_to);
}

int
open_dummy_file()
{
    int file_descriptor = open (INPROGRESS_DUMMY_PATH, O_RDWR);
    if (file_descriptor < 0) {
        printf("Failed to open dummy file.\n");
    }
    printf("File descriptor : %d\n", file_descriptor);

    return file_descriptor;
}

void
lock_dummy_file(int file_descriptor)
{
    struct flock file_lock = { 0 };
    file_lock.l_type = F_WRLCK;     // 쓰기 잠금
    file_lock.l_whence = SEEK_SET;  // 파일의 시작부터
    file_lock.l_start = 0;          // whence를 기준으로 시작부터
    file_lock.l_len = 0;            // 파일의 끝까지

    // 파일의 레코드를 잠근다. 무엇을 잠글 것인지, 레코드 범위 등 세부사항은 flock의 내용에 따른다.
    int file_control_result = fcntl (file_descriptor, F_SETLK, &file_lock);
    if (file_control_result < 0) {
        printf("Failed to set write lock.\n");
    }
    else {
        // 이 메시지를 확인했음에도 더미 파일이 다른 dgamelaunch에 의해 삭제된다면
        // 파일이 제대로 열리지 않았을 가능성이 있다. (root 권한으로 생성되어 권한이 부족한 경우 등)
        printf("Locking...\n");
    }

    printf("fcntl result : %d\n", file_control_result);
}

// =====================================================================

int main(int argc, char *argv[]) {
    struct dg_shm *shm_dg_data = NULL;
    struct dg_shm_game *shm_dg_game = NULL;
    struct dg_game **games = NULL;

    int test_scenario = 2;
    if (argc == 2) {
        test_scenario = atoi(argv[1]);
    }

    switch (test_scenario) {
        // dgamelaunch와 플레이 중인 게임 목록을 공유하기 위한 최소한의 동작이다.
        // 공유 메모리를 사용하는 부분이 없더라도 파일을 통해 읽은 가짜 게임 데이터를 화면에 표시할 수 있다.
        case 1:
            // ttyrec(inprogress) 파일을 %chroot%/dgldir/inprogress 경로에 위치시킨다.
            copy_dummy_file(INPROGRESS_DUMMY_BACKUP_PATH, INPROGRESS_DUMMY_PATH);
            
            // ttyrec(inprogress) 파일에 쓰기 락을 걸어서 게임이 현재 플레이 중이라는 것을 다른 dgamelaunch 프로세스에게 알린다.
            int fd = open_dummy_file();
            lock_dummy_file(fd);

            for (int i=1; i<=60; i++) {
                sleep(1);
            }
            close(fd);
            printf("Unlocked\n");
            break;

        // 공유 메모리를 비우고 직접 만든 테스트 데이터를 생성/수정/삭제 한다.
        case 2 : 
            shm_free();
            shm_init(&shm_dg_data, &shm_dg_game);

            int return_game_count = 20;
            games = populate_games_test(&return_game_count);
            //games = populate_games (-1, &return_game_count, NULL);
            shm_update(shm_dg_data, games, return_game_count);

            shm_dump();

            shm_modify_element_test(shm_dg_data, shm_dg_game);
            shm_delete_element_test(shm_dg_data, shm_dg_game);

            shm_dump();
            break;

        // 다른 dgamelaunch 프로세스에서 생성한 공유 메모리 데이터를 읽어서 수정/삭제 한다.
        // 변경된 공유 메모리를 다른 dgamelaunch 프로세스에서 확인했을 때의 동작은 다음과 같다.
        //  - 관전자 수를 수정했을 경우 : 관전자 수를 받아와 최신화한다.
        //  - in_use를 0으로 바꿔 삭제했을 경우 : 공유 메모리에서 관전자 수를 받아와 최신화하는 과정을 생략한다.
        //  - ttyrec(userdata) 파일 경로를 존재하지 않는 파일 경로로 수정했을 경우 : in_use 변수를 0으로 수정해서 삭제 처리한다.
        // 위 과정을 거친 후 dgamelaunch 자신이 직접 읽어온 파일 데이터를 다시 공유 메모리에 올린다.
        case 3 : 
            shm_init(&shm_dg_data, &shm_dg_game);

            shm_dump();

            shm_modify_element_test(shm_dg_data, shm_dg_game);
            shm_delete_element_test(shm_dg_data, shm_dg_game);

            shm_dump();

            break;

        case 4 :
            shm_free();
            break;
            
        case 5 : 
            shm_dump();
            break;

    }
    

    return 0;
}