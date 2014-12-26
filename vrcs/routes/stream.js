var express = require('express');
var router = express.Router();
var sqlite = require('../sql/default');
var HashMap = require('hashmap').HashMap;

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
/* GET home page. */
router.get('/volumepn/:pn', function(req, res) {

    sqlite.db.get(sqlite.sql.volume.selectVolumeOne, { $pn: req.params.pn }, function(err, volume){
        console.log(volume);
        if(volume == undefined) {
            console.log('Fail select volume');
            res.render('stream/stream', { error : 'Not exist volume data', accessInfo : undefined } );
        }else {
            volumeMap.set(volume.pn, volume);

            var accessInfo = {
                volumePn : volume.pn,
                userPn : req.session.user.pn
            };

            res.render('stream/stream', { error : '', accessInfo : accessInfo });
        }
    });

});

module.exports = router;
module.exports.volumeMap = volumeMap;
