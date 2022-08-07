FROM ubuntu:bionic

RUN apt-get update && \
	apt-get install -y openssh-server && \
	mkdir /var/run/sshd && \
	echo 'root:root' |chpasswd && \
	sed -ri 's/^#?PermitRootLogin\s+.*/PermitRootLogin yes/' /etc/ssh/sshd_config && \
	sed -ri 's/UsePAM yes/#UsePAM yes/g' /etc/ssh/sshd_config && \
	mkdir /root/.ssh && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
EXPOSE 22

WORKDIR /usr/src
RUN apt-get update && \
	apt-get install -y sudo git cmake && \
	git clone https://github.com/refracta/NetHack-Webtiles -b develop
WORKDIR /usr/src/NetHack-Webtiles
RUN chmod -R 777 dev && dev/env-debian.sh
RUN apt-get install -y nginx && dev/init-nginx.sh
RUN dev/setting-debug1.sh
EXPOSE 80
EXPOSE 81
EXPOSE 82

ENTRYPOINT ["/bin/sh", "-c", "service nginx restart & npm start & /usr/sbin/sshd -D"]
