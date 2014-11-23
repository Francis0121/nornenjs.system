/**
 * Created by pi on 14. 11. 23.
 */

// ~ connect sqlite3
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');

db.serialize(function() {
    db.run("CREATE TABLE user (pn INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, password TEXT NOT NULL, join_date TEXT)");

    // ~ Database Insert
    var stmt = db.prepare("INSERT INTO user (username, password, join_date ) VALUES ( $username, $password, datetime('now') )");
    stmt.run({
        $username : 'vrcs',
        $password : 'vrcs'  });
    stmt.finalize();

    db.each("SELECT pn, username, password, join_date AS `date` FROM user", function(err, row) {
        console.log(row.pn + ": " + row.username + ": " + row.password + ": " + row.date );
    });
});

db.close();
