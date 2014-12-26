module.exports.name = 'vrcs_cuda';

var Buffer = require('buffer').Buffer;
var cu = require('../cuda/cuda');
var mat4 = require('../cuda/matrix_mat4');
var vec3 = require('../cuda/matrix_vec3');


var renderig_type_volume = 1;
//cuCtx
var cuCtx = new cu.Ctx(0, cu.Device(0));
//cuModuleLoad
var cuModule = cu.moduleLoad('/home/russa/git/vrcs/web/vrcs/cuda/vrcs.ptx');

//volumeLoad & volumeTexture & TfTexture Binding
var error = cuModule.memTextureAlloc('Bighead.den', 256*256*225);

//excute time
var hrstart = process.hrtime();

/*global variable*/
var imageWidth=512;
var imageHeight=512;
var density = 0.05;
var brightness = 1.0;
var transferOffset = 1.18;
var transferScale = 1.0;

/*3D volume array*/
var d_output = cu.memAlloc(imageWidth*imageHeight*4);
var error = d_output.memSet(imageWidth*imageHeight*4);

var vec;
var model_matrix = mat4.create();

vec = vec3.fromValues(-1.0, 0.0, 0.0);
mat4.rotate(model_matrix, model_matrix, ((270.0 ) * 3.14159265 / 180.0), vec);

vec = vec3.fromValues(0.0, 1.0, 0.0);
mat4.rotate(model_matrix, model_matrix,( 0.0* 3.14159265 / 180.0), vec);

vec = vec3.fromValues(0.0, 0.0, 3.0);
mat4.translate(model_matrix, model_matrix,vec)

/*view vector*/
var c_invViewMatrix = new Buffer(12*4);
c_invViewMatrix.writeFloatLE( model_matrix[0], 0*4);
c_invViewMatrix.writeFloatLE( model_matrix[4], 1*4);
c_invViewMatrix.writeFloatLE( model_matrix[8], 2*4);
c_invViewMatrix.writeFloatLE( model_matrix[12], 3*4);
c_invViewMatrix.writeFloatLE( model_matrix[1], 4*4);
c_invViewMatrix.writeFloatLE( model_matrix[5], 5*4);
c_invViewMatrix.writeFloatLE( model_matrix[9], 6*4);
c_invViewMatrix.writeFloatLE( model_matrix[13], 7*4);
c_invViewMatrix.writeFloatLE( model_matrix[2], 8*4);
c_invViewMatrix.writeFloatLE( model_matrix[6], 9*4);
c_invViewMatrix.writeFloatLE( model_matrix[10], 10*4);
c_invViewMatrix.writeFloatLE( model_matrix[14], 11*4);

var d_invViewMatrix = cu.memAlloc(12*4);
var error = d_invViewMatrix.copyHtoD(c_invViewMatrix);

if(renderig_type_volume == 0){
    //cuModuleGetFunction
    var cuFunction = cuModule.getFunction("render_kernel_volume");

    //cuLaunchKernel
    var time = new Date().getTime();
    var error = cu.launch(cuFunction, [32, 32, 1], [16, 16, 1],
        [
            {
                type: "DevicePtr",
                value: d_output.devicePtr
            },{
            type: "DevicePtr",
            value: d_invViewMatrix.devicePtr
        },{
            type: "Uint32",
            value: imageWidth
        },{
            type: "Uint32",
            value: imageHeight
        },{
            type: "Float32",
            value: density
        },{
            type: "Float32",
            value: brightness
        },{
            type: "Float32",
            value: transferOffset
        },{
            type: "Float32",
            value: transferScale
        }
        ]);
}
else if(renderig_type_volume == 1){
    var cuFunction = cuModule.getFunction("render_kernel_MIP");

    //cuLaunchKernel
    var time = new Date().getTime();
    var error = cu.launch(cuFunction, [32, 32, 1], [16, 16, 1],
        [
            {
                type: "DevicePtr",
                value: d_output.devicePtr
            },{
            type: "DevicePtr",
            value: d_invViewMatrix.devicePtr
        },{
            type: "Uint32",
            value: imageWidth
        },{
            type: "Uint32",
            value: imageHeight
        },{
            type: "Float32",
            value: density
        },{
            type: "Float32",
            value: brightness
        },{
            type: "Float32",
            value: transferOffset
        },{
            type: "Float32",
            value: transferScale
        }
        ]);
}
else{
    var cuFunction = cuModule.getFunction("render_kernel_MRI");

    //cuLaunchKernel
    var time = new Date().getTime();
    var error = cu.launch(cuFunction, [32, 32, 1], [16, 16, 1],
        [
            {
                type: "DevicePtr",
                value: d_output.devicePtr
            },{
            type: "DevicePtr",
            value: d_invViewMatrix.devicePtr
        },{
            type: "Uint32",
            value: imageWidth
        },{
            type: "Uint32",
            value: imageHeight
        },{
            type: "Float32",
            value: density
        },{
            type: "Float32",
            value: brightness
        },{
            type: "Float32",
            value: transferOffset
        },{
            type: "Float32",
            value: transferScale
        }
        ]);
}
// cuMemcpyDtoH
var d_outputBuffer = new Buffer(imageWidth*imageHeight*4);
d_output.copyDtoH(d_outputBuffer, false);
cuCtx.synchronize(function(error) {
    d_output.free();
    d_invViewMatrix.free();
    cuCtx.destroy();
});

module.exports = vrcs_cuda;
