export const msleep = (n: number): void => {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
};

export const sleep = (n: number): void => {
    msleep(n * 1000);
};
