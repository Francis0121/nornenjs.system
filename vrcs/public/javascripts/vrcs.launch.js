/**
 * Created by pi on 15. 1. 11.
 */
/**
 * Launch Jquery event function
 */
$(function(){

    medical.event.run();

    if( medical.connect !== undefined )
        medical.connect.run();

    if( medical.stream !== undefined )
        medical.stream.run();

    if( medical.debug !== undefined )
        medical.debug.run();

});