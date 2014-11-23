var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('signin/signin', { });
});

router.get('/join', function(req, res) {
    res.render('signin/join', { });
});

module.exports = router;
