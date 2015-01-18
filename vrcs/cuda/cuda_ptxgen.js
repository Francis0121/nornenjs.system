/**
 * Created by russa on 15. 1. 14.
 */
var fs  = require('fs');
var exec = require('child_process').exec;


function PtxGen(uniqueValue) {
    this.uniqueValue = uniqueValue;

}
    PtxGen.function = {

        ptxgen : function(){
            var fileName = 'vrcs.cu';
            fs.exists(fileName, function (exists){

                if (exists){
                    fs.stat(fileName, function (error, stats) {
                        fs.open(fileName, "r", function (error, fd) {

                            var buffer = new Buffer(stats.size);
                            fs.read(fd, buffer, 0, buffer.length, null, function (error, bytesRead, buffer) {

                                var str = buffer.toString("utf8", 0, buffer.length);
                                var pre = /{primary}/gi;
                                var newstr = str.replace(pre, uniqueValue);

                                var newcuFile = "vrcs" + uniqueValue + ".cu";

                                fs.writeFile(newcuFile,newstr,'utf8',function(error){
                                    if(error)
                                        throw errow;

                                    child = exec("nvcc -ptx "+newcuFile, function (error, stdout, stderr) {
                                        if (error !== null) {
                                            console.log('exec error: ' + error);
                                        }
                                    });
                                });

                                fs.close(fd);

                            });
                        });
                    });
                }
            });
        }
    };

module.exports.ptxgen = ptxgen;