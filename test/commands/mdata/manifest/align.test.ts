import { expect, test } from '@salesforce/command/lib/test';
import { testSetup } from '@salesforce/core/lib/testSetup';
import { ComponentSet, FromSourceOptions } from '@salesforce/source-deploy-retrieve';
import { stubMethod } from '@salesforce/ts-sinon';
import * as fs from 'fs';
import { SfdxProject } from '@salesforce/core';
import { Messages } from '@salesforce/core';
import { before } from 'mocha';
import { parseXml } from '../../../../src/xmlUtility';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
//const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

const $$ = testSetup();

describe('manifest:align', () => {
    let writeFileSyncStub;
    let testPackageXml;
    const commonStubs = function () {
        /*const fsExistsSync = stubMethod($$.SANDBOX, fs, 'existsSync');

        fsExistsSync.callsFake((filePath: string) => {
            if (filePath === 'manifest/package.xml' || filePath === 'manifest/package_bad.xml') return true;
            return fsExistsSync.wrappedMethod.call(this, filePath);
        });*/

        /*const readFileSyncStub = stubMethod($$.SANDBOX, fs, 'readFileSync')

        readFileSyncStub.callsFake((path: string) => {
            if (path.includes('package.xml')) {
                return readFileSyncStub.wrappedMethod.call(this, __dirname + '/../../../data/manifest/package.xml');
            } else if (path.includes('package_bad.xml')) {
                return "<xml nbfi3wbgqwbfo></fifbwqfb>";
            }
            return readFileSyncStub.wrappedMethod.call(this, path).toString();
        })*/
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'getDefaultPackage').callsFake(() => {
            return [{
                "fullPath": "force-app/",
                "name": "force-app"
            }]
        });


        stubMethod($$.SANDBOX, ComponentSet, 'fromSource').callsFake((options: FromSourceOptions) => {
            return new ComponentSet();
        });

        stubMethod($$.SANDBOX, ComponentSet.prototype, 'getPackageXml').callsFake(() => {
            return testPackageXml;
        });

        writeFileSyncStub = stubMethod($$.SANDBOX, fs, 'writeFileSync');
    }

    before(() => {
        testPackageXml = fs.readFileSync(__dirname + '/../../../data/manifest/package.xml').toString();
    });

    beforeEach(() => {
        commonStubs();
    });

    test
    .command(['mdata:manifest:align'])
    .it('aligns the manifest to what is present in project\' source directory', () => {
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][0]).to.equal('manifest/package.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][1]).to.equal(testPackageXml);
    });

    test
    .command(['mdata:manifest:align', '-p', 'source1,source2'])
    .it('aligns the manifest to what is present in the list of source directories', () => {
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][0]).to.equal('manifest/package.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][1]).to.equal(testPackageXml);
    });

    test
    .command(['mdata:manifest:align', '-p', 'source1,source2', '-r', 'root1'])
    .it('aligns the manifest to what is present in the list of source directories & rootdir', () => {
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][0]).to.equal('manifest/package.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][1]).to.equal(testPackageXml);
    });

    test
    .command(['mdata:manifest:align', '-m', 'ApexClass'])
    .it('aligns the manifest to what is present in project\' source directory considering a subset of metadata', () => {
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][0]).to.equal('manifest/package.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][1]).to.equal(testPackageXml);
    });

    test
    .stdout()
    .command(['mdata:manifest:align', '--json'])
    .it('aligns the manifest to what is present in project\' source directory outputting the result in JSON format', async (ctx) => {
        const expectedJson = await parseXml(__dirname + '/../../../data/manifest/package.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][0]).to.equal('manifest/package.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][1]).to.equal(testPackageXml);
        expect(JSON.parse(ctx.stdout).result).to.deep.equal(expectedJson);
    });
});