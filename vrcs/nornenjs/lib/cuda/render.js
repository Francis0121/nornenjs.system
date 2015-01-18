var ENUMS = require('../enums');
var Buffer = require('buffer').Buffer;
var cuda = require('./load');
var logger = require('../logger');
var mat4 = require('./../matrix/mat4');
var vec3 = require('./../matrix/vec3');

function CudaRender(
    cuCtx, textureFilePath, pthFilePath,
    volumeWidth, volumeHeight, volumeDepth) {

    this.cuCtx = cuCtx;
    this.cuModule = null;
    this.type = ENUMS.RENDERING_TYPE.VOLUME;
    this.textureFilePath = textureFilePath;
    this.ptxFilePath = ptxFilePath,
    this.volumeWidth = volumeWidth;
    this.volumeHeight = volumeHeight;
    this.volumeDepth = volumeDepth;

    this.imageWidth = 512;
    this.imageHeight = 512, 
    this.density = 0.05;
    this.brightness = 1.0;
    this.transferOffset = 0.0;
    this.transferScaleX = 0.0;
    this.transferScaleY = 0.0;
    this.transferScaleZ = 0.0;
    this.positionZ = 3.0;
    this.rotationX = 0;
    this.rotationY = 0;
    this.mriType = ENUMS.MRI_TYPE.X;

    this.deviceOutputBuffer = undefined;
    this.deviceInvViewMatrix = undefined;
    this.hostOutputBuffer = undefined;
}

CudaRender.prototype.exec = function(){
    // ~ VolumeLoad & VolumeTexture & TextureBinding
    this.cuModule = cuda.moduleLoad(this.ptxFilePath);
    logger.error('[CUDA] _cuModule.memTextureAlloc ',
        this.cuModule.memTextureAlloc(this.textureFilePath, this.volumeWidth, this.volumeHeight, this.volumeDepth));
};

CudaRender.prototype.start = function(){

    // ~ 3D volume array
    this.deviceOutputBuffer = cuda.memAlloc(this.imageWidth * this.imageHeight * 4);
    logger.error('[CUDA] deviceOutputBuffer.memSet ',
        this.deviceOutputBuffer.memSet(this.imageWidth * this.imageHeight * 4));

    // ~ View Vector
    this.makeViewVector();

    // ~ rendering
    this.render();

};

