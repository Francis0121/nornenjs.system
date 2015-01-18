/**
 * Created by francis on 15. 1. 18.
 */
var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            level : 'emerg',
            colorize : true
        })
    ]
});

logger.setLevels(winston.config.syslog.levels);

module.exports = logger;