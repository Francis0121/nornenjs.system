/**
 * Using debugging module "https://www.npmjs.com/package/winston"
 *
 * Created by francis on 15. 1. 18.
 */
var ENUMS = require('./enums');
var logger = require('./logger');
var cuda = require('./cuda/load');
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
    this.createServer = function(port){
        this.port = port;
        this.binaryServer = BinaryServer( { port : this.port } );
        this.cuCtx = new cuda.Ctx(0, cuda.Device(0));
        
        logger.debug('Nornenjs server start port [ ' + this.port + ' ]');
    }
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
                this.makeClient(param, volume);
            }
        });
        
    }else if(param.streamType === ENUMS.STREAM_TYPE.ADAPTIVE){
        
        this.runningAdaptive(param);
        
    }else if(param.streamType === ENUMS.STREAM_TYPE.EVENT){
        
        this.occurEvent(param);
        
    }else{
        logger.warn('Stream type not exist [' + param[0] + ']')
    }
    
};

NornenjsServer.prototype.makeClient = function(param, volume){
    var start = new Date().getTime();
    
    // ~ nvcc create ptx file
    var ptxFilePath = path.join(__dirname, '../src-cuda/vrcs.ptx');

    var end = new Date().getTime();
    logger.debug('Running time [ nvcc compile time ] ' + (end - start) + 'ms');
    
    var CudaRender = new CudaRender(
        this.cuCtx, this.filePath + volume.save_name, ptxFilePath,
        volume.width, volume.height, volume.depth);
    
    var NornenjsClient = new NornenjsClient(CudaRender, param.streamType, param._socket);
    NornenjsClient.initialize();
    NornenjsMap.set(param.clientId, NornenjsClient);
};

NornenjsServer.prototype.runningAdaptive = function(param){

    var NornenjsClient = NornenjsMap.get(param.clientId);
    NornenjsClient.streamType = param.streamType;
    
    var sum = param.frame;
    var time = ENUMS.INTERVAL_TIME[NornenjsClient.compressIntervalIndex];

    if( time - 5 > sum / 3  ){
        var text = 'adaptive stream decrease frame from ' + ENUMS.INTERVAL_TIME[NornenjsClient.compressIntervalIndex];
        
        if(NornenjsClient.compressIntervalIndex + 1 !== ENUMS.INTERVAL_TIME.length){
            NornenjsClient.compressIntervalIndex += 1;
        }
        text += ' to ' + ENUMS.INTERVAL_TIME[NornenjsClient.compressIntervalIndex];
        
        logger.debug(text);
    }else if( time - 1 < sum /3 ){
        var text = 'adaptive stream increase frame from ' + ENUMS.INTERVAL_TIME[NornenjsClient.compressIntervalIndex];

        if(NornenjsClient.compressIntervalIndex !== -1){
            NornenjsClient.compressIntervalIndex -= 1;
        }
        text += ' to ' + ENUMS.INTERVAL_TIME[NornenjsClient.compressIntervalIndex];

        logger.debug(text);
    }else{
        logger.debug('Adaptive maintain frame');
    }
    
    NornenjsClient.adaptive();
};

NornenjsServer.prototype.occurEvent = function(param){

    var NornenjsClient = NornenjsMap.get(param.clientId);
    NornenjsClient.streamType = param.streamType;

    NornenjsClient.event(param);
    
};

NornenjsServer.prototype.closeCallback = function(clientId){
    var NornenjsClient = NornenjsMap.get(param.clientId);
    if(NornenjsClient != undefined) {
        NornenjsClient.destroy();
        
        NornenjsMap.remove(clientId);
        logger.debug('Destroy and free cuda memory and buffer '+ clientId);
    }
};

NornenjsServer.prototype.connection = function(){

    this.binaryServer.on('connection', function(client){

        client.on('stream', function(stream, meta){

            var buffer = [];

            stream.on('data', function(data){
                buffer.push(data);
            });

            stream.on('end', function() {
                var param = this.changeBufToObj(buffer[0]);
                param.clientId = client.id;
                param._socket = client._socket._socket;
                logger.debug('Nornenjs request to client.', param);
                this.endCallback(param);
            });

            stream.on('error', function(error){
                logger.error('Binaryjs module \'stream\' occur error ', error);
            });
            
        });

        client.on('close', function(stream, meta){
            logger.debug('Nornenjs socket close. Id ['+client.id+']');
            this.closeCallback(client.id);
        });

    });
    
    this.binaryServer.on('error', function(){
        logger.error('Binaryjs module \'BinaryServer\' occur error ', error);
    });
    
};

module.exports.NornenjsServer = NornenjsServer;
module.exports.NornenjsMap = NornenjsMap;