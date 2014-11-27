/**
 * Created by pi on 14. 11. 23.
 */
// ~ connect sqlite3
var sql = require('./sql');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');

db.serialize(function() {
    // ~ Create table
    db.run(sql.user.create);
    db.run(sql.volume.create);

    // ~ Insert sample data
    var user = {
        $username : 'vrcs',
        $password : 'vrcs'  };
    var stmt = db.prepare(sql.user.insert);
    stmt.run(user);
    stmt.finalize();

    db.get(sql.user.select, function(err, uData) {
        console.log(uData);
        var volume = {
            $userpn : uData.pn,
            $title : 'Volume Rendering',
            $saveName : '[2014-11-27 20:00:00]_head.dan',
            $fileName : 'head.dan'
        };

        stmt = db.prepare(sql.volume.insert);
        stmt.run(volume);
        stmt.finalize();

        db.each(sql.volume.selectVolumeList, { $userpn : uData.pn }, function(err, vData){
            console.log(vData)
        });
    });

});

module.exports.db = db;
module.exports.sql = sql;