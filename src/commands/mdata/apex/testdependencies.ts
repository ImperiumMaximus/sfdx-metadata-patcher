import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxProject } from '@salesforce/core';
import { ProjectJson } from '@salesforce/core/lib/sfdxProject';
import { AnyJson } from '@salesforce/ts-types';
import * as fastFuzzy from 'fast-fuzzy';
import * as fs from 'fs';
import * as glob from 'glob';
import * as jsonQuery from 'json-query';
import * as path from 'path';
import * as prompts from 'prompts';
import * as sqlstring from 'sqlstring';
/*import simpleGit, { SimpleGit } from 'simple-git';
import * as util from 'util';*/
import { Mdata } from '../../../mdata';
import { MetadataTypeInfos } from '../../../metadataTypeInfos';
import { LoggerLevel } from '../../../typeDefs';
import { parseXml } from '../../../xmlUtility';

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
        config: flags.boolean({
            description: messages.getMessage('apex.testdependencies.flags.config'),
            exclusive: ['metadata', 'nameconv', 'depth', 'from', 'to', 'manifest', 'destructivemanifest', 'fuzzythreshold', 'usecodecoverage', 'usedependencyapi']
        }),
        metadata: flags.string({
            char: 'm',
            description: messages.getMessage('apex.testdependencies.flags.metadata'),
            required: false
        }),
        nameconv: flags.string({
            char: 'n',
            description: messages.getMessage('apex.testdependencies.flags.nameconv'),
            default: 'Test'
        }),
        depth: flags.number({
            char: 'l',
            description: messages.getMessage('apex.testdependencies.flags.depth'),
            default: -1
        }),
        from: flags.string({
            char: 'f',
            description: messages.getMessage('apex.testdependencies.flags.from'),
            required: false
        }),
        to: flags.string({
            char: 't',
            description: messages.getMessage('apex.testdependencies.flags.to'),
            default: 'HEAD',
            required: false
        }),
        manifest: flags.string({
            char: 'x',
            description: messages.getMessage('apex.testdependencies.flags.manifest'),
            required: false
        }),
        destructivemanifest: flags.string({
            char: 'd',
            description: messages.getMessage('apex.testdependencies.flags.destructivemanifest'),
            required: false
        }),
        fuzzythreshold: flags.number({
            description: messages.getMessage('apex.testdependencies.flags.fuzzythreshold'),
            default: .6
        }),
        usecodecoverage: flags.boolean({
            description: messages.getMessage('apex.testdependencies.flags.usecodecoverage'),
            default: false
        }),
        usedependencyapi: flags.boolean({
            description: messages.getMessage('apex.testdependencies.flags.usedependencyapi'),
            default: false
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

    protected static supportsUsername = true;

    protected metadataTypeInfos: MetadataTypeInfos;

    protected project: SfdxProject;
    protected sfdxProjectJson: ProjectJson;

    // private git: SimpleGit;

    public async run(): Promise<AnyJson> {
        Mdata.setLogLevel(this.flags.loglevel, this.flags.json);

        this.metadataTypeInfos = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'node_modules', 'salesforce-alm', 'metadata', 'metadataTypeInfos.json')).toString());
        this.project = await SfdxProject.resolve();
        this.sfdxProjectJson = this.project.getSfdxProjectJson().getContents();

        if (this.flags.config) {
            return this.configurePlugin();
        }

        return this.computeDeltaTestClassesList();

        /*this.git = simpleGit(process.cwd(), { binary: 'git' });

        if (!(await this.git.checkIsRepo())) {
            Mdata.log('Not a git repo', LoggerLevel.ERROR);
            return 'Not a git repo';
        }

        const commitsList = (await this.git.raw(['rev-list', '--max-parents=1', `${this.flags.from}..${this.flags.to}`])).trim().split('\n');

        const packageXml = await parseXml(this.flags.manifest);

        Mdata.log(JSON.stringify(packageXml), LoggerLevel.DEBUG);

        const deltaApexClasses = jsonQuery('Package.types[name=ApexClass].members', { data: packageXml }).value.reduce((acc, c: string) => {
            if (c.endsWith(this.flags.nameconv)) {
                acc.tests.push(c);
            } else {
                acc.code.push(c);
            }
            return acc;
        }, { tests: [], code: []}); */

       /* const apexTestClasses: Set<string> = new Set(deltaApexClasses.tests);

        deltaApexClasses.code.forEach(deltaApexClass => {
            Object.keys(apexClassesContentsByName).forEach(apexClass => {
                let fuzzyRes: fastFuzzy.MatchData<string>;
                const potentialTestClass = `${apexClass}${this.flags.nameconv}`;
                if (apexClassesContentsByName[apexClass].includes(deltaApexClass) && allApexTestClasses.has(potentialTestClass)) {
                    Mdata.log(`Adding Test Class ${potentialTestClass} (exact match)`, LoggerLevel.INFO);
                    apexTestClasses.add(potentialTestClass);
                } else if (apexClassesContentsByName[apexClass].match(new RegExp(deltaApexClass, 'ig')) && allApexTestClasses.has(potentialTestClass)) {
                    Mdata.log(`Adding Test Class ${potentialTestClass} (regex match)`, LoggerLevel.INFO);
                    apexTestClasses.add(potentialTestClass);
                } else if (((fuzzyRes = fastFuzzy.fuzzy(deltaApexClass, apexClassesContentsByName[apexClass], { returnMatchData: true })).score >= this.flags.fuzzythreshold) && allApexTestClasses.has(potentialTestClass)) {
                    Mdata.log(`Adding Test Class ${potentialTestClass} (fuzzy match, score: ${fuzzyRes.score})`, LoggerLevel.INFO);
                    apexTestClasses.add(potentialTestClass);
                }
            });
        });

        if (apexTestClasses.size === 0 || this._eqSet(allApexTestClasses, apexTestClasses)) {
            console.log('-l RunLocalTests');
        } else {
            console.log(`-l RunSpecifiedTests -r ${Array.from(apexTestClasses).join(',')}`);
        }

        return this.flags.json ? Array.from(apexTestClasses) : null;
        return null;*/
    }

    private async getGlobFiles(p: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            glob.glob(p, (err, files) => {
                if (!err) {
                    resolve(files);
                } else {
                    reject(err);
                }
            });
        });
    }

    private async computeDeltaTestClassesList(): Promise<AnyJson> {
        const allApexClasses = await this.getGlobFiles(`${this.project.getPackageDirectories()[0].fullPath}main/default/classes/*.cls`);
        const apexClassesContentsByName = allApexClasses.filter(c => !path.basename(c, '.cls').endsWith(this.flags.nameconv)).reduce((acc, f) => {
            acc[path.basename(f, '.cls')] = fs.readFileSync(f).toString();
            return acc;
        }, {});
        const allApexTestClasses = new Set(allApexClasses.filter(c => path.basename(c, '.cls').endsWith(this.flags.nameconv)).map(c => path.basename(c, '.cls')));
        const deltaApexCodeClasses: Set<string> = new Set<string>();

        const deltaPackageXml = await parseXml(this.flags.manifest);
        const destructivePackageXml = await parseXml(this.flags.destructivemanifest);

        let strategy = 'full';
        const frontier: Set<string> = new Set<string>();
        const closedList: Set<string> = new Set<string>();
        const apexTestClasses: Set<string> = new Set<string>();
        let testLevel = 'RunLocalTest';

        if (Object.prototype.hasOwnProperty.call(this.sfdxProjectJson, 'plugins') &&
            Object.prototype.hasOwnProperty.call(this.sfdxProjectJson.plugins, 'mdataDeltaTests')) {

            const metataTypesToCheck: string[] = Object.keys(this.sfdxProjectJson.plugins.mdataDeltaTests);
            for (const metadataType of metataTypesToCheck) {
                if (this.sfdxProjectJson.plugins.mdataDeltaTests[metadataType] === 's') {
                    continue;
                }

                const metadataTypePc: string = metadataType[0].toUpperCase() + metadataType.substring(1);
                const deployMembers = jsonQuery(`Package.types[name=${metadataTypePc}].members`, { data: deltaPackageXml }).value || [];
                const destroyMembers = jsonQuery(`Package.types[name=${metadataTypePc}].members`, { data: destructivePackageXml }).value || [];

                if ((deployMembers.length > 0 && (this.sfdxProjectJson.plugins.mdataDeltaTests[metadataType] === 'f' || this.sfdxProjectJson.plugins.mdataDeltaTests[metadataType].onDeploy === 'f')) ||
                    destroyMembers.length > 0 && (this.sfdxProjectJson.plugins.mdataDeltaTests[metadataType] === 'f' || this.sfdxProjectJson.plugins.mdataDeltaTests[metadataType].onDestroy === 'f')) {
                    strategy = 'full';
                    break;
                }

                strategy = 'delta';

                deployMembers.forEach((member: string) => {
                    if (metadataTypePc === 'ApexClass' && !member.endsWith(this.flags.nameconv)) {
                        deltaApexCodeClasses.add(member);
                    }

                    if (metadataTypePc === 'ApexClass' && member.endsWith(this.flags.nameconv)) {
                        apexTestClasses.add(member);
                    } else {
                        frontier.add(member);
                        while (member.includes('.')) {
                            member = member.substring(member.indexOf('.') + 1);
                            frontier.add(member);
                        }
                    }
                });

                destroyMembers.forEach((member: string) => {
                    frontier.add(member);
                    while (member.includes('.')) {
                        member = member.substring(member.indexOf('.') + 1);
                        frontier.add(member);
                    }
                });
            }
        }

        if (!frontier.size) {
            testLevel = 'NoTestRun';
            if (!this.flags.json) {
                Mdata.log(`-l ${testLevel}`, LoggerLevel.INFO);
            }
            return this.flags.json ? { testLevel, classList: [] } : null;
        }

        if (strategy === 'full') {
            if (!this.flags.json) {
                Mdata.log(`-l ${testLevel}`, LoggerLevel.INFO);
            }
            return this.flags.json ? { testLevel, classList: [] } : null;
        }

        if (strategy === 'delta') {
            const frontierQueue = Array.from(frontier);
            let curDepth = 0;
            while ((this.flags.depth < 0 || curDepth < this.flags.depth) && frontierQueue.length) {
                const curMember = frontierQueue.splice(0, 1)[0];
                closedList.add(curMember);
                Object.keys(apexClassesContentsByName).forEach(apexClass => {
                    let fuzzyRes: fastFuzzy.MatchData<string>;
                    const potentialTestClass = `${apexClass}${this.flags.nameconv}`;
                    if (apexClassesContentsByName[apexClass].includes(curMember) && allApexTestClasses.has(potentialTestClass)) {
                        Mdata.log(`Adding Test Class ${potentialTestClass} (exact match) since it depends on ${curMember}`, LoggerLevel.INFO);
                        if (!frontier.has(apexClass) && !closedList.has(apexClass)) {
                            frontierQueue.push(apexClass);
                        }
                        deltaApexCodeClasses.add(apexClass);
                        apexTestClasses.add(potentialTestClass);
                    } else if (apexClassesContentsByName[apexClass].match(new RegExp(curMember, 'ig')) && allApexTestClasses.has(potentialTestClass)) {
                        Mdata.log(`Adding Test Class ${potentialTestClass} (regex match) since it depends on ${curMember}`, LoggerLevel.INFO);
                        if (!frontier.has(apexClass) && !closedList.has(apexClass)) {
                            frontierQueue.push(apexClass);
                        }
                        deltaApexCodeClasses.add(apexClass);
                        apexTestClasses.add(potentialTestClass);
                    } else if (((fuzzyRes = fastFuzzy.fuzzy(curMember, apexClassesContentsByName[apexClass], { useSellers: false, returnMatchData: true })).score >= this.flags.fuzzythreshold) && allApexTestClasses.has(potentialTestClass)) {
                        Mdata.log(`Adding Test Class ${potentialTestClass} (fuzzy match, score: ${fuzzyRes.score}) since it depends on ${curMember}`, LoggerLevel.INFO);
                        if (!frontier.has(apexClass) && !closedList.has(apexClass)) {
                            frontierQueue.push(apexClass);
                        }
                        deltaApexCodeClasses.add(apexClass);
                        apexTestClasses.add(potentialTestClass);
                    }
                });
                curDepth++;
            }
        }

        if (this.flags.usecodecoverage && deltaApexCodeClasses.size > 0) {
            const coverageRecords: AnyJson[] = await (new Promise((resolve, reject) => {
                const records: AnyJson[] = [];
                this.org.getConnection().tooling.query(`SELECT ApexTestClass.Name FROM ApexCodeCoverage WHERE ApexClassOrTrigger.Name IN (${sqlstring.escape(Array.from(deltaApexCodeClasses))})`)
                    .on('record', record => {
                        records.push(record);
                    })
                    .on('error', err => {
                        reject(err);
                    })
                    .on('end', () => {
                        resolve(records);
                    })
                    .run({ autoFetch: true, maxFetch: 1000000 });
            }));

            coverageRecords.forEach(coverageRecord => {
                apexTestClasses.add(coverageRecord['ApexTestClass'].Name);
            });
        }

        if (apexTestClasses.size === 0 || this._eqSet(allApexTestClasses, apexTestClasses)) {
            if (!this.flags.json) {
                Mdata.log(`-l ${testLevel}`, LoggerLevel.INFO);
            }
            return this.flags.json ? { testLevel, classList: [] } : null;
        } else {
            testLevel = 'RunSpecifiedTests';
            if (!this.flags.json) {
                Mdata.log(`-l ${testLevel} -r ${Array.from(apexTestClasses).join(',')}`, LoggerLevel.INFO);
            }
            return this.flags.json ? { testLevel, classList: Array.from(apexTestClasses) } : null;
        }
    }

    private async configurePlugin(): Promise<AnyJson> {
        let pluginConfig: AnyJson = {};

        if (Object.prototype.hasOwnProperty.call(this.sfdxProjectJson, 'plugins') &&
            Object.prototype.hasOwnProperty.call(this.sfdxProjectJson.plugins, 'mdataDeltaTests')) {
            pluginConfig = Object.assign({}, this.sfdxProjectJson.plugins['mdataDeltaTests']);
        }

        const baseDir = path.join(this.project.getPackageDirectories()[0].fullPath, 'main', 'default');

        for (const metadataTypeName of Object.keys(this.metadataTypeInfos.typeDefs).sort()) {
            const metadataType = this.metadataTypeInfos.typeDefs[metadataTypeName];
            const folderChunks = [];
            let curMetadataType = metadataType;
            while (curMetadataType.parent) {
                folderChunks.push(curMetadataType.defaultDirectory);
                curMetadataType = curMetadataType.parent;
            }
            folderChunks.push(metadataType.defaultDirectory);

            if (fs.existsSync(path.join(baseDir, ...folderChunks))) {
                const sfdxKeyName = metadataType.metadataName[0].toString().toLowerCase() + metadataType.metadataName.substring(1);
                const choices = [
                    { title: 'Full', value: 'f' },
                    { title: 'Delta', value: 'd' },
                    { title: 'Skip', value: 's' }
                ];
                const initial = Object.prototype.hasOwnProperty.call(pluginConfig, sfdxKeyName) ? choices.findIndex(c => c.value === pluginConfig[sfdxKeyName] || c.value === pluginConfig[sfdxKeyName].onDeploy) : 0;

                const testResponse = await prompts({
                    type: 'select',
                    name: 'strat',
                    message: `Pick the Apex Test Strategy to apply when the MetadataType "${metadataType.metadataName}" appears in the Delta Deployment.`,
                    choices,
                    initial
                });

                if (testResponse.strat !== 's' && metadataType.deleteSupported) {
                    const sepDeleteResponse = await prompts({
                        type: 'toggle',
                        name: 'strat',
                        message: `Do you want to specify a different strategy when a component of MetadataType "${metadataType.metadataName}" get deleted?`,
                        initial: (Object.prototype.hasOwnProperty.call(pluginConfig, sfdxKeyName) && Object.prototype.hasOwnProperty.call(pluginConfig[sfdxKeyName], 'onDestroy')),
                        active: 'yes',
                        inactive: 'no'
                    });
                    if (sepDeleteResponse.strat) {
                        const deleteInitial = (Object.prototype.hasOwnProperty.call(pluginConfig, sfdxKeyName) && Object.prototype.hasOwnProperty.call(pluginConfig[sfdxKeyName], 'onDestroy')) ? choices.findIndex(c => c.value === pluginConfig[sfdxKeyName].onDestroy) : 0;
                        const deleteResponse = await prompts({
                            type: 'select',
                            name: 'stat',
                            message: `Pick the Apex Test Strategy to apply when the MetadataType "${metadataType.metadataName}" appears in the Destructive Changes Deployment.`,
                            choices,
                            initial: deleteInitial
                        });

                        pluginConfig[sfdxKeyName] = {
                            onDeploy: testResponse.strat,
                            onDestroy: deleteResponse.stat
                        };
                    } else {
                        pluginConfig[sfdxKeyName] = testResponse.strat;
                    }
                } else {
                    pluginConfig[sfdxKeyName] = testResponse.strat;
                }
            }
        }

        if (!this.sfdxProjectJson.plugins) {
            this.sfdxProjectJson.plugins = {};
        }

        this.sfdxProjectJson.plugins.mdataDeltaTests = pluginConfig;

        await this.project.getSfdxProjectJson().write(this.sfdxProjectJson);

        return this.flags.json ? pluginConfig : null;
    }

    // tslint:disable-next-line: no-any
    private _eqSet(as: Set<any>, bs: Set<any>) {
        if (as.size !== bs.size) return false;
        for (const a of as) if (!bs.has(a)) return false;
        return true;
    }
}
