/**
 * Created by francis on 15. 1. 18.
 */

// TODO Cuda device 를 설정하고 new 를 하여 clientId 별로 객체를 만들 때마다 새로운 모듈에 대한 ptx를 생성하고 사용한다.

// TODO Binary server 에 대한 설정을 하고 해당 binaryServer에 대한 응답을 받도록 구현

// TODO 전역 변수를 설정하는 공간과 다른 module에서 사용할 수 있도록 함

// TODO client에 file을 write 하여 사용해야되지 않을까? 같은 type이 있는 데도 불구하고 지금 client랑 server 랑 분리되어있어서 매번 동기화를 해줘야되는 문제가 발생함

// TODO binaryserver만으로는 방개념이 정확히 성립되지않아 socket.io를 사용하게 되었는데 이과정에서 정확히 꺼지는지에 대한 문제가 발생되지 않았나 싶음

// TODO 현재 cuda랑 분리해두었는데 같은 공간에 있도록 프로젝트 다시 설정하고 나중에 npm에 같이 등록하면 좋을듯

// TODO 또 뭐가 있을까!!!!!!! 분리하자 분리하자 분리하자


