NetHack-Webtiles
======================
[![Build Status](https://github.com/refracta/NetHack-Webtiles/workflows/Validation/badge.svg)](https://github.com/refracta/NetHack-Webtiles/actions/)

> Webtiles Server for NetHack

This is NetHack's webtiles server based on NetHack tty port.

It's a HTTP server that allows users to play NetHack remotely through a web browser.

Supports both desktop and mobile play.

Desktop             |  Mobile
:-------------------------:|:-------------------------:
<img height="350" src="https://user-images.githubusercontent.com/58779799/111501484-5ff31400-8788-11eb-9395-53532bf024e5.gif"> |  <img height="350" src="https://user-images.githubusercontent.com/58779799/111501466-5cf82380-8788-11eb-93e1-bd66f3706637.gif">

## Project Structure
![](https://user-images.githubusercontent.com/58779799/103433510-68ca5400-4c35-11eb-8836-9505bd77d15f.png)

`archive`:dumplog, ttyrec, and rcfile

`dev`:Scripts used for project development and build

`games`:The built game binary and save files

`sources`:Original NetHack source path

`web`:All web related files

`webtiles`:NetHack webtiles port code

## Prerequisites
- Linux environment
- Node.js 10.x, `packages.json` dependencies
- Everything you need to build NetHack.
- Other additional dependencies (`dev/install-jsonc.sh`, `dev/install-node-dependency.sh`)

## Build Guide (Debian)
```bash
git clone https://github.com/refracta/NetHack-Webtiles -b develop
cd NetHack-Webtiles
# It automatically configures the environment. (prerequisites, other require files)
sh dev/env-debian.sh
PORT=8080 npm start
```
Tested on WSL Ubuntu 18.04, 20.04.

## Deploy Guide (Docker)
```bash
git clone https://github.com/refracta/NetHack-Webtiles -b develop
cd NetHack-Webtiles

sh dev/build-docker.sh
# <↓ in the Docker tty ↓> 
sh dev/install-node-dependency.sh
sh dev/init-nginx.sh
service nginx start

cd sources/nh366/
sh build.sh

cd ../../
npm start
```

## Build Webtiles Port (Only NetHack Binary)
```bash
cd games/sources/nh366
sh build.sh
```
You can speed up the build by modifying the j flag in build.sh.

## How to Contribute
1. Clone repository from develop branch and create a new branch
```bash
git checkout https://github.com/refracta/NetHack-Webtiles -b name_for_new_branch
```
2. Make changes and test
3. Submit Pull Request with comprehensive description of changes

You can talk and discuss development on the #dev channel of the [NetHack Live Discord server](https://discord.com/invite/mNcPSDendT).

## Project Goal
- [x] Implementation of registration and login
- [X] Basic web play implementation
- [X] Implementation of the feature to watch the game
- [X] Game room chat, Public chat feature implementation
- [x] Add RC modification on the web
- [x] Implement all game desktop interfaces
- [x] Mobile web support
- [ ] Responsive web part refactoring
- [ ] Front-end code migration (React)
- [ ] Integration with [dgamelaunch](https://github.com/paxed/dgamelaunch)
- [ ] Implement the send mail feature([Mail daemon](https://nethackwiki.com/wiki/Mail_daemon)) to be available on the web
- [ ] Add support for other porting versions such as SLASH'EM-Extended, UnNetHack, etc.
- [ ] Add Add-on module support
- [ ] Add sound effect support (WebRC or Add-on)
- [ ] Implement NetHack multilingual translation Add-on