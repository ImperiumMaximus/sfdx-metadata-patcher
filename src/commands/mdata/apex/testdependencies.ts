import { IConfig } from '@oclif/config';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxProject } from '@salesforce/core';
import { SfdxProjectJson } from '@salesforce/core/lib/sfdxProject';
import * as ApexTestRunCommand from '@salesforce/plugin-apex/lib/commands/force/apex/test/run';
import { AnyJson } from '@salesforce/ts-types';
import * as cliProgress from 'cli-progress';
import * as fastFuzzy from 'fast-fuzzy';
import * as fs from 'fs';
import * as glob from 'glob';
import * as jsonQuery from 'json-query';
import * as path from 'path';
import * as prompts from 'prompts';
import * as sqlstring from 'sqlstring';
import { ExcelUtility } from '../../../excelUtility';
import { Mdata } from '../../../mdata';
import { MetadataTypeInfos } from '../../../metadataTypeInfos';
import { LoggerLevel, TranslationDataTable } from '../../../typeDefs';
import { parseXml } from '../../../xmlUtility';

// tslint:disable-next-line: no-var-requires
const intercept = require('intercept-stdout');

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class TestDependencies extends SfdxCommand {
    public static description = messages.getMessage('apex.testdependencies.description');

    public static examples = [
        `To configure the plugin:
    $ sfdx mdata:apex:testdependencies --config`,

        `To find all test dependecies for classes in a delta package in a SFDX project with a specific naming convention for test classes:
    $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml --nameconv _Test`,

        `To find all test dependecies for classes in a delta package in a SFDX project when deploying into production:
    $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml --prod`,

        `To find all test dependecies for classes in a delta package in a SFDX project with a custom fuzzy threshold score:
    $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml --fuzzythreshold 0.75`,

        `To find all test dependecies up to a certain depth in a SFDX project:
    $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml -l 1`,

        `To find all test dependecies for classes in a delta package including ApexCodeCoverage in target org in a SFDX project:
    $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml --usecodecoverage`
    ];

    protected static flagsConfig = {
        config: flags.boolean({
            description: messages.getMessage('apex.testdependencies.flags.config'),
            exclusive: ['metadata', 'nameconv', 'depth', 'manifest', 'destructivemanifest', 'fuzzythreshold', 'usecodecoverage', 'usedependencyapi', 'report', 'outfile']
        }),
        report: flags.boolean({
            description: messages.getMessage('apex.testdependencies.flags.report'),
            exclusive: ['metadata', 'depth', 'manifest', 'destructivemanifest', 'fuzzythreshold', 'usecodecoverage', 'usedependencyapi', 'config']
        }),
        outfile: flags.string({
            description: messages.getMessage('apex.testdependencies.flags.outfile'),
            exclusive: ['metadata', 'depth', 'manifest', 'destructivemanifest', 'fuzzythreshold', 'usecodecoverage', 'usedependencyapi', 'config']
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
        prod: flags.boolean({
            description: messages.getMessage('apex.testdependencies.flags.prod'),
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
    protected sfdxProjectJson: SfdxProjectJson;

    public async run(): Promise<AnyJson> {
        Mdata.setLogLevel(this.flags.loglevel, this.flags.json);

        this.metadataTypeInfos = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'cfg', 'metadata', 'metadataTypeInfos.json')).toString());
        this.project = await SfdxProject.resolve();
        this.sfdxProjectJson = this.project.getSfdxProjectJson();

        if (this.flags.config) {
            return this.configurePlugin();
        } else if (this.flags.report) {
            return this.generateCodeCoverageReport();
        }

        return this.computeDeltaTestClassesList();
    }

    private async computeDeltaTestClassesList(): Promise<AnyJson> {
        const allApexClasses = glob.sync(`${this.project.getPackageDirectories()[0].fullPath}main/default/classes/*.cls`);
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
        let testLevel = this.flags.prod ? 'RunLocalTests' : 'NoTestRun';

        const plugins = this.sfdxProjectJson.get('plugins');
        const pluginConfig = plugins['mdataDeltaTests'];

        if (pluginConfig) {
            const metataTypesToCheck: string[] = Object.keys(pluginConfig);
            for (const metadataType of metataTypesToCheck) {
                if (pluginConfig[metadataType] === 's') {
                    continue;
                }

                const metadataTypePc: string = metadataType[0].toUpperCase() + metadataType.substring(1);
                const deployMembers = jsonQuery(`Package.types[name=${metadataTypePc}].members`, { data: deltaPackageXml }).value || [];
                const destroyMembers = jsonQuery(`Package.types[name=${metadataTypePc}].members`, { data: destructivePackageXml }).value || [];

                if ((deployMembers.length > 0 && (pluginConfig[metadataType] === 'f' || pluginConfig[metadataType].onDeploy === 'f')) ||
                    destroyMembers.length > 0 && (pluginConfig[metadataType] === 'f' || pluginConfig[metadataType].onDestroy === 'f')) {
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

        if (strategy === 'full') {
            if (!this.flags.json) {
                Mdata.log(`-l ${testLevel}`, LoggerLevel.INFO);
            }
            return this.flags.json ? { testLevel, classList: [] } : null;
        }

        if (!frontier.size) {
            testLevel = this.flags.prod ? 'RunLocalTests' : 'NoTestRun';
            if (!this.flags.json) {
                Mdata.log(`-l ${testLevel}`, LoggerLevel.INFO);
            }
            return this.flags.json ? { testLevel, classList: [] } : null;
        }

        if (strategy === 'delta') {
            const curFrontier = new Set<string>(frontier);
            let curDepth = 0;
            while ((this.flags.depth < 0 || curDepth < this.flags.depth) && curFrontier.size) {
                const frontierQueue = Array.from(curFrontier);
                curFrontier.clear();
                while (frontierQueue.length) {
                    const curMember = frontierQueue.splice(0, 1)[0];
                    closedList.add(curMember);
                    Object.keys(apexClassesContentsByName).forEach(apexClass => {
                        let fuzzyRes: fastFuzzy.MatchData<string>;
                        const potentialTestClass = `${apexClass}${this.flags.nameconv}`;
                        if (allApexTestClasses.has(potentialTestClass) && !apexTestClasses.has(potentialTestClass) && apexClassesContentsByName[apexClass].includes(curMember)) {
                            Mdata.log(`Adding Test Class ${potentialTestClass} (exact match) since it depends on ${curMember}`, LoggerLevel.INFO);
                            if (!curFrontier.has(apexClass) && !closedList.has(apexClass)) {
                                curFrontier.add(apexClass);
                            }
                            deltaApexCodeClasses.add(apexClass);
                            apexTestClasses.add(potentialTestClass);
                        } else if (allApexTestClasses.has(potentialTestClass) && !apexTestClasses.has(potentialTestClass) && apexClassesContentsByName[apexClass].match(new RegExp(curMember, 'ig'))) {
                            Mdata.log(`Adding Test Class ${potentialTestClass} (regex match) since it depends on ${curMember}`, LoggerLevel.INFO);
                            if (!curFrontier.has(apexClass) && !closedList.has(apexClass)) {
                                curFrontier.add(apexClass);
                            }
                            deltaApexCodeClasses.add(apexClass);
                            apexTestClasses.add(potentialTestClass);
                        } else if (allApexTestClasses.has(potentialTestClass) && !apexTestClasses.has(potentialTestClass) && ((fuzzyRes = fastFuzzy.fuzzy(curMember, apexClassesContentsByName[apexClass], { useSellers: false, returnMatchData: true })).score >= this.flags.fuzzythreshold)) {
                            Mdata.log(`Adding Test Class ${potentialTestClass} (fuzzy match, score: ${fuzzyRes.score}) since it depends on ${curMember}`, LoggerLevel.INFO);
                            if (!frontier.has(apexClass) && !closedList.has(apexClass)) {
                                curFrontier.add(apexClass);
                            }
                            deltaApexCodeClasses.add(apexClass);
                            apexTestClasses.add(potentialTestClass);
                        }
                    });
                }
                curDepth++;
            }
        }

        if (this.flags.usecodecoverage && deltaApexCodeClasses.size > 0) {
            const coverageRecords: AnyJson[] = await (new Promise((resolve, reject) => {
                const records: AnyJson[] = [];
                this.org.getConnection().tooling.query(`SELECT ApexTestClass.Name, ApexClassOrTrigger.Name FROM ApexCodeCoverage WHERE ApexClassOrTrigger.Name IN (${sqlstring.escape(Array.from(deltaApexCodeClasses))})`)
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

            coverageRecords.filter(coverageRecord => !apexTestClasses.has(coverageRecord['ApexTestClass'].Name) && allApexTestClasses.has(coverageRecord['ApexTestClass'].Name)).forEach(coverageRecord => {
                Mdata.log(`Adding Test Class ${coverageRecord['ApexTestClass'].Name} (ApexCodeCoverage) since it covers ${coverageRecord['ApexClassOrTrigger'].Name}`, LoggerLevel.INFO);
                apexTestClasses.add(coverageRecord['ApexTestClass'].Name);
            });
        }

        if (apexTestClasses.size === 0) {
            if (!this.flags.json) {
                Mdata.log(`-l ${testLevel}`, LoggerLevel.INFO);
            }
            return this.flags.json ? { testLevel, classList: [] } : null;
        } else if (this._eqSet(allApexTestClasses, apexTestClasses)) {
            testLevel = 'RunLocalTests';
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

    private async generateCodeCoverageReport(): Promise<AnyJson> {
        const allApexClasses = glob.sync(`${this.project.getPackageDirectories()[0].fullPath}main/default/classes/*.cls`);
        const allApexNonTestClasses = new Set(allApexClasses.filter(c => !path.basename(c, '.cls').endsWith(this.flags.nameconv)).map(c => path.basename(c, '.cls')));
        const allApexTestClasses = new Set(allApexClasses.filter(c => path.basename(c, '.cls').endsWith(this.flags.nameconv)).map(c => path.basename(c, '.cls')));

        const reportDataTable: TranslationDataTable = { name: this.org.getOrgId(), columns : ['Class', 'Coverage', 'Notes'], rows: [] };

        let bar: cliProgress.SingleBar;

        if (!this.flags.json) {
            bar = new cliProgress.SingleBar({
                format: messages.getMessage('apex.testdependencies.infos.progressBarFormat')
            }, cliProgress.Presets.shades_classic);
            bar.start(allApexNonTestClasses.size, 0, { className: '' });
        }

        for (const apexNonTestClass of allApexNonTestClasses) {
            const row: AnyJson = {};

            if (!this.flags.json) {
                bar.increment(1, { className: apexNonTestClass });
            }

            if (allApexTestClasses.has(`${apexNonTestClass}${this.flags.nameconv}`)) {
                const config: AnyJson = {};
                const unhookIntercept = intercept(() => {
                    return '';
                });
                const coverageResult = await new ApexTestRunCommand.default(['-n', `${apexNonTestClass}${this.flags.nameconv}`, '-c', '-y', '-r', 'json'], config as unknown as IConfig)._run();
                unhookIntercept();
                const coveredPercent = jsonQuery(`coverage.coverage[name=${apexNonTestClass}].coveredPercent`, { data: coverageResult }).value || 0;
                row['Class'] = `"${apexNonTestClass}"`;
                row['Coverage'] = `"${coveredPercent}%"`;
                row['Notes'] = coveredPercent < 75 ? '"Below 75%"' : '';
                reportDataTable.rows.push(row);
            } else {
                row['Class'] = `"${apexNonTestClass}"`;
                row['Coverage'] = '"0%"';
                row['Notes'] = '"Direct Test Class not found"';
                reportDataTable.rows.push(row);
            }
        }

        if (!this.flags.json) {
            bar.stop();
        }

        await ExcelUtility.toExcel([reportDataTable], this.flags.outfile);

        return null;
    }

    private async configurePlugin(): Promise<AnyJson> {
        const pluginConfig: AnyJson = this.sfdxProjectJson.get('plugins') && this.sfdxProjectJson.get('plugins')['mdataDeltaTests'] || {};

        const baseDir = this.project.getPackageDirectories()[0].fullPath;

        for (const metadataTypeName of Object.keys(this.metadataTypeInfos.typeDefs).sort()) {
            const metadataType = this.metadataTypeInfos.typeDefs[metadataTypeName];
            const folderChunks: string[] = [];
            let curMetadataType = metadataType;
            do {
                folderChunks.unshift(`**/${curMetadataType.defaultDirectory}`);
                curMetadataType = curMetadataType.parent;
            } while (curMetadataType);

            if (glob.sync(path.join(baseDir, ...folderChunks)).length) {
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
                        message: `Do you want to specify a different strategy when a component of MetadataType "${metadataType.metadataName}" gets deleted?`,
                        initial: (Object.prototype.hasOwnProperty.call(pluginConfig, sfdxKeyName) && Object.prototype.hasOwnProperty.call(pluginConfig[sfdxKeyName], 'onDestroy')),
                        active: 'yes',
                        inactive: 'no'
                    });
                    if (sepDeleteResponse.strat) {
                        const deleteInitial = (Object.prototype.hasOwnProperty.call(pluginConfig, sfdxKeyName) && Object.prototype.hasOwnProperty.call(pluginConfig[sfdxKeyName], 'onDestroy')) ? choices.findIndex(c => c.value === pluginConfig[sfdxKeyName].onDestroy) : 0;
                        const deleteResponse = await prompts({
                            type: 'select',
                            name: 'strat',
                            message: `Pick the Apex Test Strategy to apply when the MetadataType "${metadataType.metadataName}" appears in the Destructive Changes Deployment.`,
                            choices,
                            initial: deleteInitial
                        });

                        pluginConfig[sfdxKeyName] = {
                            onDeploy: testResponse.strat,
                            onDestroy: deleteResponse.strat
                        };
                    } else {
                        pluginConfig[sfdxKeyName] = testResponse.strat;
                    }
                } else {
                    pluginConfig[sfdxKeyName] = testResponse.strat;
                }
            }
        }

        if (!this.sfdxProjectJson.has('plugins')) {
            this.sfdxProjectJson.set('plugins', {});
        }
        const plugins = this.sfdxProjectJson.get('plugins');
        plugins['mdataDeltaTests'] = pluginConfig;

        this.sfdxProjectJson.set('plugins', plugins);

        await this.sfdxProjectJson.write(this.sfdxProjectJson.getContents());

        Mdata.log('Configuration written to sfdx-project.json', LoggerLevel.INFO);

        return this.flags.json ? pluginConfig : null;
    }

    // tslint:disable-next-line: no-any
    private _eqSet(as: Set<any>, bs: Set<any>) {
        if (as.size !== bs.size) return false;
        for (const a of as) if (!bs.has(a)) return false;
        return true;
    }
}
