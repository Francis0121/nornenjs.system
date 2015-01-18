/**
 * Using debugging module "https://www.npmjs.com/package/winston"
 *
 * Created by francis on 15. 1. 18.
 */
var ENUMS = require('./enums');
var logger = require('./logger');
var BinaryServer = require('binaryjs').BinaryServer;

function NornenjsServer(port){
    this.port = port;
    this.binaryServer = BinaryServer( { port : port } );
};

NornenjsServer.prototype.initialize = function(){
    
    logger.debug('Nornenjs server start port [ ' + this.port + ' ]');
    
    this.binaryServer.on('connection', function(client){

        client.on('stream', function(stream, meta){

            var part = [];

            stream.on('data', function(data){
                part.push(data);
            });

            stream.on('end', function() {

            });

        });

        client.on('close', function(stream, meta){

        });

    });
    
};

module.exports.NornenjsServer = NornenjsServer;
module.exports.NornenjsClient = require('./client').NornenjsClient;


// debug에 관한것은 한번 만들어두고 client에 전달합시다?








// TODO Cuda device 를 설정하고 new 를 하여 clientId 별로 객체를 만들 때마다 새로운 모듈에 대한 ptx를 생성하고 사용한다.

// TODO Binary server 에 대한 설정을 하고 해당 binaryServer에 대한 응답을 받도록 구현

// TODO 전역 변수를 설정하는 공간과 다른 module에서 사용할 수 있도록 함

// TODO client에 file을 write 하여 사용해야되지 않을까? 같은 type이 있는 데도 불구하고 지금 client랑 server 랑 분리되어있어서 매번 동기화를 해줘야되는 문제가 발생함

// TODO binaryserver만으로는 방개념이 정확히 성립되지않아 socket.io를 사용하게 되었는데 이과정에서 정확히 꺼지는지에 대한 문제가 발생되지 않았나 싶음

// TODO 현재 cuda랑 분리해두었는데 같은 공간에 있도록 프로젝트 다시 설정하고 나중에 npm에 같이 등록하면 좋을듯

// TODO 또 뭐가 있을까!!!!!!! 분리하자 분리하자 분리하자

// TODO 생각해보니 stream.js에 DB연결 모듈이 연결되어 있어서 나중에 npm에 등록할 때 이 부분도 문제가 되지 않을까? 그 객체에 대해 연결이 가능하도록
// TODO 객체에 대한 일관적인 방식이 필요할듯 아마 파일명만 있으면 되지 않을까 싶음.

// TODO Server는 New 방식으로 객체를 만들 필요 없지 않나? 한번만 생성되고 사용되어지니까 아마도 이게 맞을듯 싶다.

// TODO 생각생각생각 전체적인 그림을 잘 잡아둬야함.

// TODO Server가 종료된다면 device를 반환해줘야함.!!

// TODO 기타 예외처리.

