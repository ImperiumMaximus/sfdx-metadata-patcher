import * as fs from 'node:fs'
import { JsonMap } from '@salesforce/ts-types';
import * as xml2js from 'xml2js';

export const writeXml = (xmlFile: string, obj: unknown): void => {
    const builder = new xml2js.Builder({
        renderOpts: {
            pretty: true,
            indent: '    ',
            newline: '\n'
        },
        xmldec: {
            encoding: 'UTF-8',
            version: '1.0'
        }
    });
    fs.writeFileSync(xmlFile, builder.buildObject(obj));
};

export const parseXml = (xmlFile: string): Promise <JsonMap> => new Promise((resolve, reject) => {
    const parser = new xml2js.Parser({ explicitArray: true });
    const data = fs.readFileSync(xmlFile);
    parser.parseString(data, (err, result: JsonMap) => {
        if (err) {
            reject(err);
        }
        resolve(result);
    });
});

export const parseXmlFromStream = (stream: NodeJS.ReadableStream): Promise<JsonMap> => new Promise((resolve, reject) => {
    const parser = new xml2js.Parser({ explicitArray: true });
    const chunks: Buffer[] = [];

    new Promise((res, rej) => {
        /* eslint-disable @typescript-eslint/no-unsafe-argument */
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', err => rej(err));
        stream.on('end', () => res(Buffer.concat(chunks).toString('utf8')));
    }).then((data: string) => {
      parser.parseString(data, (err, result: JsonMap) => {
        if (err) {
            reject(err);
        }
        resolve(result);
    })
    }).catch(err => {
      reject(err);
    });
});
