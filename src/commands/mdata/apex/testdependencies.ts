import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxProject } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { spawn } from 'child_process';
import * as findJavaHome from 'find-java-home';
import * as fs from 'fs';
import * as path from 'path';
import { ClientCapabilities, JSONRPCEndpoint, Location, LspClient, SymbolInformation, SymbolKind } from 'ts-lsp-client';
import * as util from 'util';
import { Mdata } from '../../../mdata';
import { LoggerLevel } from '../../../typeDefs';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class TestDependencies extends SfdxCommand {
    public static description = messages.getMessage('apex.testdependencies.description');

    public static examples = [
        `To find all test dependecies for a class in a SFDX project:
    $ sfdx mdata:apex:testdependencies -m foo.cls`,

        `To find all test dependecies for multiple classes in a SFDX project:
    $ sfdx mdata:apex:testdependencies -m foo.cls,bar.cls`,

        `To find all test dependecies up to a certain depth for multiple classes in a SFDX project:
    $ sfdx mdata:apex:testdependencies -m foo.cls,bar.cls -d 1`,

        `To find all test dependecies up to a certain depth for multiple classes in a SFDX project using a specific java version:
    $ sfdx mdata:apex:testdependencies -m foo.cls,bar.cls -d 1 -j /opt/my_cool_java_version/bin/java`
    ];

    protected static flagsConfig = {
        metadata: flags.string({
            char: 'm',
            description: messages.getMessage('apex.testdependencies.flags.metadata'),
            required: true
        }),
        nameconv: flags.string({
            char: 'n',
            description: messages.getMessage('apex.testdependencies.flags.nameconv'),
            default: 'Test'
        }),
        depth: flags.number({
            char: 'd',
            description: messages.getMessage('apex.testdependencies.flags.depth')
        }),
        javabinary: flags.string({
            char: 'j',
            description: messages.getMessage('apex.testdependencies.flags.javabinary')
        }),
        loglevel: flags.enum({
            description: messages.getMessage('general.flags.loglevel'),
            default: 'info',
            required: false,
            options: [
                'trace',
                'debug',
                'info',
                'warn',
                'error',
                'fatal',
                'TRACE',
                'DEBUG',
                'INFO',
                'WARN',
                'ERROR',
                'FATAL'
            ]
        })
    };

    // Comment this out if your command does not require an org username
    protected static requiresUsername = false;

    // Comment this out if your command does not support a hub org username
    protected static supportsDevhubUsername = false;

    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    protected static requiresProject = true;

    public async run(): Promise<AnyJson> {
        Mdata.setLogLevel(this.flags.loglevel, this.flags.json);

        const project = await SfdxProject.resolve();

        const uberJar = path.join(__dirname, '..', '..', '..', '..', 'libs', 'apex-jorje-lsp.jar');
        Mdata.log(`Using JAR ${uberJar}`, LoggerLevel.INFO);

        const javaBinary = this.flags.javabinary ? this.flags.javabinary : await (
            new Promise((res, rej) => {
                findJavaHome({ allowJre: true }, (err, home) => {
                    if (err) rej(err);
                    res(path.join(home, 'bin', 'java'));
                });
            }));
        const child = spawn(javaBinary, ['-cp', uberJar,
            '-Ddebug.internal.errors=true', '-Ddebug.semantic.errors=true',
            '-Ddebug.completion.statistics=true', '-Dlwc.typegeneration.disabled=true',
            '-Dtrace.protocol=false', 'apex.jorje.lsp.ApexLanguageServerLauncher'], {
            cwd: project.getPath()
        });

        const endpoint = new JSONRPCEndpoint(child.stdin, child.stdout);

        const capabilities: ClientCapabilities = {
            textDocument: {
                codeAction: { dynamicRegistration: true },
                codeLens: { dynamicRegistration: true },
                colorProvider: { dynamicRegistration: true },
                completion: {
                    completionItem: {
                        commitCharactersSupport: true,
                        documentationFormat: ['markdown', 'plaintext'],
                        snippetSupport: true
                    },
                    completionItemKind: {
                        valueSet: [1,
                            2,
                            3,
                            4,
                            5,
                            6,
                            7,
                            8,
                            9,
                            10,
                            11,
                            12,
                            13,
                            14,
                            15,
                            16,
                            17,
                            18,
                            19,
                            20,
                            21,
                            22,
                            23,
                            24,
                            25]
                    },
                    contextSupport: true,
                    dynamicRegistration: true
                },
                definition: { dynamicRegistration: true },
                documentHighlight: { dynamicRegistration: true },
                documentLink: { dynamicRegistration: true },
                documentSymbol: {
                    dynamicRegistration: true,
                    symbolKind: {
                        valueSet: [
                            SymbolKind.TypeParameter,
                            SymbolKind.Class,
                            SymbolKind.Interface,
                            SymbolKind.Method,
                            SymbolKind.Property,
                            SymbolKind.Variable,
                            SymbolKind.Constructor,
                            SymbolKind.Field,
                            SymbolKind.Function ]
                    }
                },
                formatting: { dynamicRegistration: true },
                hover: {
                    contentFormat: ['markdown', 'plaintext'],
                    dynamicRegistration: true
                },
                implementation: { dynamicRegistration: true },
                onTypeFormatting: { dynamicRegistration: true },
                publishDiagnostics: { relatedInformation: true },
                rangeFormatting: { dynamicRegistration: true },
                references: { dynamicRegistration: true },
                rename: { dynamicRegistration: true },
                signatureHelp: {
                    dynamicRegistration: true,
                    signatureInformation: { documentationFormat: ['markdown', 'plaintext'] }
                },
                synchronization: {
                    didSave: true,
                    dynamicRegistration: true,
                    willSave: true,
                    willSaveWaitUntil: true
                },
                typeDefinition: { dynamicRegistration: true }
            },
            workspace: {
                applyEdit: true,
                configuration: true,
                didChangeConfiguration: { dynamicRegistration: true },
                didChangeWatchedFiles: { dynamicRegistration: true },
                executeCommand: { dynamicRegistration: true },
                symbol: {
                    dynamicRegistration: true,
                    symbolKind: {
                        valueSet: [
                            SymbolKind.TypeParameter,
                            SymbolKind.Class,
                            SymbolKind.Interface,
                            SymbolKind.Method,
                            SymbolKind.Property,
                            SymbolKind.Variable,
                            SymbolKind.Constructor,
                            SymbolKind.Field,
                            SymbolKind.Function
                        ]
                    }
                }, workspaceEdit: { documentChanges: true },
                workspaceFolders: true
            }
        };

        const rootUri = `file:///${project.getPath()}`;
        const workspaceFolders = [{ name: project.getPackageDirectories()[0].name, uri: rootUri }];

        const client = new LspClient(endpoint);

        await client.initialize({
            processId: child.pid,
            rootPath: '',
            rootUri: null,
            capabilities,
            trace: 'off',
            workspaceFolders
        });

        client.initialized();
        await client.once('indexer/done');

        const classList = this.flags.metadata.split(',').filter((c: string) => fs.existsSync(`${project.getPackageDirectories()[0].fullPath}main/default/classes/${path.basename(c, '.cls')}.cls`))
            .map((c: string) => `${project.getPackageDirectories()[0].fullPath}main/default/classes/${path.basename(c, '.cls')}.cls`);

        // Get Test classes at depth = 0
        const testClassList: Set<string> = new Set(classList.filter((c: string) => fs.existsSync(util.format(`${project.getPackageDirectories()[0].fullPath}main/default/classes/%s${this.flags.nameconv}.cls`, path.basename(c, '.cls'))))
            .map((c: string) => util.format(`%s${this.flags.nameconv}`, path.basename(c, '.cls'))));

        const maxDepth = this.flags.depth || 1000;
        let curDepth = 1;
        let curClassList: string[] = classList.map((c: string) => `file:///${c}`);
        const analyzedClassSet: Set<string> = new Set<string>();
        let isStable = false;

        while (!isStable && curDepth <= maxDepth) {
            const prevTestClassList = new Set<string>(Array.from(testClassList));
            Mdata.log(`Starting analysis with depth = ${curDepth}, curClassList = ${curClassList}`, LoggerLevel.INFO);
            curClassList.forEach(c => analyzedClassSet.add(c));
            const nextClassList: Set<string> = new Set<string>();
            for (const curClass of curClassList) {
                client.didOpen({
                    textDocument: {
                        uri: curClass,
                        languageId: 'apex',
                        text: fs.readFileSync(curClass.substring('file://'.length)).toString(),
                        version: 1
                    }
                });

                await client.once('textDocument/publishDiagnostics');

                const symbols = await client.documentSymbol({
                    textDocument: {
                        uri: curClass
                    }
                });

                for (const s of symbols) {
                    const references: Location[] = await client.references({
                        textDocument: {
                            uri: curClass
                        },
                        context: {
                            includeDeclaration: false
                        },
                        position: {
                            character: (s as SymbolInformation).location.range.start.character,
                            line: (s as SymbolInformation).location.range.start.line
                        }
                    }) as Location[];

                    references.filter(r => !path.basename(r.uri.substring('file://'.length), '.cls').endsWith(this.flags.nameconv) && !analyzedClassSet.has(r.uri) && !nextClassList.has(r.uri))
                        .forEach(r => nextClassList.add(r.uri));
                    references.filter(r => path.basename(r.uri.substring('file://'.length), '.cls').endsWith(this.flags.nameconv))
                        .map(r => path.basename(r.uri, '.cls'))
                        .forEach(c => testClassList.add(c));
                    references.filter(r => !path.basename(r.uri.substring('file://'.length), '.cls').endsWith(this.flags.nameconv) &&
                        fs.existsSync(util.format(`${project.getPackageDirectories()[0].fullPath}main/default/classes/%s${this.flags.nameconv}.cls`, path.basename(r.uri, '.cls'))))
                        .map(r => util.format(`%s${this.flags.nameconv}`, path.basename(r.uri, '.cls')))
                        .forEach(c => testClassList.add(c));
                }

                client.didClose({
                    textDocument: {
                        uri: curClass
                    }
                });
            }
            Mdata.log(`Ending analysis with depth = ${curDepth}`, LoggerLevel.INFO);
            curClassList = Array.from(nextClassList);
            isStable = !curClassList.length && this._eqSet(testClassList, prevTestClassList);
            if (isStable) {
                Mdata.log(`Found stable output with depth = ${curDepth}`, LoggerLevel.INFO);
            }
            curDepth++;
        }

        await client.shutdown();
        client.exit();

        if (!this.flags.json) {
            console.log(`-l RunSpecifiedTests -r ${Array.from(testClassList).join(',')}`);
        }

        return Array.from(testClassList);
    }

    // tslint:disable-next-line: no-any
    private _eqSet(as: Set<any>, bs: Set<any>) {
        if (as.size !== bs.size) return false;
        for (const a of as) if (!bs.has(a)) return false;
        return true;
    }
}
