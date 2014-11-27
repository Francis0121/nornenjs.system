var sqlite = require('../sql/default');
var express = require('express');
var router = express.Router();

// ~ signin get
router.get('/', function(req, res) {
    res.render('signin/signin', { error : '', user : req.session.user });
});

// ~ signin post
router.post('/', function(req, res){
    var data = req.body;

    var query = { $username : data.username };
    sqlite.db.get(sqlite.sql.user.selectUserOne, query, function(err, user){

        if(user == undefined){
            res.render('signin/signin', { error : 'Not exist user', user : undefined });
        }else if(data.password != user.password){
            res.render('signin/signin', { error : 'Wrong password', user : undefined });
        }else{
            console.log('Success signin');
            user.password = '';
            req.session.user = user;
            res.redirect('../');
        }
    });
});

// ~ logout
router.get('/logout', function(req, res){
    req.session.user = undefined;
    res.redirect('./');
});

router.get('/join', function(req, res) {
    res.render('signin/join', { error : '' });
});

router.post('/join', function(req, res) {
    var data  = req.body;
    var query = {
        $username : data.username,
        $password : data.password  };

    if(data.password != data.confirmpw){
        console.log('Fail join');
        res.render('signin/join', { error : 'Not equal each password'} );
        return;
    }

    sqlite.db.get(sqlite.sql.user.selectUserOne, { $username : data.username}, function(err, user){
        // ~ Exist user
        if(user != undefined) {
            console.log('Fail join');
            res.render('signin/join', { error : 'Exist User'} );
        }else{
            sqlite.db.run(sqlite.sql.user.insert, query, function (err) {
                console.log('Success join');
                if (err == null) {
                    query.password = '';
                    req.session.user = query;
                    res.redirect('../../');
                }
            });
        }

    });

});

module.exports = router;