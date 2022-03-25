import * as fs from 'fs';
import { AnyJson } from '@salesforce/ts-types';
import * as xml2js from 'xml2js';

export const writeXml = async (xmlFile: string, obj: unknown): Promise <void> => {
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

export const parseXml = async (xmlFile: string): Promise <AnyJson> => new Promise((resolve, reject) => {
    const parser = new xml2js.Parser({ explicitArray: true });
    const data = fs.readFileSync(xmlFile);
    parser.parseString(data, (err, result) => {
        if (err) {
            reject(err);
        }
        resolve(result);
    });
});
