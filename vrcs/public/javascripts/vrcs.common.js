/**
 * UI.Event
 */
var medical = { }; // base object

medical.event = {

    $ethis : null,

    run : function(){
        $ethis = this;

        $ethis.join();
        $ethis.signin();
        $ethis.volumeList();

        if( medical.stream !== undefined && medical.connect !== undefined) {
            $ethis.stream.resize();

            $ethis.stream.type();
            $ethis.stream.axisType();

            $ethis.stream.axis();
            $ethis.stream.otf();
            $ethis.stream.brightness();
            $ethis.stream.scale();
            $ethis.stream.type();

            $ethis.stream.mouse();
        }
    },

    join : function(){
        $('#delete_password').on('change', function(){
            var thiz = $(this);
            thiz.val() != '' ? thiz.addClass('delete_input_active') : thiz.removeClass('delete_input_active');
        });
    },

    signin : function(){
        $('#username, #password').on('change', function(){
            var thiz = $(this);
            thiz.val() != '' ? thiz.addClass('signin_input_active') : thiz.removeClass('signin_input_active');
        });
    },

    volumeList : function(){
        $('#volume_rendering tbody tr').on('click', function(){
            location.href='../stream/volumepn/'+$(this).attr('data-pn');
        });
    }
    
};
