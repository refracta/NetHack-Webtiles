const crypt = require('crypt3/sync');
const fs = require('fs');
let db = JSON.parse(fs.readFileSync('../db.json'));
Object.keys(db.users).map(k=>db.users[k]).forEach(e=>{
   e.password = crypt(e.password, e.password);
});
fs.writeFileSync('../db.json',JSON.stringify(db),'utf8');
