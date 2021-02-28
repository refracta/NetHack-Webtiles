const low = require('lowdb');
const crypt = require('crypt3/sync');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);

class LocalDB {
    constructor() {
        this.db = db;
    }

    init() {
        db.defaults({
            users: {}
        }).write();
    }
    getUser(username) {
        return db.get('users').value()[username.toLowerCase()];
    }

    isRegistered(username) {
        return this.getUser(username) ? true : false;
    }

    isValidLogin(username, password) {
        let user = this.getUser(username);
        return user && crypt(password, user.password) === user.password;

    }

    register(data) {
        db.get('users').assign({
            [data.username.toLowerCase()]: {
                username: data.username,
                password: crypt(data.password, data.password),
                email: data.email
            }
        }).write();
    }
}

exports = module.exports = new LocalDB();
