module.exports.name = 'vrcs_cuda';

var Buffer = require('buffer').Buffer;
var cu = require('./cuda');
var mat4 = require('./matrix_mat4');
var vec3 = require('./matrix_vec3');
var sys = require('sys');
var rendering_cuda = {
    default : 0,
    mip : 1,
    mri : 2
};

var vrcs_cuda = {

    type : rendering_cuda.default,

    cuCtx : undefined,
    cuModulePath : '/home/russa/git/vrcs/web/vrcs/cuda/vrcs.ptx',
    cuModule : undefined,

    options : {
        imageWidth : 512,
        imageHeight : 512,
        density : 0.05,
        brightness : 1.0,
        transferOffset : 0.0,
        transferScale : 1.0
    },

    textureFilePath : '[2014-11-27 20:00:00]_head1.den',

    d_output : undefined,
    d_invViewMatrix : undefined,
    d_outputBuffer : undefined,

    init : function(){
        this.cuCtx = new cu.Ctx(0, cu.Device(0));
        this.cuModule = cu.moduleLoad(this.cuModulePath);
        // ~ VolumeLoad & VolumeTexture & TextureBinding
        var error = this.cuModule.memTextureAlloc(this.textureFilePath, 256*256*225);
        //console.log('_cuModule.memTextureAlloc', error);
    },

    start : function(){

        var _opt = this.options;

        // ~ 3D volume array
        this.d_output = cu.memAlloc(_opt.imageWidth * _opt.imageHeight * 4);
        var error = this.d_output.memSet(_opt.imageWidth * _opt.imageHeight * 4);
        //console.log('d_output.memSet', error);

        // ~ View Vector
        this.makeViewVector();

        // ~ rendering
        this.render();

    },

    makeViewVector : function(){
        var vec;
        var model_matrix = mat4.create();

        vec = vec3.fromValues(-1.0, 0.0, 0.0);
        mat4.rotate(model_matrix, model_matrix, ((270.0) * 3.14159265 / 180.0), vec);

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

        this.d_invViewMatrix = cu.memAlloc(12*4);
        var error = this.d_invViewMatrix.copyHtoD(c_invViewMatrix);
        //console.log('d_invViewMatrix.copyHtoD', error);
    },

    render : function(){
        var _opt = this.options;
        var _cuModule = this.cuModule;

        // ~ Rendering
        var cuFunction = undefined;
        if(this.type == rendering_cuda.default){
            cuFunction = _cuModule.getFunction("render_kernel_volume");
        }else if(this.type == rendering_cuda.mip){
            cuFunction = _cuModule.getFunction("render_kernel_MIP");
        }else if(this.type == rendering_cuda.mri){
            cuFunction = _cuModule.getFunction("render_kernel_MRI");
        }else{
            console.log('type not exist');
            // ~ do default
            cuFunction = _cuModule.getFunction("render_kernel_volume");
        }

        //cuLaunchKernel
        var error = cu.launch(
            cuFunction, [32, 32, 1], [16, 16, 1],
            [
                {
                    type: "DevicePtr",
                    value: this.d_output.devicePtr
                },{
                type: "DevicePtr",
                value: this.d_invViewMatrix.devicePtr
            },{
                type: "Uint32",
                value: _opt.imageWidth
            },{
                type: "Uint32",
                value: _opt.imageHeight
            },{
                type: "Float32",
                value: _opt.density
            },{
                type: "Float32",
                value: _opt.brightness
            },{
                type: "Float32",
                value: _opt.transferOffset
            },{
                type: "Float32",
                value: _opt.transferScale
            }
            ]
        );
        //console.log('cu.launch', error);

        // cuMemcpyDtoH
        this.d_outputBuffer = new Buffer(_opt.imageWidth * _opt.imageHeight * 4);
        this.d_output.copyDtoH(this.d_outputBuffer, false);
    },

    end : function(){
        this.d_output.free();
        this.d_invViewMatrix.free();
    },

    finish : function(){
        var _cuCtx = this.cuCtx;
        _cuCtx.synchronize(function(error) {
            _cuCtx.destroy();
            //console.log('cuCtx.synchronize', error);
        });
    }
};


module.exports = vrcs_cuda;
module.exports.type = rendering_cuda;