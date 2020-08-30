const low = require('lowdb');
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
        return db.get('users').value()[username];
    }

    isRegistered(username) {
        return this.getUser(username) ? true : false;
    }

    isValidLogin(username, password) {
        let user = this.getUser(username);
        return user && user.password === password;
    }

    register(data) {
        db.get('users').assign({
            [data.username]: {
                username: data.username,
                password: data.password,
                email: data.email
            }
        }).write();
    }
}

exports = module.exports = new LocalDB();
