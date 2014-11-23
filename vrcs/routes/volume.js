var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res) {
    res.render('volume/list', { });
});

/* GET users listing. */
router.get('/upload', function(req, res) {
    res.render('volume/upload', { });
});

module.exports = router;