CudaRender.prototype.makeViewVector = function(){
    var vec;
    var modelMatrix = mat4.create();
    if(this.type === ENUMS.RENDERING_TYPE.MRI ) {
        
        if (this.mriType === ENUMS.MRI_TYPE.X) {

            vec = vec3.fromValues(-1.0, 0.0, 0.0);
            mat4.rotate(modelMatrix, modelMatrix, ( (270.0) * 3.14159265 / 180.0), vec);

            vec = vec3.fromValues(0.0, 1.0, 0.0);
            mat4.rotate(modelMatrix, modelMatrix, ( (- 90) * 3.14159265 / 180.0), vec);

            vec = vec3.fromValues(0.0, 0.0, this.positionZ);
            mat4.translate(modelMatrix, modelMatrix, vec)
            
        }else if(this.mriType === ENUMS.MRI_TYPE.Y){
            
            vec = vec3.fromValues(-1.0, 0.0, 0.0);
            mat4.rotate(modelMatrix, modelMatrix, ( (270.0 ) * 3.14159265 / 180.0), vec);

            vec = vec3.fromValues(0.0, 1.0, 0.0);
            mat4.rotate(modelMatrix, modelMatrix, ( (0.0 ) * 3.14159265 / 180.0), vec);

            vec = vec3.fromValues(0.0, 0.0, this.positionZ);
            mat4.translate(modelMatrix, modelMatrix, vec)
            
        }else if(this.mriType == ENUMS.MRI_TYPE.Z) {

            vec = vec3.fromValues(-1.0, 0.0, 0.0);
            mat4.rotate(modelMatrix, modelMatrix, ( (180 ) * 3.14159265 / 180.0), vec);

            vec = vec3.fromValues(0.0, 1.0, 0.0);
            mat4.rotate(modelMatrix, modelMatrix, ( (0.0 ) * 3.14159265 / 180.0), vec);

            vec = vec3.fromValues(0.0, 0.0, this.positionZ);
            mat4.translate(modelMatrix, modelMatrix, vec)
        }else{
            
            logger.warn('[CUDA] Mri type not exist');

            vec = vec3.fromValues(-1.0, 0.0, 0.0);
            mat4.rotate(modelMatrix, modelMatrix, ( (270.0) * 3.14159265 / 180.0), vec);

            vec = vec3.fromValues(0.0, 1.0, 0.0);
            mat4.rotate(modelMatrix, modelMatrix, ( (- 90) * 3.14159265 / 180.0), vec);

            vec = vec3.fromValues(0.0, 0.0, this.positionZ);
            mat4.translate(modelMatrix, modelMatrix, vec)
            
        }
            
    } else {
      
        vec = vec3.fromValues(-1.0, 0.0, 0.0);
        mat4.rotate(modelMatrix, modelMatrix, ( (270.0 + (this.rotationY * -1)) * 3.14159265 / 180.0), vec);

        vec = vec3.fromValues(0.0, 1.0, 0.0);
        mat4.rotate(modelMatrix, modelMatrix,( (0.0 + (this.rotationX*-1)) * 3.14159265 / 180.0), vec);

        vec = vec3.fromValues(0.0, 0.0, this.positionZ);
        mat4.translate(modelMatrix, modelMatrix,vec);
        
    }
    
    /*view vector*/
    var hostInvViewMatrix = new Buffer(12*4);
    hostInvViewMatrix.writeFloatLE( modelMatrix[0], 0*4);
    hostInvViewMatrix.writeFloatLE( modelMatrix[4], 1*4);
    hostInvViewMatrix.writeFloatLE( modelMatrix[8], 2*4);
    hostInvViewMatrix.writeFloatLE( modelMatrix[12], 3*4);
    hostInvViewMatrix.writeFloatLE( modelMatrix[1], 4*4);
    hostInvViewMatrix.writeFloatLE( modelMatrix[5], 5*4);
    hostInvViewMatrix.writeFloatLE( modelMatrix[9], 6*4);
    hostInvViewMatrix.writeFloatLE( modelMatrix[13], 7*4);
    hostInvViewMatrix.writeFloatLE( modelMatrix[2], 8*4);
    hostInvViewMatrix.writeFloatLE( modelMatrix[6], 9*4);
    hostInvViewMatrix.writeFloatLE( modelMatrix[10], 10*4);
    hostInvViewMatrix.writeFloatLE( modelMatrix[14], 11*4);

    this.deviceInvViewMatrix = cuda.memAlloc(12*4);
    logger.error('[CUDA] deviceInvViewMatrix.copyHtoD ', this.deviceInvViewMatrix.copyHtoD(hostInvViewMatrix));
};

CudaRender.prototype.render = function(){
    var _cuModule = this.cuModule;

    var cuFunction = undefined;
    if(this.type == this.RENDERING_CUDA_TYPE.VOL){
        cuFunction = _cuModule.getFunction('render_kernel_volume');
    }else if(this.type == this.RENDERING_CUDA_TYPE.MIP){
        cuFunction = _cuModule.getFunction('render_kernel_MIP');
    }else if(this.type == this.RENDERING_CUDA_TYPE.MRI){
        cuFunction = _cuModule.getFunction('render_kernel_MRI');
    }else{
        logger.warn('[CUDA] Rendering type not exist');
        cuFunction = _cuModule.getFunction('render_kernel_volume');
    }
    logger.error('[CUDA] cuFunction ', cuFunction);
    
    var error = cuda.launch(
        cuFunction, [32, 32, 1], [16, 16, 1],
        [
            {
                type: 'DevicePtr',
                value: this.deviceOutputBuffer.devicePtr
            },{
            type: 'DevicePtr',
            value: this.deviceInvViewMatrix.devicePtr
        },{
            type: 'Uint32',
            value: this.imageWidth
        },{
            type: 'Uint32',
            value: this.imageHeight
        },{
            type: 'Float32',
            value: this.density
        },{
            type: 'Float32',
            value: this.brightness
        },{
            type: 'Float32',
            value: this.transferOffset
        },{
            type: 'Float32',
            value: this.transferScaleX
        },{
            type: 'Float32',
            value: this.transferScaleY
        },{
            type: 'Float32',
            value: this.transferScaleZ
        }
        ]
    );
    logger.error('[CUDA] cu.launch ', error);

    this.hostOutputBuffer = new Buffer(this.imageWidth * this.imageHeight * 4);
    this.deviceOutputBuffer.copyDtoH(this.hostOutputBuffer, false);
};

CudaRender.prototype.end = function(){
    this.deviceOutputBuffer.free();
    this.deviceInvViewMatrix.free();
};

exports.CudaRender = CudaRender;
