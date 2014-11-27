var express = require('express');
var router = express.Router();
var sqlite = require('../sql/default');

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
})

/* GET home page. */
router.get('/volumepn/:pn', function(req, res) {

    sqlite.db.get(sqlite.sql.volume.selectVolumeOne, { $pn: req.params.pn }, function(err, volume){
        console.log(volume);
        if(volume == undefined) {
            console.log('Fail select volume');
            res.render('stream/stream', { error : 'Not exist volume data' } );
        }else {

            res.render('stream/stream', { error : '' });
        }
    });

});

module.exports = router;
