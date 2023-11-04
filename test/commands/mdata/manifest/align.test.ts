import * as fs from 'node:fs'
import { expect } from 'chai';
import { TestContext } from '@salesforce/core/lib/testSetup';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { stubMethod } from '@salesforce/ts-sinon';
import { SfProject } from '@salesforce/core';
import { Messages } from '@salesforce/core';
import { before } from 'mocha';
import { AnyJson } from '@salesforce/ts-types';
import { parseXml } from '../../../../src/xmlUtility';
import ManifestAlign from '../../../../src/commands/mdata/manifest/align';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
// const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

describe('manifest:align', () => {
    const $$ = new TestContext();
    
    let writeFileSyncStub: sinon.SinonStub;
    let testPackageXml: AnyJson;
    const commonStubs = function () {
        stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'getDefaultPackage').callsFake(() => [{
                'fullPath': 'force-app/',
                'name': 'force-app'
            }]);


        stubMethod($$.SANDBOX, ComponentSet, 'fromSource').callsFake(() => new ComponentSet());

        stubMethod($$.SANDBOX, ComponentSet.prototype, 'getPackageXml').callsFake(() => testPackageXml);

        writeFileSyncStub = stubMethod($$.SANDBOX, fs, 'writeFileSync');
    }

    beforeEach(() => {
        commonStubs();
    });

    afterEach(() => {
        $$.restore();
    })

    before(() => {
        testPackageXml = fs.readFileSync(__dirname + '/../../../data/manifest/package.xml').toString();
    });

    it('aligns the manifest to what is present in project\' source directory', async () => {
        await ManifestAlign.run([]);
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][0]).to.equal('manifest/package.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][1]).to.equal(testPackageXml);
    });

    it('aligns the manifest to what is present in the list of source directories', async () => {
        await ManifestAlign.run(['-p', 'source1,source2']);
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][0]).to.equal('manifest/package.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][1]).to.equal(testPackageXml);
    });

    it('aligns the manifest to what is present in the list of source directories & rootdir', async () => {
        await ManifestAlign.run(['-p', 'source1,source2', '-r', 'root1']);
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][0]).to.equal('manifest/package.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][1]).to.equal(testPackageXml);
    });

    it('aligns the manifest to what is present in project\' source directory considering a subset of metadata', async () => {
        await ManifestAlign.run(['-m', 'ApexClass']);
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][0]).to.equal('manifest/package.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][1]).to.equal(testPackageXml);
    });

    it('aligns the manifest to what is present in project\' source directory outputting the result in JSON format', async () => {
        const expectedJson = await parseXml(__dirname + '/../../../data/manifest/package.xml');
        const output = await ManifestAlign.run(['--json']);
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][0]).to.equal('manifest/package.xml');
        expect(writeFileSyncStub.args[writeFileSyncStub.args.length - 1][1]).to.equal(testPackageXml);
        expect(output).to.deep.equal(expectedJson);
    });
});
