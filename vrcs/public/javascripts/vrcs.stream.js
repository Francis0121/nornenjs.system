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
        
    });

    $('.option_axis>ul>li').on('click', function(){
        var type = $(this).attr('data-type');
        nornenjs.axisType(type);
    });
    
});