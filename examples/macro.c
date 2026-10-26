#include <stdio.h>
#define BAD_SQR(x) x*x
#define SQR(x) ((x)*(x))
int main(void) {
    printf("%d %d %d\n", BAD_SQR(1+2), SQR(1+2), BAD_SQR(2+3));
    return 0;
}
