import { AnyJson } from '@salesforce/ts-types';
import * as fs from 'fs';
import * as xml2js from 'xml2js';

export async function writeXml(xmlFile: string, obj: unknown): Promise < void> {
    const builder = new xml2js.Builder({
        renderOpts: {
            pretty: true,
            indent: '    ',
            newline: '\n'
        },
        xmldec: {
            encoding: 'UTF-8'
        }
    });
    fs.writeFileSync(xmlFile, builder.buildObject(obj));
}

export async function parseXml(xmlFile: string): Promise < AnyJson > {
    return new Promise((resolve, reject) => {
        const parser = new xml2js.Parser({ explicitArray: true });
        const data = fs.readFileSync(xmlFile);
        parser.parseString(data, (err, result) => {
            if (err) {
                reject(err);
            }
            resolve(result);
        });
    });
}
