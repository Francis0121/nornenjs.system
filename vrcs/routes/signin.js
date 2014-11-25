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
        if(data.password  == user.password){
            console.log('Success signin');
            user.password = '';
            req.session.user = user;
            res.redirect('../');
        }else{
            console.log('Fail signin');
            res.render('signin/signin', { error : 'Wrong password'});
        }
    });
});

router.use('/join', function(req, res) {
    res.render('signin/join', { });
});



module.exports = router;
