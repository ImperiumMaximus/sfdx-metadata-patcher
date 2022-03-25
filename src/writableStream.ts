import * as stream from 'stream';

export class WritableMemoryStream extends stream.Writable {

    private memStore: Buffer;
    private encoding: BufferEncoding;

    public constructor(encoding: BufferEncoding) {
        super();
        this.encoding = this.encoding;
        this.memStore = Buffer.from('', encoding);
    }

    public _write(chunk: string | Buffer, encoding?: BufferEncoding, cb?: (error: Error | null | undefined) => void): boolean {
        try {
            const buffer = (Buffer.isBuffer(chunk)) ?
                chunk :
                Buffer.from(chunk, encoding ? encoding : this.encoding);

            this.memStore = Buffer.concat([this.memStore, buffer]);
        } catch (e) {
            cb(e);
            return false;
        }
        cb(null);
        return true;
    }

    public toBuffer() {
        return this.memStore;
    }
}
