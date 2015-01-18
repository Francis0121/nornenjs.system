/**
 * Create by francis 15.01.17
 */

var logger = require('./logger');

/**
 *  전역으로 해야되는 객체는 어따 두어야 좋을까?
 *  HashMap으로 생성되어지는데 이것들은 어떻게 할까
 *  Socket이 끊겼는지 어떻게 판단할까
 *  Log를 찍는데 각각의 log를 출력할 수있도록 하면 좋을 것 같은데 - winston 써보지 뭐
 */
function NornenjsClient(clientId, cudaIntervalTime, compressIntervalTime){
    this.clientId = clientId;

    this.cudaInterval = null;
    this.cudaIntervalTime = cudaIntervalTime;

    this.compressInterval = null;
    this.compressIntervalTime = compressIntervalTime;
}

/**
 * Client 초기화 할 때 쓰게 되는 부분
 * Cuda ptx 도 다시받게 끔 구현해야 된다다다다
 */
NornenjsClient.prototype.initialize = function(){
    logger.debug('Nornenjs client initialize');
};

/**
 * Cuda interval을 생성해야 하는데 어떤 방식으로 생성할까
 */
NornenjsClient.prototype.setCudaInterval = function(){
    logger.debug('set cuda interval - time [ ' + this.cudaIntervalTime + ' ]');
    this.cudaInterval = setInterval(this.execCuda, this.cudaIntervalTime);
};

/**
 * 압축하는 인터벌 관리도 안되는데 어떻게하면 관리가 잘되려나??
 */
NornenjsClient.prototype.setCompressInterval = function(){
    logger.debug('set compress interval - time [ ' + this.compressIntervalTime + ' ]');
    this.cudaInterval = setInterval(this.execCompress, this.compressIntervalTime);
};

/**
 * 하나의 hashmap에 client.id를 여기서 받으니까 해당되는 객체를 받으면 되지 않을까?
 * Cuda를 실행하여 하나씩 한프레임을 찍는데
 * 보통의 stream type일때는 PNG로 출력해주기 위해서 PNG 압축방식을 사용하는데 이때는 비동기적으로 stack에 쌓게됨.
 * event가 발생되어질때에는 Jpeg으로 하여 비동기가 아닌 동기적으로 출력한다.
 *
 * @param cudaRenderObj
 *  CudaRender에 대한 Object
 * @param compressObj
 *  압축을 쌓는 Object
 * @param streamObj
 *  스트림 Object
 */
NornenjsClient.prototype.execCuda = function(cudaRenderObj, compressObj, streamObj){

    var cudaRender = vrcsCudaMap.get(client.id);
    if(cudaRender == undefined) return;

    var stack = vrcsBufMap.get(client.id);
    if(stack == undefined) return;

    var obj = streamMap.get(client.id);
    if(obj == undefined) return;

    if(obj.type == REQUEST_TYPE.START || obj.type == REQUEST_TYPE.ADAPTIVE){
        var hrstart = process.hrtime();
        cudaRender.start();
        stack.push(cudaRender.d_outputBuffer);
        cudaRender.end();
        hrend = process.hrtime(hrstart);
        //console.info(client.id, 'Execution time (hr): %ds %dms', hrend[0], hrend[1]/1000000);
    }else if(obj.type == REQUEST_TYPE.CHANGE){
        var hrstart = process.hrtime();
        cudaRender.start();
        var jpeg = new Jpeg(cudaRender.d_outputBuffer, 512, 512, 'rgba');
        try {
            if (client._socket._socket == undefined) {
                console.log('[INFO] Connection already refused sync jpeg :: client id ', client.id);
            } else {
                client.send(jpeg.encodeSync());
            }
        }catch (error){
            console.log('[ERROR] Connection refused sync jpeg ', error);
            closeCallback(client.id);
            return;
        }
        cudaRender.end();
        hrend = process.hrtime(hrstart);
        //console.info(client.id, 'Execution time (hr): %ds %dms', hrend[0], hrend[1]/1000000);
    }else{
        console.log('[ERROR] Request type not defined');
    }

};

/**
 *  Png 압축방식을 수행하는것 stack에 쌓인것을 압축을 통해출력한다.
 *  Stack을 이 객체에 넣어두면 좀 더 좋을것이라고 생가됨.
 */
NornenjsClient.prototype.execCompress = function(){
    var stack = vrcsBufMap.get(client.id);
    if( stack == undefined) return;

    var buf = stack.shift();
    if(buf == undefined) return;

    var obj = streamMap.get(client.id);
    if(obj == undefined) return;

    if(obj.type == REQUEST_TYPE.START || obj.type == REQUEST_TYPE.ADAPTIVE) {
        var png = new Png(buf, 512, 512, 'rgba');
        png.encode(function (png_img) {
            try {
                if (client._socket._socket == undefined) {
                    console.log('[INFO] Connection already refused async png :: client id ', client.id);
                } else {
                    client.send(png_img);
                }
            } catch (error) {
                console.log('[ERROR] Connection refused async png ', error);
                closeCallback(client.id);
                return;
            }
        });
    }else if(obj.type == REQUEST_TYPE.CHANGE){
        console.log('[INFO] Do nothing ');
    }else{
        console.log('[ERROR] Request type not defined');
    }
};

/**
 * 반응형 스트리밍이 될 경우 해당되는 함수
 */
NornenjsClient.prototype.adaptive = function(){

};

/**
 * Client id가 destroy 되게 되면 해당되는 객체에 대한 모든것을 지운다.
 */
NornenjsClient.prototype.destroy = function(){

};

module.exports.NornenjsClient = NornenjsClient;