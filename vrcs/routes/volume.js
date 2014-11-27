var express = require('express');
var router = express.Router();
var fs = require('fs-extra');//File System - for file manipulation
var path = require('path');
var sqlite = require('../sql/default');
require('date-utils'); // Date util

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
    var query = {
        $userpn : req.session.user.pn
    };

    sqlite.db.all(sqlite.sql.volume.selectVolumeList, query, function(err, volumes){
        console.log(volumes);
        res.render('volume/list', { volumes : volumes });
    });
});

/* GET users listing. */
router.get('/upload', function(req, res) {
    res.render('volume/upload', { error : '' });
});

router.post('/upload', function(req, res){

    var fstream;
    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
        console.log('Uploading: ' + filename);
        //Path where image will be uploaded
        var date = new Date();
        var savename = '['+date.toDBString('YY-MM-DD HH24:MI:SS') +']_' + filename;
        fstream = fs.createWriteStream(path.join(__dirname, '../public/upload/') + savename);
        file.pipe(fstream);
        fstream.on('close', function () {
            console.log('Upload Finished of ' + savename);
            var query = {
                $userpn : req.session.user.pn,
                $title : 'Volume Data',
                $saveName : savename,
                $fileName : filename
            };

            sqlite.db.run(sqlite.sql.volume.insert, query, function (err) {
                console.log('Success join');
                if (err == null) {
                    res.redirect('./');
                }else{
                    res.render('volume/upload', { error : 'File upload error' });
                }
            });

        });
    });

});

/* GET users listing. */
router.get('/stream', function(req, res) {
    res.render('volume/stream', { });
});


module.exports = router;
