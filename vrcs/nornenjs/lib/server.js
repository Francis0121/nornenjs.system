//#######################################

var ENUMS = require('./enums');
var logger = require('./logger');
var sqlite = require('./sql/default');

var path = require('path');
var exec = require('child_process').exec;
var HashMap = require('hashmap').HashMap;

var Jpeg = require('jpeg').Jpeg;
var Png = require('png').Png;
var BinaryServer = require('binaryjs').BinaryServer;
var bs = BinaryServer({port : 9000, chunkSize : 512});

//#######################################

var CudaRender = require('./render').CudaRender;
var cu = require('./load');
var cuCtx = new cu.Ctx(0, cu.Device(0));

//#######################################

var volumeMap = new HashMap();
var useMap = new HashMap();
var maintainInfoMap = new HashMap();

bs.on('connection', function(client){

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

            if(status.streamType == ENUMS.STREAM_TYPE.START){

                var hrstart = process.hrtime();

                cudaRender.start();

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

                hrend = process.hrtime(hrstart);
                logger.debug('Make frame execution time (hr) : %ds %dms', hrend[0], hrend[1]/1000000);
            } else if(status.streamType == ENUMS.STREAM_TYPE.FINISH){

                var hrstart = process.hrtime();

                cudaRender.start();
                
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

                hrend = process.hrtime(hrstart);
                logger.debug('Make frame adaptive time (hr) : %ds %dms', hrend[0], hrend[1]/1000000);

            } else if(status.streamType == ENUMS.STREAM_TYPE.EVENT){

                var hrstart = process.hrtime();
                cudaRender.start();
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
                hrend = process.hrtime(hrstart);

                logger.debug('Make frame and jpeg compress execution time (hr) : %ds %dms', hrend[0], hrend[1]/1000000);
            }else{
                logger.error('Request type not defined cuda' + status.streamType);
            }
        };

        /**
         * Client에서 요청받은 Byte Data를 버퍼로 변경해주는 함수
         */
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

                maintainInfo.status = status;
                maintainInfoMap.set(client.id, maintainInfo);
                
                cudaInterval();
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

bs.on('error', function(error){

    logger.error('Binaryjs Server occuer error ', error);

});