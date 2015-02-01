// ~ Socket IO

medical.connect = {

    $cthis : null,
    selector : '#view_port',
    document : {
        canvas : $('<canvas>'),
        loading : $('<div>')
    },

    socket : null,
    isConnect : false,
    url : 'http://' + host + ':3000',
    option : {
        reconnection : false
    },

    run : function(){
        $cthis = this;

        $cthis.start();

        $cthis.socket = io.connect($cthis.url, $cthis.option);

        $cthis.join();
        $cthis.message();
        $cthis.disconnected();
    },

    /**
     * Make Dom element
     */
    start : function(){


        $cthis.document.canvas.attr('id', $cthis.selector+'_canvas');
        $cthis.document.canvas.attr('width', $($cthis.selector).width()+'px');
        $cthis.document.canvas.attr('height', $($cthis.selector).width()+'px');

        $cthis.document.loading.addClass('loading')
            .append($('<img>').attr('src','/image/loading.gif'))
            .append($('<br>'))
            .append($('<span>').text('Please wait for the exit to other users'));

        $($cthis.selector)
            .append($cthis.document.canvas)
            .append($cthis.document.loading);
    },

    /**
     * Access socket to server
     */
    join : function(){
        $cthis.socket.emit('join');
    },

    /**
     * Response from server
     */
    message : function(){

        $cthis.socket.on('message', function(data){
            if(!data.success){
                $cthis.document.loading.show();
                return;
            }
            $cthis.document.canvas.show();
            $cthis.document.loading.hide();
            $cthis.isConnect = true;

            medical.stream.request();
        });
    },

    /**
     * Other client disconnect response from server
     */
    disconnected : function(){
        $cthis.socket.on('disconnected', function(data){
            $cthis.join();
        });
    }

};
