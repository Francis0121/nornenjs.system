/**
 * Created by pi on 15. 1. 11.
 */
/**
 * Launch Jquery event function
 */
$(function(){

    if( medical.connect !== undefined )
        medical.connect.run();

    if( medical.stream !== undefined )
        medical.stream.run();

    medical.event.run();

});