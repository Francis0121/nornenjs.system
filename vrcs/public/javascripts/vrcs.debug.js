/**
 * Created by pi on 15. 1. 11.
 */
medical.debug = {

    $dthis : null,
    active : true,
    host : 'http://112.108.40.166:9080',

    isAccess : false,
    debugInterval : null,
    uuid : null,

    run : function() {
        $dthis = this;

        if ( !$dthis.active ) return;

        $dthis.emit();
    },

    emit : function(){
        var  url = $dthis.host + '/access/emit';

        try{
            $.getJSON(url, function(uuid){
                $dthis.uuid = uuid;
                $dthis.isAccess = true;
            });
        } catch (error){
            console.log('Error : ', error);
        }
    },

    statistic : function(){

        if(!$dthis.isAccess){
            clearInterval($dthis.debugInterval);
            return;
        }

        var url = $dthis.host + '/access/statistics';
        var json = {
            uuidPn : $dthis.uuid.pn,
            name : $.browser.name,
            platform : $.browser.platform,
            version : $.browser.version,
            versionNumber : $.browser.versionNumber,
            isMobile : $.browser.desktop ? 1 : 0,
            frameCount : 0
        };

        $.postJSON(url, json, function(stats_pn){

        });
    }

};


