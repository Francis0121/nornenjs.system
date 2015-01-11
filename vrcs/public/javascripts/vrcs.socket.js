// ~ Socket IO

medical.connect = {

    $cthis : null,
    selector : '#view_port',
    document : {
        view : $('<img>'),
        loading : $('<div>'),
        fake : $('<div>')
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
        $cthis.document.view.addClass('data');

        $cthis.document.loading.addClass('loading')
            .append($('<img>').attr('src','/image/loading.gif'))
            .append($('<span>').text('Please wait for the exit to other users'));

        $cthis.document.fake.addClass('view_port_fake');

        $($cthis.selector).append($cthis.document.view)
            .append($cthis.document.loading)
            .append($cthis.document.fake);
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
            //$('.debug_wrap').append('<p>connect byte stream</p>');
            if(!data.success){
                //$('.debug_wrap').append('<p>'+data.error+'</p>');
                $cthis.document.view.hide();
                $cthis.document.loading.show();
                return;
            }
            $cthis.document.view.show();
            $cthis.document.loading.hide();
            $cthis.isConnect = true;

            medical.stream.request();
        });
    },

    /**
     * Other client disconnect response from server
     */
    disconnected : function(){
        $cthis.socket.on('user_disconnected', function(data){
            $cthis.join();
        });
    }

};
