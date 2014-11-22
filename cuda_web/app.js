var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

var addon = require('/home/pi/git/vrcs/web/node/build/Release/addon');

console.log(addon.exports('name'));
console.log(addon.hello());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;


var Buffer = require('buffer').Buffer;
var cu = require('./cuda');

//cuDriverGetVersion
//cuDeviceGetCount
console.log("Node-cuda exports:", cu);

for (var i = 0; i < cu.deviceCount; i++) {
    //cuDeviceGet
    var cuDevice = new cu.Device(i);

    //cuDeviceComputeCapability
    //cuDeviceGetName
    //cuDeviceTotalMem
    console.log("Device " + i + ":", cuDevice);
}

//cuCtxCreate
var cuCtx = new cu.Ctx(0, cu.Device(0));

//cuCtxGetApiVersion
console.log("Created context:", cuCtx);

//cuMemAllocPitch
var cuMem = cu.memAllocPitch(100, 100, 8);
console.log("Allocated 100x100 array of doubles:", cuMem);

//cuMemFree
var error = cuMem.free();
console.log("Mem Free with error code: " + error);

//cuMemAlloc
var cuMem = cu.memAlloc(100);
console.log("Allocated 100 bytes:", cuMem);

var buf = new Buffer(100);
for (var i = 0; i < buf.length; i++) {
    buf[i] = (i + 1) % 256;
}
console.log("Created buffer of 100 bytes:", buf);

// cuMemcpyHtoD
var error = cuMem.copyHtoD(buf);
console.log("Copied buffer to device:", error);

//cuModuleLoad
var cuModule = cu.moduleLoad("/home/pi/git/vrcs/web/cuda_web/test.cubin");
console.log("Loaded module:", cuModule);

//cuModuleGetFunction
var cuFunction = cuModule.getFunction("helloWorld");
console.log("Got function:", cuFunction);

//cuLaunchKernel
var error = cu.launch(cuFunction, [3, 1, 1], [2, 2, 2],
    [{
        type: "DevicePtr",
        value: cuMem.devicePtr
    }]);
console.log("Launched kernel:", error);

// cuMemcpyDtoH
var error = cuMem.copyDtoH(buf, true);
console.log("Copied buffer to host:", error);

//cuCtxSynchronize
var error = cuCtx.synchronize(function(error) {
    console.log("Context synchronize with error code: " + error);

    //cuMemFree
    var error = cuMem.free();
    console.log("Mem Free with error code: " + error);

    //cuCtxDestroy
    error = cuCtx.destroy();
    console.log("Context destroyed with error code: " + error);
});
