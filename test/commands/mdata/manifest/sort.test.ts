import * as fs from 'node:fs'
import { expect } from 'chai';
import { TestContext } from '@salesforce/core/lib/testSetup';
import { stubMethod } from '@salesforce/ts-sinon';
import * as xml2js from 'xml2js';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { parseXml } from '../../../../src/xmlUtility';
import ManifestSort from '../../../../src/commands/mdata/manifest/sort';


// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

describe('manifest:sort', () => {
    const $$ = new TestContext();
    let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;

    let writeFileSyncStub: sinon.SinonStub;
    const commonStubs = function () {
        const fsExistsSync = stubMethod($$.SANDBOX, fs, 'existsSync');

        fsExistsSync.callsFake((filePath: string) => {
            if (filePath === 'manifest/package.xml' || filePath === 'manifest/package_bad.xml') return true;
            return fsExistsSync.wrappedMethod.call(this, filePath) as boolean;
        });

        const readFileSyncStub = stubMethod($$.SANDBOX, fs, 'readFileSync')

        readFileSyncStub.callsFake((path: string) => {
            if (path.includes('package.xml')) {
                return readFileSyncStub.wrappedMethod.call(this, __dirname + '/../../../data/manifest/package.xml') as string;
            } else if (path.includes('package_bad.xml')) {
                return '<xml nbfi3wbgqwbfo></fifbwqfb>';
            }
            return (readFileSyncStub.wrappedMethod.call(this, path) as object).toString();
        })

        writeFileSyncStub = stubMethod($$.SANDBOX, fs, 'writeFileSync');
    }

    beforeEach(() => {
        sfCommandStubs = stubSfCommandUx($$.SANDBOX);
        commonStubs();
    });

    afterEach(() => {
        $$.restore();
    })

    it('sorts alphabetically the components of a manifest file', async () => {
        await ManifestSort.run(['-x', 'manifest/package.xml']);
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

    it('generates an error if the manifest file is not found', async () => {
        await ManifestSort.run(['-x', 'manifest/package_notfound.xml']);
        const output = sfCommandStubs.logToStderr
        .getCalls()
        .flatMap((c) => c.args)
        .join('\n');
        expect(output).to.include(messages.getMessage('manifest.sort.errors.noInputFileFound'));
    });

    it('generates an error if the manifest file is malformed', async () => {
        await ManifestSort.run(['-x', 'manifest/package_bad.xml']);
        const output = sfCommandStubs.logToStderr
        .getCalls()
        .flatMap((c) => c.args)
        .join('\n');
        expect(output).to.include(messages.getMessage('manifest.sort.errors.badXml', ['']).replace('%s', ''));
    });

    it('sorts alphabetically the components of a manifest file and outputs the result as a JSON', async () => {
        const output = await ManifestSort.run(['-x', 'manifest/package.xml', '--json']);
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
        expect(output).to.deep.equal(expectedJson);
    });
});
