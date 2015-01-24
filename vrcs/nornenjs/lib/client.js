/**
 * Create by francis 15.01.17
 */
var ENUMS = require('./enums');
var Jpeg = require('jpeg').Jpeg;
var Png = require('png').Png;
var logger = require('./logger');

function NornenjsClient(_CudaRender, client, streamType, _socket){
    this._this = this;
    this.streamType = streamType;
    this._CudaRender = _CudaRender;
    this._socket = _socket;
    this.client = client;

    this.cudaInterval = null;
    this.cudaIntervalIndex = 5;
    this.cudaBufQueue = [];
    
    this.compressInterval = null;
    this.compressIntervalIndex = 5;
};

NornenjsClient.prototype.initialize = function(){
    logger.debug('Nornenjs client initialize');
    this.setCudaInterval();
    this.setCompressInterval();
};

NornenjsClient.prototype.setCudaInterval = function(){
    logger.debug('set cuda interval - time [ ' + ENUMS.INTERVAL_TIME[this.cudaIntervalIndex] + ' ]');
    this.cudaInterval = setInterval(this.execCuda, 1000 / ENUMS.INTERVAL_TIME[this.cudaIntervalIndex], this);
};

NornenjsClient.prototype.setCompressInterval = function(){
    logger.debug('set compress interval - time [ ' + ENUMS.INTERVAL_TIME[this.compressIntervalIndex] + ' ]');
    this.compressInterval = setInterval(this.execCompress, 1000 / ENUMS.INTERVAL_TIME[this.compressIntervalIndex], this);
};

NornenjsClient.prototype.execCuda = function(_this){
    var _CudaRender = _this._CudaRender;
    //TODO confirm equal undefined
    if(_CudaRender == undefined){
        return;
    }
    logger.info('Exec cuda object ' + _CudaRender);
    
    var streamType = _this.streamType;
    if( streamType === ENUMS.STREAM_TYPE.START || streamType === ENUMS.STREAM_TYPE.ADAPTIVE ){
        var start = new Date().getTime();
        
        _CudaRender.start();
        _this.cudaBufQueue.push(_CudaRender.hostOutputBuffer);
        _CudaRender.end();

        var end = new Date().getTime();
        logger.debug('Running time [ cuda renering time push hostOutputBuffer ] ' + (end - start) + 'ms');
    }else if( streamType === ENUMS.STREAM_TYPE.EVENT ){
        _this.cudaBufQueue = []; // clear before png buffer cuda queue
        var start = new Date().getTime();
        _CudaRender.start();
        var jpeg = new Jpeg(_CudaRender.hostOutputBuffer, 512, 512, 'rgba');
        try {
            _this.client.send(jpeg.encodeSync());
            if (_this._socket == undefined) {
                logger.debug('Connection already refused sync jpeg');
            } else {
                
            }
        }catch (error){
            logger.warning('Connection refused sync jpeg ', error);
            //closeCallback(client.id);
            return;
        }
        _CudaRender.end();
        
        var end = new Date().getTime();
        logger.debug('Running time [ cuda rendering time jpeg compress ] ' + (end - start) + 'ms');
    }else{

        logger.warning('Stream type not exthisist [' + streamType + ']');
        
    }

};

NornenjsClient.prototype.execCompress = function(_this){
    if(_this.cudaBufQueue == undefined)
        return;
    
    var buf = _this.cudaBufQueue.shift();
    //TODO confirm equal undefined
    if(buf == undefined){
        return;
    }
    
    logger.info('ExecCompress start');
    var streamType = _this.streamType;
    if(streamType === ENUMS.STREAM_TYPE.START || streamType === ENUMS.STREAM_TYPE.ADAPTIVE) {
        var png = new Png(buf, 512, 512, 'rgba');
        png.encode(function (pngImg) {
            _this.client.send(pngImg);
            
            try {
                if (_this._socket == undefined) {
                    logger.debug('Connection already refused async png');
                } else {
                    client.send(pngImg);
                }
            } catch (error) {
                logger.warning('Connection refused async png ', error);
                // TODO closeCallback(client.id);
                return;
            }
        });
    }else if(streamType === ENUMS.STREAM_TYPE.EVENT){
        logger.debug('ExecCompress do nothing [Cuda Buffer Queue size ' + _this.cudaBufQueue.length + ']');
        _this.cudaBufQueue = [];
    }else{
        logger.warning('Stream type not exist [' + streamType + ']');
    }
    logger.info('ExecCompress end');
};

NornenjsClient.prototype.adaptive = function(){
    logger.info('Adaptive start');
    
    clearInterval(this.compressInterval);
    clearInterval(this.cudaInterval);

    this.setCudaInterval();
    this.setCompressInterval();
    logger.info('Adaptive end');
};

NornenjsClient.prototype.event = function(param){
    logger.info('Event start');
    var _CudaRender = this._CudaRender;

    _CudaRender.type = param.renderingType;
    _CudaRender.positionZ = param.positionZ;
    _CudaRender.brightness = param.brightness;
    _CudaRender.transferOffset = param.transferOffset;
    _CudaRender.transferScaleX = param.transferScaleX;
    _CudaRender.transferScaleY = param.transferScaleY;
    _CudaRender.transferScaleZ = param.transferScaleZ;
    _CudaRender.rotationX = param.rotationX;
    _CudaRender.rotationY = param.rotationY;
    _CudaRender.mriType = param.mriType;
    logger.info('Event end');
};

NornenjsClient.prototype.destroy = function(){
    logger.info('Destroy start');
    clearInterval(this.compressInterval);
    clearInterval(this.cudaInterval);
    
    // TODO cuModule memory 는 비우지 않아도 되나?
    logger.info('Destroy end');
};


module.exports.NornenjsClient = NornenjsClient;