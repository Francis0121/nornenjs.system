// ~ Byte stream

var second = 0;
var count = 0;
var sum = 0;
var debugInterval = null;

medical.stream = {

    REQUEST_TYPE : {
        START : 1,
        ADAPTIVE : 2,
        CHANGE : 3
    },

    RENDERING_TYPE : {
        VOLUME : 1,
        MIP : 2,
        MRI : 3
    },

    $sthis : null,
    url : 'ws://'+host+':9000',
    client : null,
    sendOption : null,
    buffer : null,

    run : function(){
        $sthis = this;
        $sthis.sendOption = {
            request_type : $sthis.REQUEST_TYPE.START,
            rendering_type : $sthis.RENDERING_TYPE.VOLUME,
            volumePn : accessInfo.volumePn,
            frame : 0,
            brightness : 1.0,
            positionZ : 3.0,
            transferOffset : 0.0,
            rotationX : 0,
            rotationY : 0
        };

        $sthis.client = new BinaryClient($sthis.url);
        $sthis.on();
    },

    send : function(){
        $sthis.makeBuffer();
        $sthis.client.send($sthis.buffer);
    },

    makeBuffer : function(){
        $sthis.buffer = new ArrayBuffer(36);
        var x = new Float32Array($sthis.buffer);
        x[0] = $sthis.sendOption.request_type;
        x[1] = $sthis.sendOption.volumePn;
        x[2] = $sthis.sendOption.frame;
        x[3] = $sthis.sendOption.rendering_type;
        x[4] = $sthis.sendOption.brightness;
        x[5] = $sthis.sendOption.positionZ;
        x[6] = $sthis.sendOption.transferOffset;
        x[7] = $sthis.sendOption.rotationX;
        x[8] = $sthis.sendOption.rotationY;
    },

    on : function(){

        $sthis.client.on('stream', function(stream, meta){

            var parts = [];

            stream.on('data', function(data){
                parts.push(data);
            });

            stream.on('end', function(){
                var url = (window.URL || window.webkitURL).createObjectURL(new Blob(parts));
                medical.connect.document.view.attr('src', url);

                count++;
                if(debugInterval === null){
                    debugInterval = setInterval($sthis.debug, 1000);
                }
            });
        });
    },

    request : function(){
        $sthis.sendOption.request_type = $sthis.REQUEST_TYPE.START;
        $sthis.send();
    },

    adaptive : function(){
        $sthis.sendOption.request_type = $sthis.REQUEST_TYPE.ADAPTIVE;
        $sthis.sendOption.frame = sum;
        $sthis.send();
    },

    debug : function(){

        if(count === 0){
            clearInterval(debugInterval);
            debugInterval = undefined;
        }

        second+=1;
        sum+=count;
        $('.debug_wrap').append('<p> sec: '+ second + ' c: ' +count+'</p>');
        if(second % 3 === 0 && medical.connect.isConnect) {
            $sthis.adaptive();
            sum = 0;
        }
        count = 0;
    }
};