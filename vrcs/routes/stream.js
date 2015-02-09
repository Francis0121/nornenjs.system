var express = require('express');
var router = express.Router();
var sqlite = require('../nornenjs/lib/sql/default');
var HashMap = require('hashmap').HashMap;
var ip = require('ip');

// Not sign in user don`t access this router
router.use(function(req, res, next) {
    if(req.session.user == undefined){
        res.redirect('../');
    }else{
        next();
    }
});

router.param('pn', function (req, res, next, pn) {
    next();
});

var volumeMap = new HashMap();

router.get('/volumepn/:pn', function(req, res) {
    sqlite.db.get(sqlite.sql.volume.selectVolumeOne, { $pn: req.params.pn }, function(err, volume){
        if(volume == undefined) {
            console.log('Fail select volume');
            res.redirect('/volume');
        }else {
            volumeMap.set(volume.pn, volume);

            var model = {
                error : '',
                accessInfo : {
                    volumePn : volume.pn,
                    userPn : req.session.user.pn
                },
                user : req.session.user,
                volume : volume,
                host : ip.address()
            };

            res.render('stream/stream', model);
        }
    });

});

module.exports = router;
module.exports.volumeMap = volumeMap;
