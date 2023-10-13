import { expect, test } from '@salesforce/command/lib/test';
import { WritableMemoryStream } from '../src/writableStream';


describe('writableStream', () => {
    test
        .it('creates an empty buffer', () => {
            const memWritable = new WritableMemoryStream('utf8');
            expect(memWritable.toBuffer()).deep.equal(Buffer.from('', 'utf8'));
        })

    test
        .it('writes to the buffer', () => {
            const memWritable = new WritableMemoryStream('utf8');
            expect(memWritable.write('Hello World')).to.be.true;
            expect(memWritable.toBuffer()).deep.equal(Buffer.from('Hello World', 'utf8'));
        })

    test
        .it('concatenates the buffer when multiple writes are issued', () => {
            const memWritable = new WritableMemoryStream('utf8');
            expect(memWritable.write('Hello World')).to.be.true;
            expect(memWritable.write('!\n')).to.be.true;
            expect(memWritable.toBuffer()).deep.equal(Buffer.from('Hello World!\n', 'utf8'));
        })
})
