//#######################################

var ENUMS = require('./enums');
var logger = require('./logger');
var sqlite = require('./sql/default');

var path = require('path');
var HashMap = require('hashmap').HashMap;
var Jpeg = require('jpeg').Jpeg;
var Png = require('png').Png;
var BinaryServer = require('binaryjs').BinaryServer;
var socketIo = require('socket.io');
var CudaRender = require('./render').CudaRender;
var cu = require('./load');
var cuCtx = new cu.Ctx(0, cu.Device(0));

//#######################################

var NornenjsServer = function(server, port, chunkSize){
    this.server = server;
    this.io = null;
    this.bs = null;
    
    this.port = port == undefined ? 9000 : port;
    this.chunkSize = chunkSize == undefined ? 512 : chunkSize;

    this.debug = {
        active : true,
        option : {
            cudaTime : 0,
            compressTime : 0
        },
        callback : null
    };

};

NornenjsServer.prototype.connect = function(){
    
    this.io = socketIo.listen(this.server);
    this.socketIoEvent();
    
    this.bs = BinaryServer({
        port : this.port, 
        chunkSize : this.chunkSize 
    });
    this.streamEvent();
    
};

NornenjsServer.prototype.socketIoEvent = function(){
    var $this = this;
    var socket_queue = [];
    var streamUserCount = 0;
    
    this.io.sockets.on('connection', function(socket){
        
        socket.on('join', function(){
            var clientId = socket.id;
            var message = {
                error : '',
                success : false,
                clientId : clientId
            };

            if(streamUserCount < 10){
                streamUserCount++;
                message.success = true;
            }else{
                socket_queue.push(clientId);
                message.error = 'Visitor limit';
            }

            logger.debug('connect total count[ ' + streamUserCount + ' ] , socket id : ' + clientId);
            socket.emit('message', message);
        });

        socket.on('disconnect', function () {
            streamUserCount--;
            var clientId = socket_queue.shift();
            logger.debug('disconnect total count[ ' + streamUserCount + ' ] , socket id : ' + clientId);
            if(clientId != undefined){
                socket.broadcast.to(clientId).emit('disconnected');
            }
        });

        $this.debug.callback = function(){
            if($this.debug.active){
                socket.emit('debug', $this.debug.option);
            }
        };
        
    });
    
};

