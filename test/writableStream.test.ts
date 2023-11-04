import { expect } from 'chai';
import { WritableMemoryStream } from '../src/writableStream';


describe('writableStream', () => {
    it('creates an empty buffer', () => {
        const memWritable = new WritableMemoryStream('utf8');
        expect(memWritable.toBuffer()).deep.equal(Buffer.from('', 'utf8'));
    });

    it('writes to the buffer', () => {
        const memWritable = new WritableMemoryStream('utf8');
        expect(memWritable.write('Hello World')).to.be.true;
        expect(memWritable.toBuffer()).deep.equal(Buffer.from('Hello World', 'utf8'));
    })
    
    it('concatenates the buffer when multiple writes are issued', () => {
        const memWritable = new WritableMemoryStream('utf8');
        expect(memWritable.write('Hello World')).to.be.true;
        expect(memWritable.write('!\n')).to.be.true;
        expect(memWritable.toBuffer()).deep.equal(Buffer.from('Hello World!\n', 'utf8'));
    })
})
