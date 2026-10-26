#ifndef FEATURE
#define FEATURE 0
#endif
int feature_value(void) {
#if FEATURE
    return 10;
#else
    return 20;
#endif
}
