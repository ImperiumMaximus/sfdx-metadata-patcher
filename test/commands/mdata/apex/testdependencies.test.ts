import { expect, test } from '@salesforce/command/lib/test';
import { testSetup } from '@salesforce/core/lib/testSetup';
import { AnyJson, ensureJsonMap, ensureString } from '@salesforce/ts-types';
import { SfdxProject, SfdxProjectJson } from '@salesforce/core/lib/sfdxProject';
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

afterEach(() => {
    $$.SANDBOXES.PROJECT.resetBehavior();
})

describe('apex:testdependencies', () => {

    describe('configure the plugin', () => {
        let sfdxProjectJsonSet: Sinon.SinonSpy;
        let sfdxProjectJsonWrite: Sinon.SinonSpy;
        let promptsStub: Sinon.SinonStub;
        

        const commonStubs = function (pluginConfig: AnyJson) {
            stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'getPackageDirectories').callsFake(() => {
                return [{ name: 'default', fullPath: 'my-dir' }];
            });

            const sfdxProjectResolve = stubMethod($$.SANDBOXES.PROJECT, SfdxProject, 'resolve').callsFake(async () => {
                const sfdxProject: Promise<SfdxProject> = sfdxProjectResolve.wrappedMethod.call(SfdxProject, path.join(__dirname, '..', '..', '..', 'data'));
                if (pluginConfig) {
                    (await sfdxProject).getSfdxProjectJson().set('plugins', pluginConfig);
                }
                return sfdxProject;
            });

            sfdxProjectJsonSet = spyMethod($$.SANDBOXES.PROJECT, SfdxProjectJson.prototype, 'set');
            sfdxProjectJsonWrite = spyMethod($$.SANDBOXES.PROJECT, SfdxProjectJson.prototype, 'write');

            const globSync = stubMethod($$.SANDBOX, glob, 'sync').callsFake((filePath: string) => {
                return filePath.endsWith(`${path.sep}classes`) || filePath.endsWith(`${path.sep}lwc`) || filePath.includes(`objects${path.sep}**${path.sep}fields`) ? ['result'] : globSync.wrappedMethod.call(this, filePath);
            });

            promptsStub = Sinon.stub().callsFake((questions: prompts.PromptObject) => {
                if (questions.message.toString().includes('"ApexClass" gets deleted?') || questions.message.toString().includes('"LightningComponentBundle" gets deleted?')) {
                    return { 'strat': false }
                } else if (questions.message.toString().includes('"ApexClass"')) {
                    return { 'strat': 'f' }
                } else if (questions.message.toString().includes('"LightningComponentBundle" appears in the Delta Deployment.')) {
                    return { 'strat': 's' }
                } else if (questions.message.toString().includes('"CustomField" appears in the Delta Deployment.')) {
                    return { 'strat': 'd' }
                } else if (questions.message.toString().includes('"CustomField" gets deleted?')) {
                    return { 'strat': true }
                } else if (questions.message.toString().includes('"CustomField" appears in the Destructive Changes Deployment.')) {
                    return { 'strat': 'f' }
                }
            });

            fakeDefaultExport(path.join('.', '..', '..', '..', '..', 'src', 'commands', 'mdata', 'apex', 'testdependencies.ts'), {
                'prompts': promptsStub
            })
        }

        test
        .do(() => {
            commonStubs({});
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
            commonStubs({
                "mdataDeltaTests": {
                    "apexClass": "f",
                    "lightningComponentBundle": "s",
                    "customField": {
                        "onDeploy": "d",
                        "onDestroy": "f"
                    }
                }
            });
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
        const commonStubs = function (pluginConfig) {
            stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'getPackageDirectories').callsFake(() => {
                return [{ name: 'default', fullPath: 'my-dir' }];
            });

            const sfdxProjectResolve = stubMethod($$.SANDBOXES.PROJECT, SfdxProject, 'resolve').callsFake(async () => {
                const sfdxProjectPromise: Promise<SfdxProject> = sfdxProjectResolve.wrappedMethod.call(SfdxProject, path.join(__dirname, '..', '..', '..', 'data'));
                (await sfdxProjectPromise).getSfdxProjectJson().set('plugins', pluginConfig);
                return sfdxProjectPromise;
            });

            const globSync = stubMethod($$.SANDBOX, glob, 'sync').callsFake((filePath: string) => {
                return filePath.endsWith('.cls') ? [path.join('my-dir', 'main', 'default', 'classes', 'SomeClass1.cls'), path.join('my-dir', 'main', 'default', 'classes', 'SomeClass1Test.cls'), path.join('my-dir', 'main', 'default', 'classes', 'SomeClass2.cls'), path.join('my-dir', 'main', 'default', 'classes', 'SomeClass2Test.cls'), path.join('my-dir', 'main', 'default', 'classes', 'SomeClass3Test.cls')] : globSync.wrappedMethod.call(this, filePath);
            });

            const fsReadFileSync = stubMethod($$.SANDBOX, fs, 'readFileSync').callsFake((filePath: string) => {
                if (filePath.endsWith('.cls')) {
                    return fsReadFileSync.wrappedMethod.call(this, path.join(__dirname, '..', '..', '..', 'data', 'force-app', 'classes', path.basename(filePath)));
                } else if (filePath.includes('package') && filePath.endsWith('.xml')) {
                    return fsReadFileSync.wrappedMethod.call(this, path.join(__dirname, '..', '..', '..', 'data', 'manifest', path.basename(filePath)));
                } else if (filePath.includes('destructiveChanges') && filePath.endsWith('.xml')) {
                    return fsReadFileSync.wrappedMethod.call(this, path.join(__dirname, '..', '..', '..', 'data', 'manifest', path.basename(filePath)));
                }
                return fsReadFileSync.wrappedMethod.call(null, filePath).toString();
            });
        }

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta_skip.xml', '-d', 'destructiveChanges_delta_skip.xml'])
            .it('runs mdata:apex:testdependencies and skips tests if not in prod and all metadata types in delta are configured to skip test classes', ctx => {
                expect(ctx.stdout).to.include('-l NoTestRun');
            });

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta_skip.xml', '-d', 'destructiveChanges_delta_skip.xml', '--json'])
            .it('runs mdata:apex:testdependencies and skips tests if not in prod and all metadata types in delta are configured to skip test classes', ctx => {
                expect(JSON.parse(ctx.stdout)).to.deep.equal({
                    "status": 0,
                    "result": {
                        "testLevel": "NoTestRun",
                        "classList": []
                    }
                });
            });

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta_skip.xml', '-d', 'destructiveChanges_delta_skip.xml', '--prod'])
            .it('runs mdata:apex:testdependencies and runs all tests if in prod and all metadata types in delta are configured to skip test classes', ctx => {
                expect(ctx.stdout).to.include('-l RunLocalTests');
            });

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta_skip.xml', '-d', 'destructiveChanges_delta_skip.xml', '--prod', '--json'])
            .it('runs mdata:apex:testdependencies and runs all tests if in prod and all metadata types in delta are configured to skip test classes', ctx => {
                expect(JSON.parse(ctx.stdout)).to.deep.equal({
                    "status": 0,
                    "result": {
                        "testLevel": "RunLocalTests",
                        "classList": []
                    }
                });
            });

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta.xml', '-d', 'destructiveChanges_delta_skip.xml'])
            .it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', ctx => {
                expect(ctx.stdout).to.include('-l RunSpecifiedTests -r SomeClass2Test');
            });

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta.xml', '-d', 'destructiveChanges_delta_skip.xml', '--json'])
            .it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', ctx => {
                expect(JSON.parse(ctx.stdout)).to.deep.equal({
                    "status": 0,
                    "result": {
                        "testLevel": "RunSpecifiedTests",
                        "classList": ["SomeClass2Test"]
                    }
                });
            });

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta_depth.xml', '-d', 'destructiveChanges_delta_skip.xml'])
            .it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', ctx => {
                expect(ctx.stdout).to.include('-l RunSpecifiedTests -r SomeClass1Test,SomeClass2Test');
            });

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta_depth.xml', '-d', 'destructiveChanges_delta_skip.xml', '--json'])
            .it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', ctx => {
                expect(JSON.parse(ctx.stdout)).to.deep.equal({
                    "status": 0,
                    "result": {
                        "testLevel": "RunSpecifiedTests",
                        "classList": ["SomeClass1Test", "SomeClass2Test"]
                    }
                });
            });

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta_depth_becomes_full.xml', '-d', 'destructiveChanges_delta_skip.xml'])
            .it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', ctx => {
                expect(ctx.stdout).to.include('-l RunLocalTests');
            });

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta_depth_becomes_full.xml', '-d', 'destructiveChanges_delta_skip.xml', '--json'])
            .it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', ctx => {
                expect(JSON.parse(ctx.stdout)).to.deep.equal({
                    "status": 0,
                    "result": {
                        "testLevel": "RunLocalTests",
                        "classList": []
                    }
                });
            });

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta_skip.xml', '-d', 'destructiveChanges_full.xml'])
            .it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', ctx => {
                expect(ctx.stdout).to.include('-l RunLocalTests');
            });

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta_skip.xml', '-d', 'destructiveChanges_full.xml', '--json'])
            .it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', ctx => {
                expect(JSON.parse(ctx.stdout)).to.deep.equal({
                    "status": 0,
                    "result": {
                        "testLevel": "RunLocalTests",
                        "classList": []
                    }
                });
            });

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .withOrg({ username: 'test@org.com' }, true)
            .withConnectionRequest((request: any) => {
                if (typeof request == 'object' && ensureJsonMap(request) && ensureString(request.url).includes(encodeURIComponent('FROM ApexCodeCoverage'))) {
                    return Promise.resolve(
                        {
                            "size": 1,
                            "totalSize": 1,
                            "done": true,
                            "queryLocator": null,
                            "entityTypeName": "ApexCodeCoverage",
                            "records": [{
                                "attributes": {
                                    "type": "ApexCodeCoverage",
                                    "url": "/services/data/v52.0/tooling/sobjects/ApexCodeCoverage/7141i00000DXx0BAAT"
                                },
                                "ApexTestClass": {
                                    "attributes": {
                                        "type": "ApexClass",
                                        "url": "/services/data/v52.0/tooling/sobjects/ApexClass/01p1i000001NALaAAO"
                                    },
                                    "Name": "SomeClass3Test"
                                },
                                "ApexClassOrTrigger": {
                                    "attributes": {
                                        "type": "Name",
                                        "url": "/services/data/v52.0/tooling/sobjects/ApexClass/01p1i000001vP3qAAE"
                                    },
                                    "Name": "SomeClass2"
                                }
                            }]
                        }
                    );
                }
                return Promise.resolve({});
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta.xml', '-d', 'destructiveChanges_delta_skip.xml', '--usecodecoverage'])
            .it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', ctx => {
                expect(ctx.stdout).to.include('-l RunSpecifiedTests -r SomeClass2Test,SomeClass3Test');
            });

        test
            .do(() => {
                commonStubs({
                    "mdataDeltaTests": {
                        "apexClass": "d",
                        "lightningComponentBundle": "s",
                        "customField": {
                            "onDeploy": "d",
                            "onDestroy": "f"
                        }
                    }
                });
            })
            .withOrg({ username: 'test@org.com' }, true)
            .withConnectionRequest((request: any) => {
                if (typeof request == 'object' && ensureJsonMap(request) && ensureString(request.url).includes(encodeURIComponent('FROM ApexCodeCoverage'))) {
                    return Promise.resolve(
                        {
                            "size": 1,
                            "totalSize": 1,
                            "done": true,
                            "queryLocator": null,
                            "entityTypeName": "ApexCodeCoverage",
                            "records": [{
                                "attributes": {
                                    "type": "ApexCodeCoverage",
                                    "url": "/services/data/v52.0/tooling/sobjects/ApexCodeCoverage/7141i00000DXx0BAAT"
                                },
                                "ApexTestClass": {
                                    "attributes": {
                                        "type": "ApexClass",
                                        "url": "/services/data/v52.0/tooling/sobjects/ApexClass/01p1i000001NALaAAO"
                                    },
                                    "Name": "SomeClass3Test"
                                },
                                "ApexClassOrTrigger": {
                                    "attributes": {
                                        "type": "Name",
                                        "url": "/services/data/v52.0/tooling/sobjects/ApexClass/01p1i000001vP3qAAE"
                                    },
                                    "Name": "SomeClass2"
                                }
                            }]
                        }
                    );
                }
                return Promise.resolve({});
            })
            .stdout()
            .command(['mdata:apex:testdependencies', '-x', 'package_delta.xml', '-d', 'destructiveChanges_delta_skip.xml', '--usecodecoverage', '--json'])
            .it('runs mdata:apex:testdependencies and returns only test classes based on the delta package', ctx => {
                expect(JSON.parse(ctx.stdout)).to.deep.equal({
                    "status": 0,
                    "result": {
                        "testLevel": "RunSpecifiedTests",
                        "classList": ["SomeClass2Test", "SomeClass3Test"]
                    }
                });
            });
    });
});