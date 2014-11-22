#include<stdio.h>
#include<stdlib.h>

extern "C" int* kernel(int *M, int *N,int BufferSize);

int *MatrixMulC( int*M, int*N, int*P, int Width)
{
	int col = 0;
	int raw = 0;
	int index = 0;
	int Destindex = 0;
	for( col = 0; col < Width; col++){
		for( raw = 0; raw < Width; raw++){
			Destindex = col*Width+raw;
			for( index = 0; index < Width; index++)
			{
				P[Destindex] += M[col*Width+index]*N[index*Width+raw];
			}
		}
	}
	return P;
}

void printMatrix(int *mul,int MatrixWidth, int MatrixHeight ){
	
	for(int i=0; i<MatrixWidth; i++){
		for(int j=0; j<MatrixHeight; j++)
			printf("%4d ", mul[i*MatrixHeight+j]);
		printf("\n");
	}
	printf("\n");
}

int main()
{
	const int MatrixWidth = 12;
	const int MatrixHeight = 12;
	const int MatrixSize = MatrixWidth*MatrixHeight;
	const int BufferSize = MatrixSize*sizeof(int);

	int* M;
	int* N;
	int* P_cuda;
	int* P_C;

	M = (int*)malloc(BufferSize);
	N = (int*)malloc(BufferSize);
	P_cuda = (int*)malloc(BufferSize);
	P_C = (int*)malloc(BufferSize);

	int i = 0;

	for( int i = 0; i < MatrixSize; i++){
		M[i] = 1;
		N[i] = 2;
		P_cuda[i] = 0;
		P_C[i] = 0;
	}

	printMatrix(M,MatrixWidth,MatrixHeight);
	printMatrix(N,MatrixWidth,MatrixHeight);
	
	P_cuda = kernel(M, N, BufferSize);
	printMatrix(P_cuda,MatrixWidth,MatrixHeight);

	P_C = MatrixMulC(M, N, P_C, 12);
	printMatrix(P_C,MatrixWidth,MatrixHeight);

	
	bool ResultFlag = true;
	for( i = 0; i < MatrixSize; i++)
	{
		//printf(" Result[%d] : %d, %d\n",i,P_cuda[i],P_C[i]);
		if( P_cuda[i]!= P_C[i]) ResultFlag = false;
	}
	if( ResultFlag == true) printf(" MatrixMul Result OK!\n");
	else printf(" MatrixMul Result Error!\n");


	free(M);
	free(N);
	free(P_cuda);
	free(P_C);

	return 0;
}