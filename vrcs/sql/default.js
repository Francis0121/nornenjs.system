/**
 * Created by pi on 14. 11. 23.
 */
// ~ connect sqlite3
var sql = require('./sql');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');

db.serialize(function() {
    db.run(sql.user.create);

    // ~ Database Insert
    var user = { $username : 'vrcs', $password : 'vrcs'  };
    var stmt = db.prepare(sql.user.insert);
    stmt.run(user);
    stmt.finalize();

    db.each("SELECT pn, username, password, join_date AS joinDate, update_date AS updateDate FROM user", function(err, row) {
        console.log(row.pn + ": " + row.username + ": " + row.password + ": " + row.joinDate + ":" + row.updateDate);
    });
});

module.exports.db = db;
module.exports.sql = sql;