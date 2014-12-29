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
        res.render('volume/list', { volumes : volumes, user : req.session.user });
    });
});

/* GET users listing. */
router.get('/upload', function(req, res) {
    res.render('volume/upload', { error : '', user : req.session.user });
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
        fstream.on('close', function () {
            console.log('Upload Finished of ' + savename);
        });

        req.body['filename'] = filename;
        req.body['savename'] = savename;
    });

    req.busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
        req.body[fieldname] = val;
        console.log(fieldname + '_' +val);
    });

    req.busboy.on('finish', function(){
        var query = {
            $userpn : req.session.user.pn,
            $title : req.body.title,
            $saveName : req.body.savename,
            $fileName : req.body.filename
        };
        console.log(query);
        sqlite.db.run(sqlite.sql.volume.insert, query, function (err) {
            console.log('Success file');
            if (err == null) {
                res.redirect('./');
            }else{
                console.log(err);
                res.render('volume/upload', { error : 'File upload error', user : req.session.user });
            }
        });
    });

});

module.exports = router;
