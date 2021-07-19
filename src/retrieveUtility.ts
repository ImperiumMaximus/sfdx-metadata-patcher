
import { Messages } from '@salesforce/core';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { once } from 'events';
import * as fs from 'fs';
import * as JSZip from 'jszip';
import * as path from 'path';
import * as tmp from 'tmp';
import { Mdata } from './mdata';
import { sleep } from './miscUtility';
import { LoggerLevel } from './typeDefs';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export async function retrieveMetadataButKeepSubset(username: string, componentSet: ComponentSet, metadataType: string, metadataFolderName: string, outDir: string, metadata?: string): Promise<string[]> {
    let encodedMetadata: string[];
    if (metadata) {
        encodedMetadata = metadata.split(',').map((p: string) => encodeURI(p));
        metadata.split(',').filter((p: string) => !(componentSet.has({ fullName: p, type: metadataType }) || componentSet.has({ fullName: encodeURI(p), type: metadataType }))).forEach((p: string) => componentSet.add({ fullName: encodeURI(p), type: metadataType }));
    }

    const tmpDir = tmp.dirSync({ postfix: `_${new Date().getTime().toString()}` });

    const retrieveResult = await componentSet.retrieve({
        usernameOrConnection: username,
        output: tmpDir.name
    });

    let retrieveResultStatus = await retrieveResult.checkStatus();

    Mdata.log(messages.getMessage('utility.retrieve.info.retrieveJobId', [retrieveResultStatus.id]), LoggerLevel.INFO);

    while (!retrieveResultStatus.done) {
        sleep(2);
        retrieveResultStatus = await retrieveResult.checkStatus();
        Mdata.log(messages.getMessage('utility.retrieve.info.retrieveStatus', [retrieveResultStatus.status]), LoggerLevel.INFO);
    }

    const metadataZip = await JSZip.loadAsync(Buffer.from(retrieveResultStatus.zipFile, 'base64'));

    const fileProperties = Array.isArray(retrieveResultStatus.fileProperties) ? retrieveResultStatus.fileProperties : [retrieveResultStatus.fileProperties];

    const metadataFiles = fileProperties.filter(p => p.type === metadataType && (Object.keys(metadataZip.files).includes(p.fileName) || Object.keys(metadataZip.files).includes(decodeURI(p.fileName))
        && (encodedMetadata ? (encodedMetadata.includes(p.fullName) || encodedMetadata.includes(decodeURI(p.fullName))) : true))).map(p => p.fileName);

    return Promise.all(metadataFiles.map(async f => {
        const finalPath = path.join(outDir, metadataFolderName, `${path.basename(f)}-meta.xml`);
        Mdata.log(messages.getMessage('utility.retrieve.info.writingFile', [finalPath]), LoggerLevel.INFO);
        const writeStream = fs.createWriteStream(finalPath, { encoding: 'utf-8' });
        metadataZip.files[f].nodeStream().pipe(writeStream);
        await once(writeStream, 'finish');
        writeStream.close();
        return Promise.resolve(`${path.basename(f)}-meta.xml`);
    }));
}
