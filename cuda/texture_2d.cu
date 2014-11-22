#include <stdio.h>
#include <stdlib.h>

__global__ void MatrixMul( int*M, int*N, int*P, int Width)
{
	int tid, tx, ty;
	tx = blockDim.x*blockIdx.x + threadIdx.x;
	ty = blockDim.y*blockIdx.y + threadIdx.y;
	tid = Width*ty + tx;

	int Value = 0;
	int MVal = 0;
	int NVal = 0;

	for (int i = 0; i < Width; i++)
	{
		MVal = M[ty * Width + i];
		NVal = N[i * Width + tx];
		Value += MVal * NVal;
	}

	P[tid] = Value;
}

extern "C"
int* kernel(int *M, int *N,int BufferSize)
{
	int *P_cuda;

	P_cuda = (int*)malloc(BufferSize);
	//P_cuda = new int[BufferSize/sizeof(int)];
	memset((void*)P_cuda, 0, BufferSize);
	int *dev_M;
	int *dev_N;	
	int *dev_P;	
	
	cudaMalloc((void**)&dev_M, BufferSize);
	cudaMalloc((void**)&dev_N, BufferSize);
	cudaMalloc((void**)&dev_P, BufferSize);

	cudaMemcpy(dev_M, M, BufferSize, cudaMemcpyHostToDevice);
	cudaMemcpy(dev_N, N, BufferSize, cudaMemcpyHostToDevice);

	dim3 Dg(3, 4, 1);
	dim3 Db(4, 3, 1);
    MatrixMul<<<Dg,Db>>>(dev_M, dev_N, dev_P, 12);
	
	cudaMemcpy(P_cuda, dev_P, BufferSize, cudaMemcpyDeviceToHost);

	cudaFree(dev_M);
	cudaFree(dev_N);
	cudaFree(dev_P);

	return P_cuda;
}

