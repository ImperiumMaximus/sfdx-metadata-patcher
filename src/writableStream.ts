import * as stream from 'node:stream'

export class WritableMemoryStream extends stream.Writable {

    private memStore: Buffer;
    private encoding: BufferEncoding;

    public constructor(encoding: BufferEncoding) {
        super();
        this.encoding = encoding;
        this.memStore = Buffer.from('', encoding);
    }

    public _write(chunk, encoding?: BufferEncoding, cb?: (error: Error | null) => void): boolean {
        try {
            const buffer = (Buffer.isBuffer(chunk)) ?
                chunk :
                Buffer.from(chunk as string, encoding ? encoding : this.encoding);

            this.memStore = Buffer.concat([this.memStore, buffer]);
        } catch (e) {
            if (cb) {
              cb(e as Error);
            }
            return false;
        }
        if (cb) {
          cb(null);
        }
        return true;
    }

    public toBuffer(): Buffer {
        return this.memStore;
    }
}
