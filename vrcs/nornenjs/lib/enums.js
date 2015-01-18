/**
 * Created by francis on 15. 1. 18.
 */

var ENUMS = {
    
    RENDERING_TYPE : {
        VOLUME : 1,
        MIP : 2,
        MRI : 3
    },
    
    MRI_TYPE : { 
        X : 1, 
        Y : 2, 
        Z : 3 
    },
    
    STREAM_TYPE : {
        START : 1,
        ADAPTIVE : 2,
        EVENT : 3
    },
    
    INTERVAL_TIME : [ 100, 80, 90, 70, 60, 50, 40, 30, 20, 10]
    
};

module.exports = ENUMS;

