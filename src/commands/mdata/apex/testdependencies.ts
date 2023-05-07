/* eslint-disable no-console */
/* eslint-disable complexity */
import * as fs from 'fs';
import * as path from 'path';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, Org, SfProject, SfProjectJson } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as fastFuzzy from 'fast-fuzzy';
import * as glob from 'glob';
import * as jsonQuery from 'json-query';
import * as prompts from 'prompts';
import * as sqlstring from 'sqlstring';
import { MetadataTypeInfos } from '../../../metadataTypeInfos';
import { parseXml } from '../../../xmlUtility';
import { MetadataType } from '../../../metadataTypeInfos';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

type TestDependenciesFlags = {
  config: boolean;
  nameconv: string;
  depth: number;
  manifest: string;
  destructivemanifest: string;
  fuzzythreshold: string;
  usecodecoverage: boolean;
  prod: boolean;
  loglevel: string;
};

type PluginConfig = {
  [metadataType: string]: 's' | 'f' | 'd' | MetadataSpecificAction;
}

type MetadataSpecificAction = {
  onDeploy: 's' | 'f' | 'd';
  onDestroy: 's' | 'f' | 'd';
}

export default class TestDependencies extends SfCommand<AnyJson> {
    public static readonly summary = messages.getMessage('apex.testdependencies.description');

