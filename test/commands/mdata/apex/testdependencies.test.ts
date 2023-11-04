import * as fs from 'node:fs'
import * as path from 'node:path'
import { expect } from 'chai';
import { noCallThru } from 'proxyquire';
import { TestContext } from '@salesforce/core/lib/testSetup';
import { AnyJson } from '@salesforce/ts-types';
import { AuthInfo, Connection, Org, SfProject, SfProjectJson } from '@salesforce/core';
import { Tooling } from 'jsforce/lib/api/tooling';
import { Query } from 'jsforce/lib/query';
import { spyMethod, stubMethod } from '@salesforce/ts-sinon';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import * as glob from 'glob';
import * as prompts from 'prompts';
import * as Sinon from 'sinon';
import TestDependencies from '../../../../src/commands/mdata/apex/testdependencies';

const proxyquire = noCallThru();

describe('apex:testdependencies', () => {
    const $$ = new TestContext();
    let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;

    beforeEach(() => {
       sfCommandStubs = stubSfCommandUx($$.SANDBOX);
    });

    afterEach(() => {
        $$.restore();
    })

    describe('configure the plugin', () => {
        let sfdxProjectJsonSet: Sinon.SinonSpy;
        let sfdxProjectJsonWrite: Sinon.SinonSpy;
        let promptsStub: Sinon.SinonStub<prompts.PromptObject[], { strat: boolean | string } | undefined>;

        const commonStubs = function (pluginConfig: AnyJson) {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'getPackageDirectories').callsFake(() => [{ name: 'default', fullPath: 'my-dir' }]);
            const sfdxProjectResolve = stubMethod($$.SANDBOXES.PROJECT, SfProject, 'resolve').callsFake(async () => {
                const sfdxProject: Promise<SfProject> = sfdxProjectResolve.wrappedMethod.call(SfProject, path.join(__dirname, '..', '..', '..', 'data')) as Promise<SfProject>;
                if (pluginConfig) {
                    (await sfdxProject).getSfProjectJson().set('plugins', pluginConfig);
                }
                return sfdxProject;
            });

            sfdxProjectJsonSet = spyMethod($$.SANDBOXES.PROJECT, SfProjectJson.prototype, 'set');
            sfdxProjectJsonWrite = spyMethod($$.SANDBOXES.PROJECT, SfProjectJson.prototype, 'write');

            const globSync = stubMethod($$.SANDBOX, glob, 'sync').callsFake((filePath: string) => filePath.endsWith(`${path.sep}classes`) || filePath.endsWith(`${path.sep}lwc`) || filePath.includes(`objects${path.sep}**${path.sep}fields`) ? ['result'] : globSync.wrappedMethod.call(this, filePath) as string[]);

            promptsStub = Sinon.stub<prompts.PromptObject[], { strat: boolean | string } | undefined>().callsFake((questions: prompts.PromptObject) => {
                if (questions?.message?.toString().includes('"ApexClass" gets deleted?') || questions?.message?.toString().includes('"LightningComponentBundle" gets deleted?')) {
                    return { 'strat': false }
                } else if (questions?.message?.toString().includes('"ApexClass"')) {
                    return { 'strat': 'f' }
                } else if (questions?.message?.toString().includes('"LightningComponentBundle" appears in the Delta Deployment.')) {
                    return { 'strat': 's' }
                } else if (questions?.message?.toString().includes('"CustomField" appears in the Delta Deployment.')) {
                    return { 'strat': 'd' }
                } else if (questions?.message?.toString().includes('"CustomField" gets deleted?')) {
                    return { 'strat': true }
                } else if (questions?.message?.toString().includes('"CustomField" appears in the Destructive Changes Deployment.')) {
                    return { 'strat': 'f' }
                }
            });
        }

        
        it('runs mdata:apex:testdependencies with json output', async () => {
            commonStubs({});
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const testDep = proxyquire('../../../../src/commands/mdata/apex/testdependencies', {
                prompts: promptsStub,
            });
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await testDep.default.run(['--config']);
            expect(sfdxProjectJsonSet.called).to.be.true;
            expect(sfdxProjectJsonSet.args[0][0]).to.equal('plugins');
            expect(sfdxProjectJsonSet.args[0][1]).to.deep.equal({ mdataDeltaTests: { apexClass: 'f', lightningComponentBundle: 's', customField: { onDeploy: 'd', onDestroy: 'f' } } });
            expect(sfdxProjectJsonWrite.called).to.be.true;
        });

        it('runs mdata:apex:testdependencies with json output and an already existing configuration', async () => {
            commonStubs({
                'mdataDeltaTests': {
                    'apexClass': 'f',
                    'lightningComponentBundle': 's',
                    'customField': {
                        'onDeploy': 'd',
                        'onDestroy': 'f'
                    }
                }
            });

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const testDep = proxyquire('../../../../src/commands/mdata/apex/testdependencies', {
                prompts: promptsStub,
            });
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await testDep.default.run(['--config']);
            expect(promptsStub.called).to.be.true;
            expect(promptsStub.args[0][0].initial).to.equal(0);
            expect(promptsStub.args[1][0].initial).to.equal(false);
            expect(promptsStub.args[2][0].initial).to.equal(1);
            expect(promptsStub.args[3][0].initial).to.equal(true);
            expect(promptsStub.args[4][0].initial).to.equal(0);
            expect(promptsStub.args[5][0].initial).to.equal(2);
            expect(sfdxProjectJsonSet.called).to.be.true;
            expect(sfdxProjectJsonSet.args[0][0]).to.equal('plugins');
            expect(sfdxProjectJsonSet.args[0][1]).to.deep.equal({ mdataDeltaTests: { apexClass: 'f', lightningComponentBundle: 's', customField: { onDeploy: 'd', onDestroy: 'f' } } });
            expect(sfdxProjectJsonWrite.called).to.be.true;
        });
    });

    describe('get dependencies', () => {

        beforeEach(() => {
            commonStubs({
                'mdataDeltaTests': {
                    'apexClass': 'd',
                    'lightningComponentBundle': 's',
                    'customField': {
                        'onDeploy': 'd',
                        'onDestroy': 'f'
                    }
                }
            });
        });

        const commonStubs = function (pluginConfig) {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'getPackageDirectories').callsFake(() => [{ name: 'default', fullPath: 'my-dir' }]);

            const sfdxProjectResolve = stubMethod($$.SANDBOXES.PROJECT, SfProject, 'resolve').callsFake(async () => {
                const sfdxProjectPromise: Promise<SfProject> = sfdxProjectResolve.wrappedMethod.call(SfProject, path.join(__dirname, '..', '..', '..', 'data')) as  Promise<SfProject>;
                (await sfdxProjectPromise).getSfProjectJson().set('plugins', pluginConfig);
                return sfdxProjectPromise;
            });

            const globSync = stubMethod($$.SANDBOX, glob, 'sync').callsFake((filePath: string) => filePath.endsWith('.cls') ? [path.join('my-dir', 'main', 'default', 'classes', 'SomeClass1.cls'), path.join('my-dir', 'main', 'default', 'classes', 'SomeClass1Test.cls'), path.join('my-dir', 'main', 'default', 'classes', 'SomeClass2.cls'), path.join('my-dir', 'main', 'default', 'classes', 'SomeClass2Test.cls'), path.join('my-dir', 'main', 'default', 'classes', 'SomeClass3Test.cls')] : globSync.wrappedMethod.call(this, filePath) as string[]);

            const fsReadFileSync = stubMethod($$.SANDBOX, fs, 'readFileSync').callsFake((filePath: string) => {
                if (filePath.endsWith('.cls')) {
                    return fsReadFileSync.wrappedMethod.call(this, path.join(__dirname, '..', '..', '..', 'data', 'force-app', 'classes', path.basename(filePath))) as string;
                } else if (filePath.includes('package') && filePath.endsWith('.xml')) {
                    return fsReadFileSync.wrappedMethod.call(this, path.join(__dirname, '..', '..', '..', 'data', 'manifest', path.basename(filePath))) as string;
                } else if (filePath.includes('destructiveChanges') && filePath.endsWith('.xml')) {
                    return fsReadFileSync.wrappedMethod.call(this, path.join(__dirname, '..', '..', '..', 'data', 'manifest', path.basename(filePath))) as string;
                }
                return (fsReadFileSync.wrappedMethod.call(null, filePath) as object).toString();
            });
        }

        it('runs mdata:apex:testdependencies and skips tests if not in prod and all metadata types in delta are configured to skip test classes', async () => {
            await TestDependencies.run(['-x', 'package_delta_skip.xml', '-d', 'destructiveChanges_delta_skip.xml']);
            const output = sfCommandStubs.log
                .getCalls()
                .flatMap((c) => c.args)
                .join('\n');
            expect(output).to.include('-l NoTestRun');
        });

        it('runs mdata:apex:testdependencies and skips tests if not in prod and all metadata types in delta are configured to skip test classes with JSON output', async () => {
            const output = await TestDependencies.run(['-x', 'package_delta_skip.xml', '-d', 'destructiveChanges_delta_skip.xml', '--json']);
            expect(output).to.deep.equal({
                'testLevel': 'NoTestRun',
                'classList': []
            });
        });

        it('runs mdata:apex:testdependencies and runs all tests if in prod and all metadata types in delta are configured to skip test classes', async () => {
            await TestDependencies.run(['-x', 'package_delta_skip.xml', '-d', 'destructiveChanges_delta_skip.xml', '--prod']);
            const output = sfCommandStubs.log
                .getCalls()
                .flatMap((c) => c.args)
                .join('\n');
            expect(output).to.include('-l RunLocalTests');
        });

        it('runs mdata:apex:testdependencies and runs all tests if in prod and all metadata types in delta are configured to skip test classes with JSON output', async () => {
            const output = await TestDependencies.run(['-x', 'package_delta_skip.xml', '-d', 'destructiveChanges_delta_skip.xml', '--prod', '--json']);
            expect(output).to.deep.equal({
                'testLevel': 'RunLocalTests',
                'classList': []
            });
        });

        it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', async () => {
            await TestDependencies.run(['-x', 'package_delta.xml', '-d', 'destructiveChanges_delta_skip.xml']);
            const output = sfCommandStubs.log
                .getCalls()
                .flatMap((c) => c.args)
                .join('\n');
            expect(output).to.include('-l RunSpecifiedTests -r SomeClass2Test');
        });

        it('runs mdata:apex:testdependencies and returns only test classes based on the delta package with JSON output', async () => {
            const output = await TestDependencies.run(['-x', 'package_delta.xml', '-d', 'destructiveChanges_delta_skip.xml', '--json']);
            expect(output).to.deep.equal({
                'testLevel': 'RunSpecifiedTests',
                'classList': ['SomeClass2Test']
            });
        });

        it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', async () => {
            await TestDependencies.run(['-x', 'package_delta_depth.xml', '-d', 'destructiveChanges_delta_skip.xml']);
            const output = sfCommandStubs.log
                .getCalls()
                .flatMap((c) => c.args)
                .join('\n');
            expect(output).to.include('-l RunSpecifiedTests -r SomeClass1Test,SomeClass2Test');
        });

        it('runs mdata:apex:testdependencies and returns only test classes based on the delta package with JSON output', async () => {
            const output = await TestDependencies.run(['-x', 'package_delta_depth.xml', '-d', 'destructiveChanges_delta_skip.xml', '--json']);
            expect(output).to.deep.equal({
                'testLevel': 'RunSpecifiedTests',
                'classList': ['SomeClass1Test', 'SomeClass2Test']
            });
        });

        it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', async () => {
            await TestDependencies.run(['-x', 'package_delta_depth_becomes_full.xml', '-d', 'destructiveChanges_delta_skip.xml']);
            const output = sfCommandStubs.log
                .getCalls()
                .flatMap((c) => c.args)
                .join('\n');
            expect(output).to.include('-l RunLocalTests');
        });

        it('runs mdata:apex:testdependencies and returns only test classes based on the delta package with JSON output', async () => {
            const output = await TestDependencies.run(['-x', 'package_delta_depth_becomes_full.xml', '-d', 'destructiveChanges_delta_skip.xml', '--json']);
            expect(output).to.deep.equal({
                'testLevel': 'RunLocalTests',
                'classList': []
            });
        });
        
        it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', async () => {
            await TestDependencies.run([ '-x', 'package_delta_skip.xml', '-d', 'destructiveChanges_full.xml']);
            const output = sfCommandStubs.log
                .getCalls()
                .flatMap((c) => c.args)
                .join('\n');
            expect(output).to.include('-l RunLocalTests');
        });

        it('runs mdata:apex:testdependencies and returns only test classes based on the delta package with JSON output', async () => {
            const output = await TestDependencies.run(['-x', 'package_delta_skip.xml', '-d', 'destructiveChanges_full.xml', '--json']);
            expect(output).to.deep.equal({
                'testLevel': 'RunLocalTests',
                'classList': []
            });
        });

        it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', async () => {
            const authInfo = await AuthInfo.create({
                username: 'test@org.com'
            });

            // crazy stubbing right here
            stubMethod($$.SANDBOX, Org.prototype, 'getConnection').callsFake(() => {
                const conn = new Connection({
                    authInfo
                });

                $$.SANDBOX.replaceGetter(conn, 'tooling', () => {
                    const t = new Tooling(conn) as Tooling<never> & { _logger: never };
                    stubMethod($$.SANDBOX, t, 'query').callsFake(() => {
                        const q = new Query(conn, '');
                        Sinon.replace(q, 'on', (event: string, cb: (...args: object[]) => void) => {
                            if (event === 'record') {
                                cb({
                                    'attributes': {
                                        'type': 'ApexCodeCoverage',
                                        'url': '/services/data/v52.0/tooling/sobjects/ApexCodeCoverage/7141i00000DXx0BAAT'
                                    },
                                    'ApexTestClass': {
                                        'attributes': {
                                            'type': 'ApexClass',
                                            'url': '/services/data/v52.0/tooling/sobjects/ApexClass/01p1i000001NALaAAO'
                                        },
                                        'Name': 'SomeClass3Test'
                                    },
                                    'ApexClassOrTrigger': {
                                        'attributes': {
                                            'type': 'Name',
                                            'url': '/services/data/v52.0/tooling/sobjects/ApexClass/01p1i000001vP3qAAE'
                                        },
                                        'Name': 'SomeClass2'
                                    }
                                });
                            } else if (event === 'end') {
                                cb();    
                            }
                            return q;
                        })
                        Sinon.spy(q, 'run');
                        return q;
                    });
                    return t;
                });
                return conn;
            });
            
            
            await TestDependencies.run(['-x', 'package_delta.xml', '-d', 'destructiveChanges_delta_skip.xml', '--usecodecoverage',  '-o', 'testorg']);
            const output = sfCommandStubs.log
                .getCalls()
                .flatMap((c) => c.args)
                .join('\n');
            expect(output).to.include('-l RunSpecifiedTests -r SomeClass2Test,SomeClass3Test');
        });


        it('runs mdata:apex:testdependencies and returns only test classes based on the delta package with JSON output', async () => {
            const authInfo = await AuthInfo.create({
                username: 'test@org.com'
            });

            stubMethod($$.SANDBOX, Org.prototype, 'getConnection').callsFake(() => {
                const conn = new Connection({
                    authInfo
                });

                $$.SANDBOX.replaceGetter(conn, 'tooling', () => {
                    const t = new Tooling(conn) as Tooling<never> & { _logger: never };
                    stubMethod($$.SANDBOX, t, 'query').callsFake(() => {
                        const q = new Query(conn, '');
                        Sinon.replace(q, 'on', (event: string, cb: (...args: object[]) => void) => {
                            if (event === 'record') {
                                cb({
                                    'attributes': {
                                        'type': 'ApexCodeCoverage',
                                        'url': '/services/data/v52.0/tooling/sobjects/ApexCodeCoverage/7141i00000DXx0BAAT'
                                    },
                                    'ApexTestClass': {
                                        'attributes': {
                                            'type': 'ApexClass',
                                            'url': '/services/data/v52.0/tooling/sobjects/ApexClass/01p1i000001NALaAAO'
                                        },
                                        'Name': 'SomeClass3Test'
                                    },
                                    'ApexClassOrTrigger': {
                                        'attributes': {
                                            'type': 'Name',
                                            'url': '/services/data/v52.0/tooling/sobjects/ApexClass/01p1i000001vP3qAAE'
                                        },
                                        'Name': 'SomeClass2'
                                    }
                                });
                            } else if (event === 'end') {
                                cb();    
                            }
                            return q;
                        })
                        Sinon.spy(q, 'run');
                        return q;
                    });
                    return t;
                });
                return conn;
            });
            
            
            const output = await TestDependencies.run(['-x', 'package_delta.xml', '-d', 'destructiveChanges_delta_skip.xml', '--usecodecoverage',  '-o', 'testorg', '--json']);
            expect(output).to.deep.equal({
                'testLevel': 'RunSpecifiedTests',
                'classList': ['SomeClass2Test', 'SomeClass3Test']
            });
        });
    });
});
