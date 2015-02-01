// ~ Byte stream
medical.stream = {

    MRI_DEFAULT_OPTION : {
        rotationX : 0,
        rotationY : 0,
        positionZ : 3.0
    },

    STREAM_TYPE : {
        START : 1,
        ADAPTIVE : 2,
        EVENT : 3
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
    firstEvent : false,

    run : function(){
        $sthis = this;
        $sthis.sendOption = {
            streamType : $sthis.STREAM_TYPE.START,
            renderingType : $sthis.RENDERING_TYPE.VOLUME,
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
            mriType : $sthis.MRI_TYPE.X,
            isMobile : $.browser.desktop ? 0 : 1
        };

        $sthis.client = new BinaryClient($sthis.url);
        $sthis.on();

        $sthis.debug.run();
    },

    send : function(){
        $sthis.makeBuffer();
        $sthis.client.send($sthis.buffer);
    },

    makeBuffer : function(){
        $sthis.buffer = new ArrayBuffer(56);
        var x = new Float32Array($sthis.buffer);
        
        x[0] = $sthis.sendOption.streamType;
        x[1] = $sthis.sendOption.volumePn;
        x[2] = $sthis.sendOption.frame;
        x[3] = $sthis.sendOption.renderingType;
        x[4] = $sthis.sendOption.brightness;
        x[5] = $sthis.sendOption.positionZ;
        x[6] = $sthis.sendOption.transferOffset;
        x[7] = $sthis.sendOption.rotationX;
        x[8] = $sthis.sendOption.rotationY;
        x[9] = $sthis.sendOption.transferScaleX;
        x[10] = $sthis.sendOption.transferScaleY;
        x[11] = $sthis.sendOption.transferScaleZ;
        x[12] = $sthis.sendOption.mriType;
        x[13] = $sthis.sendOption.isMobile;
    },

    on : function(){

        $sthis.client.on('stream', function(stream, meta){

            var parts = [];

            stream.on('data', function(data){
                parts.push(data);
            });

            stream.on('end', function(){
                var url = (window.URL || window.webkitURL).createObjectURL(new Blob(parts));
                var canvas = document.getElementById(medical.connect.selector+'_canvas');
                var ctx = canvas.getContext('2d');

                var img = new Image(512, 512);
                img.onload = function(){
                    ctx.drawImage(img, 0, 0, 512, 512, 0, 0,$(medical.connect.selector).width(), $(medical.connect.selector).width());
                };
                img.src = url;

                $sthis.adaptiveOption.frame++;
                if($sthis.adaptiveOption.interval === null)
                    $sthis.adaptiveOption.interval = setInterval($sthis.adaptiveInterval, 1000);

                // ~ browser touch event. Why code here? Not supported jquery touch event
                if(!$sthis.firstEvent && $.browser.mobile){
                    $sthis.firstEvent = true;
                    medical.event.stream.touch();
                    console.log('dodododdodododododdodododod');
                }
            });
        });
    },

    request : function(){
        $sthis.sendOption.streamType = $sthis.STREAM_TYPE.START;
        $sthis.send();
    },

    adaptiveOption : {
        interval : null,
        frame : 0,
        sum : 0,
        elapsedTime : 0
    },

    adaptive : function(){
        $sthis.sendOption.streamType = $sthis.STREAM_TYPE.ADAPTIVE;
        $sthis.sendOption.frame = $sthis.adaptiveOption.sum;
        $sthis.send();
    },

    adaptiveInterval : function(){

        if($sthis.adaptiveOption.frame === 0){
            clearInterval($sthis.adaptiveOption.interval);
            $sthis.adaptiveOption.interval = null;
        }

        // ~ adaptive stream
        $sthis.adaptiveOption.elapsedTime += 1;
        $sthis.adaptiveOption.sum += $sthis.adaptiveOption.frame;

        var text = 'second: ' + $sthis.adaptiveOption.elapsedTime + ' frame: ' +  $sthis.adaptiveOption.frame;
        $sthis.debug.text($sthis.debug.LEVEL.DEBUG, text);

        if( ( $sthis.adaptiveOption.elapsedTime % 3 === 0 ) && medical.connect.isConnect) {
            $sthis.adaptive();
            $sthis.adaptiveOption.sum = 0;
        }

        medical.connect.document.fps.text('FPS : ' + $sthis.adaptiveOption.frame);

        // ~ send debug
        var $dthis = $sthis.debug;
        var $option = $dthis.option;
        if( $option.isAccess === true ){
            $dthis.statistic();
        }
        $sthis.adaptiveOption.frame = 0;

    },

    debug : {

        LEVEL : { INFO : 0, DEBUG : 1, ERROR : 2 },

        option : {
            active : true,
            draw : false,
            host : 'http://112.108.40.166:9080',
            isAccess : false,
            uuid : null,
        },

        document : {
            streamDebugWrap : null,
            content : null
        },

        run : function(){

            if ( !$sthis.debug.option.active ) return;

            $sthis.debug.emit();

            if ( !$sthis.debug.option.draw ) return;

            $sthis.debug.view();
        },

        view : function(){
            var $dthis = $sthis.debug;
            var $doc = $dthis.document;

            $doc.streamDebugWrap =
                $('<div>').attr('id', '_stream_debug')
                    .addClass('_stream_debug_wrap');

            $doc.content =
                $('<div>').addClass('content');

            $('html').append($doc.streamDebugWrap.append($doc.content));
        },

        text : function(level, log){
            var $dthis = $sthis.debug;
            var $doc = $dthis.document;

            if( !$dthis.option.draw ) return;

            var $text = $('<p>');

            var pre = null;
            if( level === $sthis.debug.LEVEL.INFO ){
                pre = '[INFO] ';
                $text.addClass('info');
            }else if( level === $sthis.debug.LEVEL.DEBUG ){
                pre = '[DEBUG] ';
                $text.addClass('debug');
            }else if( level === $sthis.debug.LEVEL.ERROR ){
                pre = '[ERROR] ';
                $text.addClass('error');
            }else {
                pre = '[NONE] ';
            }

            $text.text(pre + log);
            $doc.content.append($text);
        },

        emit : function(){
            var $dthis = $sthis.debug;
            var $option = $dthis.option;

            var url = $option.host + '/access/emit';

            $.getJSON(url, function(uuid){
                $option.uuid = uuid;
                $option.isAccess = true;
            }).error(function(error){
                console.log('[ERROR]', error);
                $option.isAccess = false;
            });
        },

        statistic : function(){
            var $dthis = $sthis.debug;
            var $option = $dthis.option;

            if(!$option.isAccess){
                return;
            }

            var url = $option.host + '/access/statistics';
            var json = {
                uuidPn : $option.uuid.pn,
                name : $.browser.name,
                platform : $.browser.platform,
                version : $.browser.version,
                versionNumber : $.browser.versionNumber,
                isMobile : $.browser.desktop ? 1 : 0,
                frameCount : $sthis.adaptiveOption.frame
            };

            $.postJSON(url, json, function(stats_pn){
                console.log('[INFO] success index ', stats_pn)
            }).error(function(error){
                console.log('[ERROR]', error);
                $option.isAccess = false;
            });
        }
    }
};
