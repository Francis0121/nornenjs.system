var sqlite = require('../sql/default');
var express = require('express');
var router = express.Router();

// ~ signin get
router.get('/', function(req, res) {
    var message = {
        error : '',
        success : ''
    };
    if(req.session.user == undefined){
        res.render('signin/signin', { message : message, user : req.session.user });
    }else{
        res.redirect('../');
    }
});

// ~ signin post
router.post('/', function(req, res){
    var data = req.body;
    var message = {
        error : '',
        success : ''
    };

    var query = { $username : data.username };
    sqlite.db.get(sqlite.sql.user.selectUserOne, query, function(err, user){

        if(user == undefined){
            message.error = 'Not exist user';
            res.render('signin/signin', { message : message, user : undefined });
        }else if(data.password != user.password){
            message.error = 'Wrong Password';
            res.render('signin/signin', { message : message, user : undefined });
        }else{
            console.log('Success signin');
            user.password = '';
            req.session.user = user;
            message.success = 'Success sign in';
            res.redirect('../');
        }
    });
});

// ~ logout
router.get('/logout', function(req, res){
    req.session.user = undefined;
    res.redirect('../');
});

router.get('/join', function(req, res) {
    var message = {
        error : '',
        success : ''
    };
    res.render('signin/join', { message : message, delete_message : undefined, postUser : undefined, user : req.session.user });
});

router.post('/join', function(req, res) {
    var data  = req.body;
    var method = data._method;
    var message = {
        error : '',
        success : ''
    };

    if(method == 'post'){
        // ~ validation
        var username = data.username;
        if(username == ''){
            console.log('Validation join');
            message.error = 'Please enter username';
            res.render('signin/join', { message : message, postUser : { username : '' }, user : undefined } );
            return;
        }

        if(data.password == ''){
            console.log('Validation join');
            message.error = 'Please enter password';
            res.render('signin/join', { message : message, postUser : { username : username },  user : undefined } );
            return;
        }

        // ~ query
        var query = {
            $username : data.username,
            $password : data.password  };

        if(data.password != data.confirmpw){
            console.log('Fail join');
            message.error = 'Not equal each password';
            res.render('signin/join', { message : message, postUser : {username : username }, user : undefined } );
            return;
        }

        sqlite.db.get(sqlite.sql.user.selectUserOne, { $username : data.username}, function(err, user){
            // ~ Exist user
            if(user != undefined) {
                console.log('Fail join');
                message.error = 'Exist user';
                res.render('signin/join', { message : message, postUser : {username : username }, user : undefined } );
            }else{
                sqlite.db.run(sqlite.sql.user.insert, query, function (err) {
                    console.log('Success join');
                    if (err == null) {
                        req.session.user = { username : data.username };
                        res.redirect('../../');
                    }
                });
            }
        });

    }else if(method == 'update'){
        // ~ validation
        if(data.password == ''){
            console.log('Validation join');
            message.error = 'Please enter password';
            res.render('signin/join', { message : message, delete_message : undefined,  user : req.session.user } );
            return;
        }

        // ~ query
        var query = {
            $username : req.session.user.username,
            $password : data.password  };

        if(data.password != data.confirmpw){
            console.log('Fail join');
            message.error = 'Not equal each password';
            res.render('signin/join', { message : message, delete_message : undefined,  user : req.session.user } );
            return;
        }

        sqlite.db.get(sqlite.sql.user.selectUserOne, { $username : query.$username }, function(err, user){
            // ~ Exist user
            if(user == undefined) {
                console.log('Fail join');
                message.error = 'Not exist user'
                res.render('signin/join', { message : message, delete_message : undefined,  user : req.session.user } );
            }else{

                if(user.password != data.originalpw){
                    console.log('Fail join');
                    message.error = 'Wrong password';
                    res.render('signin/join', { message : message, delete_message : undefined,  user : req.session.user } );
                }else{
                    sqlite.db.run(sqlite.sql.user.updatepw, query, function(err){
                        console.log('Success update');
                        if (err == null) {
                            req.session.user = { username : req.session.user.username };
                            message.success = 'Change password success';
                            res.render('signin/join', { message : message, delete_message : undefined,  user : req.session.user } );
                        }
                    });
                }
            }
        });

    } else if( method == 'delete' ) {

        if(data.password == ''){
            console.log('Validation join');
            message.error = 'Please enter password';
            res.render('signin/join', { message : undefined, delete_message : message, user : req.session.user } );
            return;
        }

        // ~ query
        var query = {
            $username : req.session.user.username };

        sqlite.db.get(sqlite.sql.user.selectUserOne, query, function(err, user){
            // ~ Exist user
            if(user == undefined) {
                console.log('Fail join');
                message.error = 'Not exist user'
                res.render('signin/join', { message : undefined, delete_message : message, user : req.session.user } );
            }else{

                if(user.password != data.password){
                    console.log('Fail join');
                    message.error = 'Wrong password';
                    res.render('signin/join', { message : undefined, delete_message : message, user : req.session.user } );
                }else{

                    sqlite.db.run(sqlite.sql.user.delete, query, function(err){
                        if (err == null) {
                            console.log('delete success');
                            req.session.user = undefined;
                            res.redirect('../../');
                        }
                    });

                }
            }
        });

    } else {
        console.log('Fail join');
        message.error = 'Something wrong';
        res.render('signin/join', { message : message, user : undefined } );
    }

});

module.exports = router;