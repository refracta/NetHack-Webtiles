const fs = require('fs');
const path = require('path');
const shell = require('child_process').execSync;

let games = './games/';
let gameList = fs.readdirSync(games).map(f=>games + f).filter(f=>fs.lstatSync(f).isDirectory()).map(d=>d+'/games/lib/nethackdir/');
let targetNames = ['save', 'xlogfile', 'record'];
!fs.existsSync('./backups') ? fs.mkdirSync('./backups') : void 0;
let backups = `./backups/${new Date().toISOString()}/`;
fs.mkdirSync(backups);

gameList.forEach(g=>{
        let bon = fs.readdirSync(g).filter(f=>f.match(/^bon.*gz$/)).map(f=>g+f);
        let others = targetNames.map(n=>g+n);
        [...bon, ...others].forEach(f=>{
                shell(`cp -R ${f} ${backups}`);
        });
});
