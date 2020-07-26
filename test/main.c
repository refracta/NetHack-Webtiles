#include <sys/types.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>

#define DEFAULT_SERVER_PATH "/tmp/nethack-webtiles-server"
#define DEFAULT_CLIENT_PATH "/tmp/nethack-webtiles-client"
#define CLIENT_ENDPOINT_PATH "default"
#define DEFAULT_BUFFER_SIZE 100

typedef enum Boolean {
    false, true
};

char * SERVER_PATH(){
    char pidArray[BUFSIZ];
    sprintf(pidArray, "%d", getpid());
    int pidLength = strlen(pidArray);
    int dspLength = strlen(DEFAULT_SERVER_PATH);
    char *serverPath = (char *) malloc(pidLength + dspLength + 1 + 1) ;
    strcat(serverPath, DEFAULT_SERVER_PATH);
    strcat(serverPath, "-");
    strcat(serverPath, pidArray);
    return serverPath;
}

char * CLIENT_PATH(){
    int dcpLength = strlen(DEFAULT_CLIENT_PATH);
    int cepLength = strlen(CLIENT_ENDPOINT_PATH);
    char *clientPath = (char *) malloc(dcpLength + cepLength + 1 + 1) ;
    strcat(clientPath, DEFAULT_CLIENT_PATH);
    strcat(clientPath, "-");
    strcat(clientPath, CLIENT_ENDPOINT_PATH);
    return clientPath;
}

int main()
{
    int sockfd;
    int receiveClientLength;
    struct sockaddr_un receiveClientAddress, serverAddress;

    sockfd = socket(AF_UNIX, SOCK_DGRAM, 0);
    if (sockfd < 0)
    {
        perror("SocketError: ");
        exit(0);
    }
    unlink(SERVER_PATH());
    bzero(&serverAddress, sizeof(serverAddress));
    serverAddress.sun_family = AF_UNIX;
    strcpy(serverAddress.sun_path, SERVER_PATH());
    if (bind(sockfd, (struct sockaddr *)&serverAddress, sizeof(serverAddress)) < 0)
    {
        perror("BindError: ");
        exit(0);
    }
    receiveClientLength  = sizeof(receiveClientAddress);



    int clientLength;
    struct sockaddr_un clientAddress;
    bzero(&clientAddress, sizeof(clientAddress));
    clientAddress.sun_family = AF_UNIX;
    strcpy(clientAddress.sun_path, CLIENT_PATH());
    clientLength = sizeof(clientAddress);
    //char sendBuffer[DEFAULT_BUFFER_SIZE];

    char initSocketMsg[BUFSIZ];
    sprintf(initSocketMsg, "{\"msg\":\"init_socket\", \"pid\":%d}", getpid());
    printf("%s\n", initSocketMsg);
    sendto(sockfd, (void *)&initSocketMsg, sizeof(initSocketMsg), 0, (struct sockaddr *)&clientAddress, clientLength);
    // setsockopt 등으로 타임아웃시 넷핵 종료 등
    while(true)
    {
        char receiveBuffer[DEFAULT_BUFFER_SIZE];
        recvfrom(sockfd, (void *)&receiveBuffer, sizeof(receiveBuffer), 0, (struct sockaddr *)&receiveClientAddress, &receiveClientLength);
        fprintf(stderr, "%s", receiveBuffer);
        // C-Lion 콘솔에서 이 부분 printf로 출력시 확인 불가
    }

    close(sockfd);
    exit(0);
}
