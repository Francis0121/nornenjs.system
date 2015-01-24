/**
 * Using debugging module "https://www.npmjs.com/package/winston"
 *
 * Created by francis on 15. 1. 18.
 */
var ENUMS = require('./enums');
var logger = require('./logger');
var cuda = require('./cuda/load');
var CudaRender = require('./cuda/render').CudaRender;

var path = require('path');
var BinaryServer = require('binaryjs').BinaryServer;
var HashMap = require('hashmap').HashMap;
var NornenjsClient = require('./client').NornenjsClient;
var sqlite = require('./sqlite/default');

var NornenjsMap = new HashMap();

function NornenjsServer(){
    this.filePath = path.join(__dirname, '../../public/upload/');
    this.port = null;
    this.binaryServer = null;
    this.cuCtx = null;
};

/**
 * Create nornenjs server 
 * ---
 * 1. set cuda device driver  
 * 2. start binaryjs server 
 * 3. ready run byte streaming
 * ---
 * @param port
 *      server port
 */
NornenjsServer.prototype.createServer = function(port){
    var _this = this;
    
    this.cuCtx = new cuda.Ctx(0, cuda.Device(0));
    this.port = port;
    
    this.binaryServer = BinaryServer( { port : this.port } );
    this.binaryServer.on('connection', function(client){

        client.on('stream', function(stream, meta){

            var buffer = [];

            stream.on('data', function(data){
                buffer.push(data);
            });

            stream.on('end', function() {
                var param = _this.changeBufToObj(buffer[0]);
                param.clientId = client.id;
                param._socket = client._socket._socket;
                param.client = client;
                logger.debug('Nornenjs request to client.');
                _this.endCallback(param);
            });

            stream.on('error', function(error){
                logger.error('Binaryjs module \'stream\' occur error ', error);
            });
            
        });

        client.on('close', function(stream, meta){
            logger.debug('Nornenjs socket close. Id ['+client.id+']');
            _this.closeCallback(client.id);
        });

    });
    
    this.binaryServer.on('error', function(){
        logger.error('Binaryjs module \'BinaryServer\' occur error ', error);
    });

    logger.debug('Nornenjs server start port [ ' + this.port + ' ]');
};

NornenjsServer.prototype.changeBufToObj = function(buffer){
    return {
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
        mriType : buffer.readFloatLE(48)
    };
};

NornenjsServer.prototype.endCallback = function(param){

    var _this = this;
    
    if(param.streamType === ENUMS.STREAM_TYPE.START){

        // TODO 성능향상에 목적을 둔다면 매번 조회하는 것이 아닌 객체를 만들어 두고 공유하는게 맞음
        sqlite.db.get(sqlite.sql.volume.selectVolumeOne, { $pn: param.volumePn }, function(err, volume){
            logger.debug(volume);
            if(err){ // TODO confirm this
                logger.error('Volume data select exec error');
                return;
            }

            if(volume == undefined) { // TODO change undefined
                logger.error('Fail select volume database');
            }else {
                // ~ run make nornenjs client
                _this.makeClient(param, volume);
            }
        });

    }else if(param.streamType === ENUMS.STREAM_TYPE.ADAPTIVE){

        this.runningAdaptive(param);

    }else if(param.streamType === ENUMS.STREAM_TYPE.EVENT){

        this.occurEvent(param);

    }else{
        logger.warning('Stream type not exist [' + param[0] + ']')
    }

};

NornenjsServer.prototype.makeClient = function(param, volume){
    var start = new Date().getTime();

    // ~ nvcc create ptx file
    var ptxFilePath = path.join(__dirname, '../src-cuda/vrcs.ptx');

    var end = new Date().getTime();
    logger.debug('Running time [ nvcc compile time ] ' + (end - start) + 'ms');

    var _CudaRender = new CudaRender(
        this.cuCtx, this.filePath + volume.save_name, ptxFilePath,
        volume.width, volume.height, volume.depth);

    _CudaRender.exec();
    
    var _NornenjsClient = new NornenjsClient(_CudaRender, param.client, param.streamType, param._socket);
    _NornenjsClient.initialize();
    NornenjsMap.set(param.clientId, _NornenjsClient);
};

NornenjsServer.prototype.runningAdaptive = function(param){

    var _NornenjsClient = NornenjsMap.get(param.clientId);
    _NornenjsClient.streamType = param.streamType;

    var sum = param.frame;
    var time = ENUMS.INTERVAL_TIME[_NornenjsClient.compressIntervalIndex];

    if( time - 5 > sum / 3  ){
        var text = 'adaptive stream decrease frame from ' + ENUMS.INTERVAL_TIME[_NornenjsClient.compressIntervalIndex];

        if(_NornenjsClient.compressIntervalIndex + 1 !== ENUMS.INTERVAL_TIME.length){
            _NornenjsClient.compressIntervalIndex += 1;
        }
        text += ' to ' + ENUMS.INTERVAL_TIME[_NornenjsClient.compressIntervalIndex];

        logger.debug(text);
    }else if( time - 1 < sum /3 ){
        var text = 'adaptive stream increase frame from ' + ENUMS.INTERVAL_TIME[_NornenjsClient.compressIntervalIndex];

        if(_NornenjsClient.compressIntervalIndex !== -1){
            _NornenjsClient.compressIntervalIndex -= 1;
        }
        text += ' to ' + ENUMS.INTERVAL_TIME[NornenjchangeBufToObjsClient.compressIntervalIndex];

        logger.debug(text);
    }else{
        logger.debug('Adaptive maintain frame');
    }

    _NornenjsClient.adaptive();
};

NornenjsServer.prototype.occurEvent = function(param){

    var _NornenjsClient = NornenjsMap.get(param.clientId);
    _NornenjsClient.streamType = param.streamType;

    _NornenjsClient.event(param);

};

NornenjsServer.prototype.closeCallback = function(clientId){
    var _NornenjsClient = NornenjsMap.get(clientId);
    if(_NornenjsClient != undefined) {
        _NornenjsClient.destroy();

        NornenjsMap.remove(clientId);
        logger.debug('Destroy and free cuda memory and buffer '+ clientId);
    }
};

module.exports.NornenjsServer = NornenjsServer;