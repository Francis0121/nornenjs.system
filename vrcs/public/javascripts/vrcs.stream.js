// ~ Byte stream
medical.stream = {

    MRI_DEFAULT_OPTION : {
        rotationX : 0,
        rotationY : 0,
        positionZ : 3.0
    },

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

    MRI_TYPE : {
        X : 1,
        Y : 2,
        Z : 3
    },

    $sthis : null,
    url : 'ws://'+host+':9000',
    client : null,
    buffer : null,
    sendOption : null,

    mriX_option : {
        transferScaleX : 0.0,
        transferScaleY : 0.0,
        transferScaleZ : 0.0
    },
    mriY_option : {
        transferScaleX : 0.0,
        transferScaleY : 0.0,
        transferScaleZ : 0.0
    },
    mriZ_option : {
        transferScaleX : 0.0,
        transferScaleY : 0.0,
        transferScaleZ : 0.0
    },

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
            rotationY : 0,
            transferScaleX : 0.0,
            transferScaleY : 0.0,
            transferScaleZ : 0.0,
            mriType : $sthis.MRI_TYPE.X
        };

        $sthis.client = new BinaryClient($sthis.url);
        $sthis.on();
    },

    send : function(){
        $sthis.makeBuffer();
        $sthis.client.send($sthis.buffer);
    },

    makeBuffer : function(){
        $sthis.buffer = new ArrayBuffer(52);
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
        x[9] = $sthis.sendOption.transferScaleX;
        x[10] = $sthis.sendOption.transferScaleY;
        x[11] = $sthis.sendOption.transferScaleZ;
        x[12] = $sthis.sendOption.mriType;
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

                $sthis.adaptiveOption.frame++;
                if($sthis.adaptiveOption.interval === null)
                    $sthis.adaptiveOption.interval = setInterval($sthis.adaptiveInterval, 1000);

            });
        });
    },

    request : function(){
        $sthis.sendOption.request_type = $sthis.REQUEST_TYPE.START;
        $sthis.send();
    },

    adaptiveOption : {
        interval : null,
        frame : 0,
        sum : 0,
        elapsedTime : 0
    },

    adaptive : function(){
        $sthis.sendOption.request_type = $sthis.REQUEST_TYPE.ADAPTIVE;
        $sthis.sendOption.frame = $sthis.adaptiveOption.sum;
        $sthis.send();
    },

    adaptiveInterval : function(){

        if($sthis.adaptiveOption.frame === 0){
            clearInterval($sthis.adaptiveOption.interval);
            $sthis.adaptiveOption.interval = null;
        }

        $sthis.adaptiveOption.elapsedTime += 1;
        $sthis.adaptiveOption.sum += $sthis.adaptiveOption.frame;

        if( ( $sthis.adaptiveOption.elapsedTime % 3 === 0 ) && medical.connect.isConnect) {
            $sthis.adaptive();
            $sthis.adaptiveOption.elapsedTime = 0;
        }

        $sthis.adaptiveOption.frame = 0;

    }
};