NornenjsServer.prototype.streamEvent = function(){
    var $this = this;
    var volumeMap = new HashMap();
    var useMap = new HashMap();
    var maintainInfoMap = new HashMap();

    this.bs.on('connection', function(client){

        client.on('stream', function(stream, meta){

            logger.debug('Byte stream connection attempt ' + client.id);

            var cudaInterval = function () {

                var maintainInfo = maintainInfoMap.get(client.id);
                if(maintainInfo == undefined || maintainInfo == null){
                    return;
                }

                var status = maintainInfo.status;
                if(status == undefined || status == null){
                    return;
                }

                var cudaRender = maintainInfo.cudaRender;
                if(cudaRender == undefined || cudaRender == null){
                    return;
                }

                if(status.streamType == ENUMS.STREAM_TYPE.START || status.streamType == ENUMS.STREAM_TYPE.FINISH){

                    var hrStart = process.hrtime();

                    cudaRender.start();
                    var hrCuda = process.hrtime(hrStart);
                    $this.debug.option.cudaTime  = hrCuda[1]/1000000;
                    logger.debug('Make start finish frame png compress execution time (hr) : %dms', hrCuda[1]/1000000);
                    
                    var png = new Png(cudaRender.d_outputBuffer, 512, 512, 'rgba');
                    png.encode(function (png_img) {
                        try {
                            if (client._socket._socket == undefined) {
                                logger.error('Connection already refused async png :: client id', client.id);
                            } else {
                                client.send(png_img);
                            }
                        } catch (error) {
                            logger.error('Connection refused async png ', error);
                            closeCallback(client.id);
                            return;
                        }
                    });
                    cudaRender.end();

                    var hrEnd = process.hrtime(hrStart);
                    $this.debug.option.compressTime  = hrEnd[1]/1000000;
                    logger.debug('Make start finish frame png compress execution time (hr) : %dms', hrEnd[1]/1000000);
                    
                } else if(status.streamType == ENUMS.STREAM_TYPE.EVENT){

                    var hrStart = process.hrtime();

                    cudaRender.start();

                    var hrCuda = process.hrtime(hrStart);
                    $this.debug.option.cudaTime  = hrCuda[1]/1000000;
                    logger.debug('Make start finish frame jpeg compress execution time (hr) : %dms', hrCuda[1]/1000000);
                    
                    var jpeg = new Jpeg(cudaRender.d_outputBuffer, 512, 512, 'rgba');

                    try {

                        if (client._socket._socket == undefined) {
                            logger.error('Connection already refused sync jpeg :: client id', client.id);
                        } else {
                            client.send(jpeg.encodeSync());
                        }
                        
                    }catch (error){
                        logger.error('Connection refused sync jpeg', error);
                        closeCallback(client.id);
                        return;
                    }

                    cudaRender.end();

                    var hrEnd = process.hrtime(hrStart);
                    $this.debug.option.compressTime  = hrEnd[1]/1000000;
                    logger.debug('Make start finish frame jpeg compress execution time (hr) : %dms', hrEnd[1]/1000000);

                }else{
                    logger.error('Request type not defined cuda' + status.streamType);
                }

                $this.debug.callback();
            };

            var returnParameter = function(buffer){
                var parameter = {
                    streamType : buffer.readFloatLE(0),
                    volumePn : buffer.readFloatLE(4),
                    renderingType : buffer.readFloatLE(8),
                    brightness : buffer.readFloatLE(12),
                    positionZ : buffer.readFloatLE(16),
                    transferOffset : buffer.readFloatLE(20),
                    rotationX : buffer.readFloatLE(24),
                    rotationY : buffer.readFloatLE(28),
                    transferScaleX : buffer.readFloatLE(32),
                    transferScaleY : buffer.readFloatLE(36),
                    transferScaleZ : buffer.readFloatLE(40),
                    mriType : buffer.readFloatLE(44),
                    isMobile : buffer.readFloatLE(48)
                };
                logger.debug('Request parameter : ', parameter);
                return parameter;
            };

            var part = [];

            stream.on('data', function(data){
                part.push(data);
            });

            stream.on('end', function(){

                var param = returnParameter(part[0]);

                if(param.streamType == ENUMS.STREAM_TYPE.START) {

                    var initStream = function(volumePn, volume){

                        var use = useMap.get(volumePn) == undefined ? 1 : useMap.get(volumePn) + 1;
                        useMap.set(volumePn, use);

                        var cuModule = cu.moduleLoad(path.join(__dirname, '../src-cuda/volume.ptx'));
                        var cudaRender = new CudaRender(1, path.join(__dirname, '../../public/upload/')+volume.save_name,
                            volume.width, volume.height,volume.depth, cuCtx, cuModule);

                        cudaRender.init();
                        logger.debug('CudaRedner ', cudaRender);

                        var status = {
                            frame : 0,
                            volumePn : volumePn,
                            streamType : param.streamType,
                            cudaInterval : null
                        };

                        var maintainInfo = {
                            status : status,
                            cudaRender : cudaRender
                        };

                        maintainInfoMap.set(client.id, maintainInfo);

                        cudaInterval();

                        logger.debug('Connect byte stream ' + client.id + ' volume use ' + use);
                    };


                    var volumePn = param.volumePn;
                    var volumeData = volumeMap.get(volumePn);

                    if (volumeData == undefined) {

                        sqlite.db.get(sqlite.sql.volume.selectVolumeOne, { $pn: volumePn }, function(err, volume){
                            logger.debug('Volume object', volume);

                            if(volume == undefined) {
                                logger.error('Fail select volume data');
                                return;
                            }else {
                                volumeMap.set(volume.pn, volume);
                                initStream(volume.pn, volume);
                            }
                        });
                    } else {
                        initStream(volumePn, volumeData);
                    }

                }else if(param.streamType == ENUMS.STREAM_TYPE.FINISH){


                    var maintainInfo = maintainInfoMap.get(client.id);
                    if(maintainInfo == undefined || maintainInfo == null){
                        return;
                    }

                    var status = maintainInfo.status;
                    if(status == undefined || status == null){
                        return;
                    }

                    if(status.cudaInterval != null ){
                        clearInterval(status.cudaInterval);
                        status.cudaInterval = null;
                    }

                    status.streamType = param.streamType;

                    maintainInfo.status = status;
                    maintainInfoMap.set(client.id, maintainInfo);

                    if(!param.isMobile){
                        cudaInterval();
                    }

                    logger.debug('Cuda Interval finish ' + client.id);

                }else if(param.streamType == ENUMS.STREAM_TYPE.EVENT){

                    var maintainInfo = maintainInfoMap.get(client.id);
                    if(maintainInfo == undefined || maintainInfo == null){
                        return;
                    }

                    var status = maintainInfo.status;
                    if(status == undefined || status == null){
                        return;
                    }

                    status.streamType = param.streamType;

                    var cudaRender = maintainInfo.cudaRender;
                    if(cudaRender == undefined || cudaRender == null){
                        return;
                    }

                    cudaRender.type = param.renderingType;
                    cudaRender.positionZ = param.positionZ;
                    cudaRender.brightness = param.brightness;
                    cudaRender.transferOffset = param.transferOffset;
                    cudaRender.transferScaleX = param.transferScaleX;
                    cudaRender.transferScaleY = param.transferScaleY;
                    cudaRender.transferScaleZ = param.transferScaleZ;
                    cudaRender.rotationX = param.rotationX;
                    cudaRender.rotationY = param.rotationY;
                    cudaRender.mriType = param.mriType;

                    if(status.cudaInterval == null){
                        if(param.isMobile){
                            status.cudaInterval = setInterval(cudaInterval, 1000/20);
                        } else {
                            status.cudaInterval = setInterval(cudaInterval, 1000/60);
                        }

                        maintainInfo.status = status;
                        maintainInfoMap.set(client.id, maintainInfo);
                    }
                }

            });

            stream.on('error', function(error){

                logger.error('Stream occur errorvar maintainInfo = maintainInfoMap.get(client.id)', error);

            });
        });

        client.on('close', function(stream, meta){
            closeCallback(client.id);
        });

        var closeCallback = function(clientId){

            var maintainInfo = maintainInfoMap.get(client.id);
            if(maintainInfo == undefined || maintainInfo == null){
                return;
            }

            var status = maintainInfo.status;

            if(status != undefined) {
                clearInterval(status.cudaInterval);

                var use = useMap.get(status.volumePn) - 1;
                logger.debug('Remove Interval and volume data ' + client.id + ' volume use ' + use);

                if(use == 0){
                    volumeMap.remove(status.volumePn);
                    useMap.remove(status.volumePn);
                }else{
                    useMap.set(status.volumePn, use);
                }
            }

            maintainInfoMap.remove(client.id);
            logger.debug('Destroy and free cuda memory and buffer '+ client.id);
        };

    });

    this.bs.on('error', function(error){

        logger.error('Binaryjs Server occuer error ', error);

    });
    
};

module.exports.NornenjsServer = NornenjsServer;