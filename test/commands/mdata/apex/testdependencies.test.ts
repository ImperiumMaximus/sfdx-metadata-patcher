import { expect, test } from '@salesforce/command/lib/test';
import { testSetup } from '@salesforce/core/lib/testSetup';
import { SfdxProject } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';
import * as child_process from 'child_process';
import * as events from 'events';
import { Readable, Writable } from 'stream';
import { DocumentSymbolParams, InitializeParams, InitializeResult, Location, LspClient, ReferenceParams, SymbolInformation, SymbolKind } from 'ts-lsp-client';
import * as fs from 'fs';

class WriteOnlyMemory extends Writable {

    public constructor() {
        super();
    }

    public _write(chunk, _, next) {
        next();
    }

    public reset() {
    }
}

const $$ = testSetup()

describe('apex:testdependencies', () => {

    describe('get dependencies', () => {

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
    })
});