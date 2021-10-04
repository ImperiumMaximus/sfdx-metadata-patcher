import { expect, test } from '@salesforce/command/lib/test';
import { testSetup } from '@salesforce/core/lib/testSetup';
import { SfdxProject, SfdxProjectJson } from '@salesforce/core';
import { spyMethod, stubMethod } from '@salesforce/ts-sinon';
import * as fs from 'fs';
import * as glob from 'glob';
import * as prompts from 'prompts';
import * as path from 'path';
import * as Sinon from 'sinon';

const $$ = testSetup();

const fakeDefaultExport = function (moduleRelativePath, stubs) {
    if (require.cache[require.resolve(moduleRelativePath)]) {
        delete require.cache[require.resolve(moduleRelativePath)];
    }
    Object.keys(stubs).forEach(dependencyRelativePath => {
        require.cache[require.resolve(dependencyRelativePath)] = {
            exports: stubs[dependencyRelativePath],
        };
    });
};

describe('apex:testdependencies', () => {

    describe('configure the plugin', () => {
        let sfdxProjectJsonSet: Sinon.SinonSpy;
        let sfdxProjectJsonWrite: Sinon.SinonSpy;
        let promptsStub: Sinon.SinonStub;
        

        const commonStubs = function (sfdxProjectJson: string) {
            stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'getPackageDirectories').callsFake(() => {
                return [{ name: 'default', fullPath: 'my-dir' }];
            });

            const sfdxProjectResolve = stubMethod($$.SANDBOXES.PROJECT, SfdxProject, 'resolve').callsFake(() => {
                return sfdxProjectResolve.wrappedMethod.call(SfdxProject, path.join(__dirname, '..', '..', '..', 'data', sfdxProjectJson));
            });

            sfdxProjectJsonSet = spyMethod($$.SANDBOXES.PROJECT, SfdxProjectJson.prototype, 'set');
            sfdxProjectJsonWrite = spyMethod($$.SANDBOXES.PROJECT, SfdxProjectJson.prototype, 'write');

            const globSync = stubMethod($$.SANDBOX, glob, 'sync').callsFake((filePath: string) => {
                return filePath.endsWith('/classes') || filePath.endsWith('/lwc') || filePath.includes('objects/**/fields') ? ['result'] : globSync.wrappedMethod.call(this, filePath);
            });

            promptsStub = Sinon.stub().callsFake((questions: prompts.PromptObject) => {
                //console.error(questions);
                if (questions.message.toString().includes('"ApexClass" get deleted?') || questions.message.toString().includes('"LightningComponentBundle" get deleted?')) {
                    return { 'strat': false }
                } else if (questions.message.toString().includes('"ApexClass"')) {
                    return { 'strat': 'f' }
                } else if (questions.message.toString().includes('"LightningComponentBundle" appears in the Delta Deployment.')) {
                    return { 'strat': 's' }
                } else if (questions.message.toString().includes('"CustomField" appears in the Delta Deployment.')) {
                    return { 'strat': 'd' }
                } else if (questions.message.toString().includes('"CustomField" get deleted?')) {
                    return { 'strat': true }
                } else if (questions.message.toString().includes('"CustomField" appears in the Destructive Changes Deployment.')) {
                    return { 'strat': 'f' }
                }
            });

            fakeDefaultExport('./../../../../src/commands/mdata/apex/testdependencies.ts', {
                'prompts': promptsStub
            })
        }

        test
        .do(() => {
            commonStubs('sfdx-project.json');
        })
        .stdout()
        .command(['mdata:apex:testdependencies', '--config'])
        .it('runs mdata:apex:testdependencies with json output', ctx => {
            expect(sfdxProjectJsonSet.called).to.be.true;
            expect(sfdxProjectJsonSet.args[0][0]).to.equal('plugins');
            expect(sfdxProjectJsonSet.args[0][1]).to.deep.equal({ mdataDeltaTests: { apexClass: 'f', lightningComponentBundle: 's', customField: { onDeploy: 'd', onDestroy: 'f' } } });
            expect(sfdxProjectJsonWrite.called).to.be.true;
        });

        test
        .do(() => {
            commonStubs('sfdx-project_already_configured.json');
        })
        .stdout()
        .command(['mdata:apex:testdependencies', '--config'])
        .it('runs mdata:apex:testdependencies with json output and an already existing configuration', ctx => {
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
        const commonStubs = function () {
            stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'getPackageDirectories').callsFake(() => {
                return [{ name: 'default', fullPath: 'my-dir' }];
            });

            const sfdxProjectResolve = stubMethod($$.SANDBOXES.PROJECT, SfdxProject, 'resolve').callsFake(() => {
                return sfdxProjectResolve.wrappedMethod.call(SfdxProject, path.join(__dirname, '..', '..', '..', 'data', 'sfdx-project_already_configured.json'));
            });

            const globSync = stubMethod($$.SANDBOX, glob, 'sync').callsFake((filePath: string) => {
                return filePath.endsWith('.cls') ? ['my-dir/main/default/classes/SomeClass1.cls', 'my-dir/main/default/classes/SomeClass1Test.cls', 'my-dir/main/default/classes/SomeClass2.cls', 'my-dir/main/default/classes/SomeClass2Test.cls'] : globSync.wrappedMethod.call(this, filePath);
            });

            const fsReadFileSync = stubMethod($$.SANDBOX, fs, 'readFileSync').callsFake((filePath: string) => {
                if (filePath.endsWith('.cls')) {
                    return fsReadFileSync.wrappedMethod.call(this, path.join(__dirname, '..', '..', '..', 'data', 'force-app', 'classes', path.basename(filePath)));
                } else if (filePath.includes('package') && filePath.endsWith('.xml')) {
                    return fsReadFileSync.wrappedMethod.call(this, path.join(__dirname, '..', '..', '..', 'data', 'force-app', 'manifest', path.basename(filePath)));
                } else if (filePath.includes('destructiveChanges') && filePath.endsWith('.xml')) {
                    return fsReadFileSync.wrappedMethod.call(this, path.join(__dirname, '..', '..', '..', 'data', 'force-app', 'manifest', path.basename(filePath)));
                }
                return fsReadFileSync.wrappedMethod.call(this, filePath);
            });
        }

        test
        .do(() => {
            commonStubs();
        })
        .stdout()
        .command(['mdata:apex:testdependencies', '-x', 'package.xml', '-d', 'destructiveChanges.xml'])
        .it('runs mdata:apex:testdependencies with json output', ctx => {
            expect(true).to.be.true;
        });
    });

    /*describe('get dependencies', () => {

        let apexLspStubEmitter = new events.EventEmitter();
        apexLspStubEmitter['stdout'] = new Readable();
        apexLspStubEmitter['stdin'] = new WriteOnlyMemory();

        apexLspStubEmitter['stdout'].push(null);


        const commonStubs = function () {
            stubMethod($$.SANDBOX, child_process, 'spawn').callsFake((_: string, __: string[]) => {
                return apexLspStubEmitter;
            });

            stubMethod($$.SANDBOX, LspClient.prototype, 'initialize').callsFake((_: InitializeParams) => {
                const initRes: InitializeResult = {
                    capabilities: {}
                };
                return initRes;
            });

            stubMethod($$.SANDBOX, LspClient.prototype, 'documentSymbol').callsFake((params: DocumentSymbolParams) => {
                const documentSymbolRes: SymbolInformation[] = [
                    {
                        kind: SymbolKind.Method,
                        name: 'stubbedMethod',
                        location: {
                            range: {
                                start: {
                                    character: 1,
                                    line: 1
                                },
                                end: {
                                    character: 10,
                                    line: 1
                                }
                            },
                            uri: 'file:///fake.cls'
                        }
                    }
                ];

                return documentSymbolRes;
            });

            stubMethod($$.SANDBOX, LspClient.prototype, 'references').callsFake((params: ReferenceParams) => {
                const referencesRes: Location[] = [
                    {
                        uri: 'file:///force-app/main/default/classes/fflib_SObjectDomainTest.cls',
                        range: {
                            start: {
                                character: 1,
                                line: 1
                            },
                            end: {
                                character: 10,
                                line: 1
                            }
                        },
                    },
                    {
                        uri: 'file:///force-app/main/default/classes/fflib_Application.cls',
                        range: {
                            start: {
                                character: 1,
                                line: 1
                            },
                            end: {
                                character: 10,
                                line: 1
                            }
                        },
                    }
                ]

                return referencesRes;
            });

            stubMethod($$.SANDBOX, LspClient.prototype, 'shutdown').callsFake(() => {
                return {};
            })
            
            stubMethod($$.SANDBOX, LspClient.prototype, 'once').callsFake((_: string) => {
                return {};
            });

            const fsExistsSync = stubMethod($$.SANDBOX, fs, 'existsSync');
            
            fsExistsSync.callsFake((filePath: string) => {
                if (filePath.includes('force-app')) return true;
                return fsExistsSync.wrappedMethod.call(this, filePath);
            });

            const fsReadFileSync = stubMethod($$.SANDBOX, fs, 'readFileSync');

            fsReadFileSync.callsFake((filePath: string) => {
                if (filePath.endsWith('fflib_SObjectDomain.cls')) return 'public class fflib_SObjectDomain {}';
                else if (filePath.endsWith('fflib_Application.cls')) return '@isTest public class fflib_Application {}';
                return fsReadFileSync.wrappedMethod.call(this, filePath).toString();
            });

            stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'getPackageDirectories').callsFake(() => {
                return [{
                    "fullPath": "force-app/",
                    "name": "force-app"
                }]
            });
        }  

        test
        .do(() => {
            commonStubs();
        })
        .stdout()
        .command(['mdata:apex:testdependencies', '-m', 'fflib_SObjectDomain.cls', '-j', '/usr/bin/java'])
        .it('runs mdata:apex:testdependencies with non-json output', ctx => {
            expect(ctx.stdout).to.contain('-l RunSpecifiedTests -r fflib_SObjectDomainTest,fflib_ApplicationTest');
        });

        test
        .do(() => {
            commonStubs();
        })
        .stdout()
        .command(['mdata:apex:testdependencies', '-m', 'fflib_SObjectDomain.cls', '--json', '-j', '/usr/bin/java'])
        .it('runs mdata:apex:testdependencies with json output', ctx => {
            expect(JSON.parse(ctx.stdout).result).to.deep.equal(['fflib_SObjectDomainTest','fflib_ApplicationTest']);
        });
    })*/
});