/**
 * Create by francis 15.01.17
 */
var ENUMS = require('./enums');
var logger = require('./logger');

function NornenjsClient(CudaRender, streamType, _socket){
    this.streamType = streamType;
    this.CudaRender = CudaRender;
    this._socket = _socket;

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
    logger.debug('set cuda interval - time [ ' + this.cudaIntervalTime + ' ]');
    this.cudaInterval = setInterval(this.execCuda, 1000 / ENUMS.INTERVAL_TIME[this.cudaIntervalIndex]);
};

NornenjsClient.prototype.setCompressInterval = function(){
    logger.debug('set compress interval - time [ ' + this.compressIntervalTime + ' ]');
    this.cudaInterval = setInterval(this.execCompress, 1000 / ENUMS.INTERVAL_TIME[this.compressIntervalIndex]);
};

NornenjsClient.prototype.execCuda = function(){

    var _CudaRender = this.CudaRender;
    //TODO confirm equal undefined
    if(_cudaRender == undefined){ 
        return;
    }

    if( this.streamType === ENUMS.STREAM_TYPE.START || this.streamType === ENUMS.STREAM_TYPE.ADAPTIVE ){
        var start = new Date().getTime();
        
        _CudaRender.start();
        this.cudaBufQueue.push(_CudaRender.hostOutputBuffer);
        _CudaRender.end();

        var end = new Date().getTime();
        logger.debug('Running time [ cuda renering time push hostOutputBuffer ] ' + (end - start) + 'ms');
    }else if(obj.type == REQUEST_TYPE.CHANGE){
        this.cudaBufQueue = []; // clear before png buffer cuda queue
        var start = new Date().getTime();
        _CudaRender.start();
        var jpeg = new Jpeg(_CudaRender.hostOutputBuffer, 512, 512, 'rgba');
        try {
            if (this._socket == undefined) {
                logger.debug('Connection already refused sync jpeg');
            } else {
                client.send(jpeg.encodeSync());
            }
        }catch (error){
            logger.warn('Connection refused sync jpeg ', error);
            closeCallback(client.id);
            return;
        }
        _CudaRender.end();
        
        var end = new Date().getTime();
        logger.debug('Running time [ cuda rendering time jpeg compress ] ' + (end - start) + 'ms');
    }else{

        logger.warn('Stream type not exist [' + this.streamType + ']');
        
    }

};

NornenjsClient.prototype.execCompress = function(){
    var buf = this.cudaBufQueue.shift();
    //TODO confirm equal undefined
    if(buf == undefined){
        return;
    }

    if(this.streamType === ENUMS.STREAM_TYPE.START || this.streamType === ENUMS.STREAM_TYPE.ADAPTIVE) {
        var png = new Png(buf, 512, 512, 'rgba');
        png.encode(function (pngImg) {
            try {
                if (this._socket == undefined) {
                    logger.debug('Connection already refused async png');
                } else {
                    client.send(pngImg);
                }
            } catch (error) {
                logger.warn('Connection refused async png ', error);
                // TODO closeCallback(client.id);
                return;
            }
        });
    }else if(obj.type == REQUEST_TYPE.CHANGE){
        logger.debug('ExecCompress do nothing [Cuda Buffer Queue size ' + this.cudaBufQueue.length + ']');
        this.cudaBufQueue = [];
    }else{
        logger.warn('Stream type not exist [' + this.streamType + ']');
    }
};

NornenjsClient.prototype.adaptive = function(){

    clearInterval(this.compressInterval);
    clearInterval(this.cudaInterval);

    this.setCudaInterval();
    this.setCompressInterval();
    
};

NornenjsClient.prototype.event = function(param){

    var _CudaRender = this.CudaRender;

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
    
};

NornenjsClient.prototype.destroy = function(){

    clearInterval(this.compressInterval);
    clearInterval(this.cudaInterval);
    
    // TODO cuModule memory 는 비우지 않아도 되나?
};


module.exports.NornenjsClient = NornenjsClient;