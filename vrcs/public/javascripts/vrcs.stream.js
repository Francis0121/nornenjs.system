/**
 * Created by pi on 15. 2. 10.
 */

var nornenjs = new Nornenjs(volumePrimaryNumber, '112.108.40.166', 3000, 9000);

var debugCallback = function(data){
    console.log(data);
};

nornenjs.connect(debugCallback);

$(function(){
   
    $('.option_rendering>ul>li').on('click', function(){
        var type = $(this).attr('data-type');
        nornenjs.type(type);
        
        $('.option_rendering>ul>li').removeClass('option_select_wrap_active').addClass('option_select_wrap_none');
        $(this).addClass('option_select_wrap_active');

        if(type == ENUMS.RENDERING_TYPE.MRI){
            $('.option_zoom').hide();
            $('.option_brightness').hide();
            $('.option_otf').hide();
            $('.option_axis').show();
            nornenjs.sendOption.rotationX = STATIC.MRI_DEFAULT_OPTION.rotationX;
            nornenjs.sendOption.rotationY = STATIC.MRI_DEFAULT_OPTION.rotationY;
            nornenjs.sendOption.positionZ = STATIC.MRI_DEFAULT_OPTION.positionZ;
        }else if(type == ENUMS.RENDERING_TYPE.VOLUME){
            $('.option_zoom').show();
            $('.option_brightness').show();
            $('.option_otf').show();
            $('.option_axis').hide();
        }else if(type == ENUMS.RENDERING_TYPE.MIP){
            $('.option_zoom').show();
            $('.option_brightness').hide();
            $('.option_otf').hide();
            $('.option_axis').hide();
        }
        
    });

    $('.option_axis>ul>li').on('click', function(){
        var type = $(this).attr('data-type');
        nornenjs.axisType(type);
    });

    $('.nstSlider').nstSlider({
        'left_grip_selector' : '.leftGrip',
        'value_bar_selector' : '.bar',
        'value_changed_callback': function(cause, leftValue, rightValue) {
            $(this).find('.bar').css('background', 'url(/image/slider.png)' );

            if(nornenjs.isConnect) {
                if (this.attr('data-type') == 'scale') {
                    nornenjs.scale(leftValue / 1000, false);
                } else if (this.attr('data-type') == 'brightness') {
                    nornenjs.brightness(leftValue / 100, false);
                } else if (this.attr('data-type') == 'otf'){
                    nornenjs.otf((leftValue-100000)/100000, false);
                } else if (this.attr('data-type') == 'axis'){
                    nornenjs.axis(leftValue/10000, false);
                }
            }
        },
        'user_mouseup_callback' : function(cause, leftValue, rightValue) {
            setTimeout(nornenjs.finish, 1000, nornenjs);
        }
    });
    
});