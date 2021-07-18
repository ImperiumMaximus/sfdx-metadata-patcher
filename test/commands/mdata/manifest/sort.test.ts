import { expect, test } from '@salesforce/command/lib/test';
import { testSetup } from '@salesforce/core/lib/testSetup';
import { stubMethod } from '@salesforce/ts-sinon';
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import { Messages } from '@salesforce/core';
import { parseXml } from '../../../../src/xmlUtility';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

const $$ = testSetup();

describe('manifest:sort', () => {

    let writeFileSyncStub;
    const commonStubs = function () {
        const fsExistsSync = stubMethod($$.SANDBOX, fs, 'existsSync');

        fsExistsSync.callsFake((filePath: string) => {
            if (filePath === 'manifest/package.xml' || filePath === 'manifest/package_bad.xml') return true;
            return fsExistsSync.wrappedMethod.call(this, filePath);
        });

        const readFileSyncStub = stubMethod($$.SANDBOX, fs, 'readFileSync')

        readFileSyncStub.callsFake((path: string) => {
            if (path.includes('package.xml')) {
                return readFileSyncStub.wrappedMethod.call(this, __dirname + '/../../../data/manifest/package.xml');
            } else if (path.includes('package_bad.xml')) {
                return "<xml nbfi3wbgqwbfo></fifbwqfb>";
            }
            return readFileSyncStub.wrappedMethod.call(this, path).toString();
        })

        writeFileSyncStub = stubMethod($$.SANDBOX, fs, 'writeFileSync');
    }

    test
    .do(() => {
        commonStubs();
    })
    .command(['mdata:manifest:sort', '-x', 'manifest/package.xml'])
    .it('sorts alphabetically the components of a manifest file', async () => {
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][0]).to.equal('manifest/package.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][1]).to.equal(new xml2js.Builder({
            renderOpts: {
                pretty: true,
                indent: '    ',
                newline: '\n'
            },
            xmldec: {
                encoding: 'UTF-8',
                version: '1.0'
            }
        }).buildObject(await parseXml(__dirname + '/../../../data/manifest/package_sorted.xml')));
    });

    test
    .do(() => {
        commonStubs();
    })
    .stdout()
    .command(['mdata:manifest:sort', '-x', 'manifest/package_notfound.xml'])
    .it('generates an error if the manifest file is not found', (ctx) => {
        expect(ctx.stdout).to.include(messages.getMessage('manifest.sort.errors.noInputFileFound'));
    });

    test
    .do(() => {
        commonStubs();
    })
    .stdout()
    .command(['mdata:manifest:sort', '-x', 'manifest/package_bad.xml'])
    .it('generates an error if the manifest file is malformed', (ctx) => {
        expect(ctx.stdout).to.include(messages.getMessage('manifest.sort.errors.badXml').replace('%s', ''));
    });

    test
    .do(() => {
        commonStubs();
    })
    .stdout()
    .command(['mdata:manifest:sort', '-x', 'manifest/package.xml', '--json'])
    .it('sorts alphabetically the components of a manifest file and outputs the result as a JSON', async (ctx) => {
        const expectedJson = await parseXml(__dirname + '/../../../data/manifest/package_sorted.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][0]).to.equal('manifest/package.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][1]).to.equal(new xml2js.Builder({
            renderOpts: {
                pretty: true,
                indent: '    ',
                newline: '\n'
            },
            xmldec: {
                encoding: 'UTF-8',
                version: '1.0'
            }
        }).buildObject(expectedJson));
        expect(JSON.parse(ctx.stdout).result).to.deep.equal(expectedJson);
    });
});