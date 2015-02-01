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
var frameList = [ 60, 50, 40, 30, 25, 20, 15, 10 ];

var volumeMap = new HashMap();
var useMap = new HashMap();
var maintainInfoMap = new HashMap();

bs.on('connection', function(client){

    client.on('stream', function(stream, meta){

        logger.debug('Byte stream connection attempt ' + client.id);
        
        /**
         * Cuda ptx 파일을 이용하여 이미지 Frame을 생성하는 함수
         */
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

            var frameQueue = maintainInfo.frameQueue;
            if(frameQueue == undefined || frameQueue == null){
                return;
            }

            if(status.streamType == ENUMS.STREAM_TYPE.START){
                /**
                 * Stream type 이 처음 페이지를 접속했거나, Adaptive 인 경우에는 PNG 형식으로 압축하여 이미지 전송
                 */
                logger.info('Frame queue size [ ' + frameQueue.length + ' ]');
                var hrstart = process.hrtime();

                cudaRender.start();
                //frameQueue.push(cudaRender.d_outputBuffer);

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
            } else if(status.streamType == ENUMS.STREAM_TYPE.ADAPTIVE){
                logger.info('Frame queue size [ ' + frameQueue.length + ' ]');
                maintainInfo.frameQueue = [];
                var hrstart = process.hrtime();

                cudaRender.start();
                //frameQueue.push(cudaRender.d_outputBuffer);
                
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
                /**
                 * Stream type 이 이벤트 인 경우에 JPEG으로 압축하여 이미지 전송하고, 이 경우 Stack에 넣는것이아닌 바로 이미지 전송
                 */
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
         * Stack Interval 로 Event가 존재하지 않은 정지상태인 경우 PNG로 압축하여 이미지를 보내도록 하는 interval이다.
         */
        var stackInterval = function(){

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

            var frameQueue = maintainInfo.frameQueue;
            if(frameQueue == undefined || frameQueue == null) {
                return;
            }

            var frame = frameQueue.shift();
            if(frame == undefined || frameQueue == null){
                return;
            }

            if(status.streamType == ENUMS.STREAM_TYPE.START || status.streamType == ENUMS.STREAM_TYPE.ADAPTIVE) {
                var png = new Png(frame, 512, 512, 'rgba');
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
            }else if(status.streamType == ENUMS.STREAM_TYPE.EVENT){
                logger.debug('Do nothing');
            }else{
                logger.error('Request type not defined queue');
            }

        };

        /**
         * Client에서 요청받은 Byte Data를 버퍼로 변경해주는 함수
         */
        var returnParameter = function(buffer){
            var parameter = {
                streamType : buffer.readFloatLE(0),
                volumePn : buffer.readFloatLE(4),
                frame : buffer.readFloatLE(8),
                renderingType : buffer.readFloatLE(12),
                brightness : buffer.readFloatLE(16),
                positionZ : buffer.readFloatLE(20),
                transferOffset : buffer.readFloatLE(24),
                rotationX : buffer.readFloatLE(28),
                rotationY : buffer.readFloatLE(32),
                transferScaleX : buffer.readFloatLE(36),
                transferScaleY : buffer.readFloatLE(40),
                transferScaleZ : buffer.readFloatLE(44),
                mriType : buffer.readFloatLE(48),
                isMobile : buffer.readFloatLE(52)
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
                    /**
                     * 처음 들어온 상태라면 CudaRender Object를 생성하는 ptx 파일을 생성하여 연결해준다.
                     * 이과정에서 nvcc 를 통해서 새로 ptx를 컴파일한다.
                     */
                    var use = useMap.get(volumePn) == undefined ? 1 : useMap.get(volumePn) + 1;
                    useMap.set(volumePn, use);
                    
                    var cuModule = cu.moduleLoad(path.join(__dirname, '../src-cuda/volume.ptx'));
                    var cudaRender = new CudaRender(1, path.join(__dirname, '../../public/upload/')+volume.save_name,
                        volume.width, volume.height,volume.depth, cuCtx, cuModule);

                    cudaRender.init();
                    logger.debug('CudaRedner ', cudaRender);

                    // TODO 여기서 문제점 CudaInterval 은 10ms 마다 찍고 있음.

                    var status = {
                        frame : 0,
                        volumePn : volumePn,
                        streamType : param.streamType,
                        cudaInterval : null,
                        stackInterval : null
                    };

                    //status.cudaInterval = setInterval(cudaInterval, 1000);
                    //status.stackInterval = setInterval(stackInterval, 1000 / frameList[status.frame] );

                    var maintainInfo = {
                        status : status,
                        cudaRender : cudaRender,
                        frameQueue : []
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

            }else if(param.streamType == ENUMS.STREAM_TYPE.ADAPTIVE){

                var sum = param.frame;

                var maintainInfo = maintainInfoMap.get(client.id);
                if(maintainInfo == undefined || maintainInfo == null){
                    return;
                }

                var status = maintainInfo.status;
                if(status == undefined || status == null){
                    return;
                }

                var time = frameList[status.frame];
                status.streamType = param.streamType;

                if( time - 5 > sum / 3 ){

                    var text = 'Adaptive stream decrease frame from ' + frameList[status.frame];
                    status.frame = status.frame + 1 == frameList.length ? status.frame : status.frame + 1;
                    text += ' to ' + frameList[status.frame];
                    logger.debug(text);

                }else if( time - 1 < sum /3 ){

                    var text = 'Adaptive stream increase frame from ' + frameList[status.frame];
                    status.frame = status.frame-1 == -1 ? status.frame : status.frame - 1 ;
                    text += ' to ' + frameList[status.frame];
                    logger.debug(text);

                }else{

                    logger.debug('Maintain frame');

                }
            
                if(status.cudaInterval != null ){
                    clearInterval(status.cudaInterval);
                    status.cudaInterval = null;
                }
                //clearInterval(status.stackInterval);
                //status.cudaInterval = setInterval(cudaInterval, 1000 / frameList[status.frame] );
                //status.stackInterval = setInterval(stackInterval, 1000 / frameList[status.frame] );

                maintainInfo.status = status;
                maintainInfoMap.set(client.id, maintainInfo);
                
                cudaInterval();
                
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

                /**
                 * Cuda rendering에 전달하는 parameter
                 */
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

                /**
                 * Fraem queue 초기화
                 */
                maintainInfo.frameQueue = [];
                maintainInfoMap.set(client.id, maintainInfo);

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

    /**
     * 종료시에 뒤 처리를 해주는 함수
     */
    var closeCallback = function(clientId){

        var maintainInfo = maintainInfoMap.get(client.id);
        if(maintainInfo == undefined || maintainInfo == null){
            return;
        }

        var status = maintainInfo.status;

        if(status != undefined) {
            clearInterval(status.cudaInterval);
            clearInterval(status.stackInterval);

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