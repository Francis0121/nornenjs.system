/**
 * Created by pi on 14. 11. 23.
 */
var logger = require('../logger');

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
        logger.debug(uData);
        var volume = [{
            $userpn : uData.pn, $title : 'Skull', $saveName : 'head.den', $fileName : 'head.den', $width : 256, $height : 256, $depth : 225
        },{
            $userpn : uData.pn, $title : 'Abdomen', $saveName : 'abdomen.den', $fileName : 'abdomen.den', $width : 512, $height : 512, $depth : 300
        },{
            $userpn : uData.pn, $title : 'Aneurism', $saveName : 'aneurism.raw', $fileName : 'aneurism.raw', $width : 256, $height : 256, $depth : 256
        },{
            $userpn : uData.pn, $title : 'Bonsai', $saveName : 'bonsai.raw', $fileName : 'bonsai.raw', $width : 256, $height : 256, $depth : 256
        },{
            $userpn : uData.pn, $title : 'Foot', $saveName : 'foot.raw', $fileName : 'foot.raw', $width : 256, $height : 256, $depth : 256
        },{
            $userpn : uData.pn, $title : 'Skull', $saveName : 'skull.raw', $fileName : 'skull.raw', $width : 256, $height : 256, $depth : 256
        },{
            $userpn : uData.pn, $title : 'Engine', $saveName : 'engine.raw', $fileName : 'engine.raw', $width : 256, $height : 256, $depth : 128
        }];
        
        for(var i=0; i<volume.length; i++){
            stmt = db.prepare(sql.volume.insert);
            stmt.run(volume[i]);
        }
        
        stmt.finalize();
    });

});

module.exports.db = db;
module.exports.sql = sql;