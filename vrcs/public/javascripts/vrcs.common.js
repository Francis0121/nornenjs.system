/**
 * UI.Event
 */
$(function(){

    // ~ join
    $('#delete_password').on('change', function(){
        var thiz = $(this);
        thiz.val() != '' ? thiz.addClass('delete_input_active') : thiz.removeClass('delete_input_active');
    });

    // ~ signin
    $('#username, #password').on('change', function(){
        var thiz = $(this);
        thiz.val() != '' ? thiz.addClass('signin_input_active') : thiz.removeClass('signin_input_active');
    });

    // ~ volume list
    $('#volume_rendering tbody tr').on('click', function(){
        location.href='../stream/volumepn/'+$(this).attr('data-pn');
    });

});