    public static readonly examples = [
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

    public static readonly flags = {
        config: Flags.boolean({
            summary: messages.getMessage('apex.testdependencies.flags.config'),
            exclusive: ['nameconv', 'depth', 'manifest', 'destructivemanifest', 'fuzzythreshold', 'usecodecoverage']
        }),
        nameconv: Flags.string({
            char: 'n',
            summary: messages.getMessage('apex.testdependencies.flags.nameconv'),
            default: 'Test'
        }),
        depth: Flags.integer({
            char: 'l',
            summary: messages.getMessage('apex.testdependencies.flags.depth'),
            default: -1
        }),
        manifest: Flags.string({
            char: 'x',
            summary: messages.getMessage('apex.testdependencies.flags.manifest'),
            required: false
        }),
        destructivemanifest: Flags.string({
            char: 'd',
            summary: messages.getMessage('apex.testdependencies.flags.destructivemanifest'),
            required: false
        }),
        fuzzythreshold: Flags.string({
            summary: messages.getMessage('apex.testdependencies.flags.fuzzythreshold'),
            default: '.6',
        }),
        usecodecoverage: Flags.boolean({
            summary: messages.getMessage('apex.testdependencies.flags.usecodecoverage'),
            default: false
        }),
        prod: Flags.boolean({
            summary: messages.getMessage('apex.testdependencies.flags.prod'),
            default: false
        }),
        'target-org': Flags.optionalOrg({
          summary: messages.getMessage('general.flags.targetorg'),
          char: 'o',
        }),
        loglevel: Flags.string({
            summary: messages.getMessage('general.flags.loglevel'),
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

    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    public static readonly requiresProject = true;

    // Comment this out if your command does not require an org username
    protected static requiresUsername = false;

    // Comment this out if your command does not support a hub org username
    protected static supportsDevhubUsername = false;

    protected static supportsUsername = true;

    public project: SfProject;

    protected metadataTypeInfos: MetadataTypeInfos;

    protected sfdxProjectJson: SfProjectJson;

    protected actualFlags: TestDependenciesFlags;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static eqSet(as: Set<any>, bs: Set<any>): boolean {
        if (as.size !== bs.size) return false;
        for (const a of as) if (!bs.has(a)) return false;
        return true;
    }

    public async run(): Promise<AnyJson> {
        this.actualFlags = ((await this.parse(TestDependencies)).flags as unknown) as TestDependenciesFlags;

        this.metadataTypeInfos = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'cfg', 'metadata', 'metadataTypeInfos.json')).toString()) as MetadataTypeInfos;
        this.project = await SfProject.resolve();
        this.sfdxProjectJson = this.project.getSfProjectJson();

        if (this.actualFlags.config) {
            return this.configurePlugin();
        }

        return this.computeDeltaTestClassesList();
    }

    private async computeDeltaTestClassesList(): Promise<AnyJson> {
        const allApexClasses = glob.sync(`${this.project.getPackageDirectories()[0].fullPath}main/default/classes/*.cls`);
        const apexClassesContentsByName: {
          [key: string]: string;
        } = allApexClasses.filter(c => !path.basename(c, '.cls').endsWith(this.actualFlags.nameconv)).reduce((acc, f) => {
            acc[path.basename(f, '.cls')] = fs.readFileSync(f).toString();
            return acc;
        }, {});
        const allApexTestClasses = new Set(allApexClasses.filter(c => path.basename(c, '.cls').endsWith(this.actualFlags.nameconv)).map(c => path.basename(c, '.cls')));
        const deltaApexCodeClasses: Set<string> = new Set<string>();

        const deltaPackageXml = await parseXml(this.actualFlags.manifest);
        const destructivePackageXml = await parseXml(this.actualFlags.destructivemanifest);

        let strategy = 'full';
        const frontier: Set<string> = new Set<string>();
        const closedList: Set<string> = new Set<string>();
        const apexTestClasses: Set<string> = new Set<string>();
        let testLevel = 'RunLocalTests';

        const plugins = this.sfdxProjectJson.get('plugins');
        const pluginConfig = plugins['mdataDeltaTests'] as PluginConfig;

        if (pluginConfig) {
            const metataTypesToCheck: string[] = Object.keys(pluginConfig);
            for (const metadataType of metataTypesToCheck) {
                if (pluginConfig[metadataType] === 's') {
                    continue;
                }

                const metadataTypePc: string = metadataType[0].toUpperCase() + metadataType.substring(1);
                const deployMembers: string[] = (jsonQuery(`Package.types[name=${metadataTypePc}].members`, { data: deltaPackageXml }).value as string[]) || [];
                const destroyMembers: string[] = (jsonQuery(`Package.types[name=${metadataTypePc}].members`, { data: destructivePackageXml }).value as string[]) || [];

                if ((deployMembers.length > 0 && (pluginConfig[metadataType] === 'f' || (pluginConfig[metadataType] as MetadataSpecificAction).onDeploy === 'f')) ||
                    destroyMembers.length > 0 && (pluginConfig[metadataType] === 'f' || (pluginConfig[metadataType] as MetadataSpecificAction).onDestroy === 'f')) {
                    strategy = 'full';
                    break;
                }

                strategy = 'delta';

                deployMembers.forEach((member: string) => {
                    if (metadataTypePc === 'ApexClass' && !member.endsWith(this.actualFlags.nameconv)) {
                        deltaApexCodeClasses.add(member);
                    }

                    if (metadataTypePc === 'ApexClass' && member.endsWith(this.actualFlags.nameconv)) {
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
            if (!this.jsonEnabled()) {
                console.log(`-l ${testLevel}`);
            }
            return { testLevel, classList: [] };
        }

        if (!frontier.size) {
            testLevel = this.actualFlags.prod ? 'RunLocalTests' : 'NoTestRun';
            if (!this.jsonEnabled()) {
                console.log(`-l ${testLevel}`);
            }
            return { testLevel, classList: [] };
        }

        if (strategy === 'delta') {
            const curFrontier = new Set<string>(frontier);
            let curDepth = 0;
            while ((this.actualFlags.depth < 0 || curDepth < this.actualFlags.depth) && curFrontier.size) {
                const frontierQueue = Array.from(curFrontier);
                curFrontier.clear();
                while (frontierQueue.length) {
                    const curMember = frontierQueue.splice(0, 1)[0];
                    closedList.add(curMember);
                    Object.keys(apexClassesContentsByName).forEach(apexClass => {
                        let fuzzyRes: fastFuzzy.MatchData<string>;
                        const potentialTestClass = `${apexClass}${this.actualFlags.nameconv}`;
                        if (allApexTestClasses.has(potentialTestClass) && !apexTestClasses.has(potentialTestClass) && apexClassesContentsByName[apexClass].includes(curMember)) {
                            this.log(`Adding Test Class ${potentialTestClass} (exact match) since it depends on ${curMember}`);
                            if (!curFrontier.has(apexClass) && !closedList.has(apexClass)) {
                                curFrontier.add(apexClass);
                            }
                            deltaApexCodeClasses.add(apexClass);
                            apexTestClasses.add(potentialTestClass);
                        } else if (allApexTestClasses.has(potentialTestClass) && !apexTestClasses.has(potentialTestClass) && apexClassesContentsByName[apexClass].match(new RegExp(curMember, 'ig'))) {
                            this.log(`Adding Test Class ${potentialTestClass} (regex match) since it depends on ${curMember}`);
                            if (!curFrontier.has(apexClass) && !closedList.has(apexClass)) {
                                curFrontier.add(apexClass);
                            }
                            deltaApexCodeClasses.add(apexClass);
                            apexTestClasses.add(potentialTestClass);
                        } else if (allApexTestClasses.has(potentialTestClass) && !apexTestClasses.has(potentialTestClass) && ((fuzzyRes = fastFuzzy.fuzzy(curMember, apexClassesContentsByName[apexClass], { useSellers: false, returnMatchData: true })).score >= Number(this.actualFlags.fuzzythreshold))) {
                            this.log(`Adding Test Class ${potentialTestClass} (fuzzy match, score: ${fuzzyRes.score}) since it depends on ${curMember}`);
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

        if (this.actualFlags.usecodecoverage && deltaApexCodeClasses.size > 0) {
            const coverageRecords: Array<{
              [key: string]: {
                Name: string;
              };
            }> = await (new Promise((resolve, reject) => {
                const records: Array<{
                  [key: string]: {
                    Name: string;
                  };
                }> = [];
                void (this.actualFlags['target-org'] as Org).getConnection(this.actualFlags['api-version'] as string).tooling.query(`SELECT ApexTestClass.Name, ApexClassOrTrigger.Name FROM ApexCodeCoverage WHERE ApexClassOrTrigger.Name IN (${sqlstring.escape(Array.from(deltaApexCodeClasses))})`)
                    .on('record', (record: {
                      [key: string]: {
                        Name: string;
                      };
                    }) => {
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
                this.log(`Adding Test Class ${coverageRecord['ApexTestClass'].Name} (ApexCodeCoverage) since it covers ${coverageRecord['ApexClassOrTrigger'].Name}`);
                apexTestClasses.add(coverageRecord['ApexTestClass'].Name);
            });
        }

        if (apexTestClasses.size === 0 || TestDependencies.eqSet(allApexTestClasses, apexTestClasses)) {
            if (!this.jsonEnabled()) {
                console.log(`-l ${testLevel}`);
            }
            return { testLevel, classList: [] };
        } else {
            testLevel = 'RunSpecifiedTests';
            if (!this.jsonEnabled()) {
                console.log(`-l ${testLevel} -r ${Array.from(apexTestClasses).join(',')}`);
            }
            return { testLevel, classList: Array.from(apexTestClasses) };
        }
    }

    private async configurePlugin(): Promise<AnyJson> {
        const pluginConfig = (this.sfdxProjectJson.get('plugins') && this.sfdxProjectJson.get('plugins')['mdataDeltaTests'] || {}) as PluginConfig;

        const baseDir = this.project.getPackageDirectories()[0].fullPath;

        for (const metadataTypeName of Object.keys(this.metadataTypeInfos.typeDefs).sort()) {
            const metadataType = this.metadataTypeInfos.typeDefs[metadataTypeName];
            const folderChunks: string[] = [];
            let curMetadataType: MetadataType | undefined = metadataType;
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
                const initial = Object.prototype.hasOwnProperty.call(pluginConfig, sfdxKeyName) ? choices.findIndex(c => c.value === pluginConfig[sfdxKeyName] || c.value === (pluginConfig[sfdxKeyName] as MetadataSpecificAction).onDeploy) : 0;

                // eslint-disable-next-line no-await-in-loop
                const testResponse = await prompts({
                    type: 'select',
                    name: 'strat',
                    message: `Pick the Apex Test Strategy to apply when the MetadataType "${metadataType.metadataName}" appears in the Delta Deployment.`,
                    choices,
                    initial
                });

                if (testResponse.strat !== 's' && metadataType.deleteSupported) {
                    // eslint-disable-next-line no-await-in-loop
                    const sepDeleteResponse = await prompts({
                        type: 'toggle',
                        name: 'strat',
                        message: `Do you want to specify a different strategy when a component of MetadataType "${metadataType.metadataName}" gets deleted?`,
                        initial: (Object.prototype.hasOwnProperty.call(pluginConfig, sfdxKeyName) && Object.prototype.hasOwnProperty.call(pluginConfig[sfdxKeyName] as MetadataSpecificAction, 'onDestroy')) as boolean,
                        active: 'yes',
                        inactive: 'no'
                    });
                    if (sepDeleteResponse.strat) {
                        const deleteInitial = (Object.prototype.hasOwnProperty.call(pluginConfig, sfdxKeyName) && Object.prototype.hasOwnProperty.call(pluginConfig[sfdxKeyName], 'onDestroy')) ? choices.findIndex(c => c.value === (pluginConfig[sfdxKeyName] as MetadataSpecificAction).onDestroy) : 0;
                        // eslint-disable-next-line no-await-in-loop
                        const deleteResponse = await prompts({
                            type: 'select',
                            name: 'strat',
                            message: `Pick the Apex Test Strategy to apply when the MetadataType "${metadataType.metadataName}" appears in the Destructive Changes Deployment.`,
                            choices,
                            initial: deleteInitial
                        });

                        pluginConfig[sfdxKeyName] = {
                            onDeploy: testResponse.strat as 's' | 'd' | 'f',
                            onDestroy: deleteResponse.strat as  's' | 'd' | 'f'
                        };
                    } else {
                        pluginConfig[sfdxKeyName] = testResponse.strat as 's' | 'd' | 'f';
                    }
                } else {
                    pluginConfig[sfdxKeyName] = testResponse.strat as 's' | 'd' | 'f';
                }
            }
        }

        if (!this.sfdxProjectJson.has('plugins')) {
            this.sfdxProjectJson.set('plugins', {});
        }
        const plugins = this.sfdxProjectJson.get('plugins');
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
        plugins['mdataDeltaTests'] = pluginConfig;

        this.sfdxProjectJson.set('plugins', plugins);

        await this.sfdxProjectJson.write(this.sfdxProjectJson.getContents());

        this.log('Configuration written to sfdx-project.json');

        return pluginConfig;
    }
}
