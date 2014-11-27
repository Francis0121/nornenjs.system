var express = require('express');
var router = express.Router();

// ~ Confirm sign in
router.use(function(req, res, next) {
    console.log('prepare function')
    if(req.session.user == undefined){
        res.redirect('../');
    }else{
        next();
    }
});

/* GET users listing. */
router.get('/', function(req, res) {
    res.render('volume/list', { });
});

/* GET users listing. */
router.get('/upload', function(req, res) {
    res.render('volume/upload', { });
});

/* GET users listing. */
router.get('/stream', function(req, res) {
    res.render('volume/stream', { });
});


module.exports = router;
