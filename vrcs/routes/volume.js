var express = require('express');
var router = express.Router();
var fs = require('fs-extra');//File System - for file manipulation
var path = require('path');

// ~ Confirm sign in
router.use(function(req, res, next) {
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

router.post('/upload', function(req, res){

    var fstream;
    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
        console.log('Uploading: ' + filename);

        //Path where image will be uploaded
        fstream = fs.createWriteStream(path.join(__dirname, '../public/upload/') + filename);
        file.pipe(fstream);
        fstream.on('close', function () {
            console.log('Upload Finished of ' + filename);
            res.redirect('../');
        });
    });

});

/* GET users listing. */
router.get('/stream', function(req, res) {
    res.render('volume/stream', { });
});


module.exports = router;
