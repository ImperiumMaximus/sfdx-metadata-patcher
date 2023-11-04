/*
 * mdata:patch command
 * Parses sfdx-project.json plugins.mdataPatches section for applying patches to Salesforce Metadata API Files
 * in order to overcome common issues when deploying certain kind of metadata, e.g. Profiles or other stuff
 * that depends on the usernames.
 * The code structure and functionality takes heavily inspiration from Michele Triaca's (https://github.com/micheletriaca)
 * original implementation using gulp with the legacy "src/" folder structure.
 * This has been ported and adapted to work as a SF CLI plugin supporting the source "force-app" folder structure
 **/
import * as fs from 'node:fs'
import path = require('path');
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages, PackageDir, SfProject } from '@salesforce/core';
import { AnyJson, JsonMap, JsonCollection } from '@salesforce/ts-types';
import * as glob from 'glob';
import * as jsonQuery from 'json-query';
import * as _ from 'lodash';
import { PatchFix, PatchFixes } from '../../typeDefs';
import { parseXml, writeXml } from '../../xmlUtility';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class Patch extends SfCommand<AnyJson> {

    public static readonly summary = messages.getMessage('metadata.patch.description');

    public static readonly flags = {
        env: Flags.string({
            char: 'e',
            default: 'default',
            summary: messages.getMessage('metadata.patch.flags.env')
        }),
        rootdir: Flags.string({
            char: 'r',
            summary: messages.getMessage('metadata.patch.flags.rootdir')
        }),
        mdapimapfile: Flags.string({
            char: 'm',
            summary: messages.getMessage('metadata.patch.flags.mdapimapfile')
        }),
        subpath: Flags.string({
            char: 's',
            default: 'main/default',
            summary: messages.getMessage('metadata.patch.flags.subpath')
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

    protected baseDir: string;
    protected fixes: PatchFixes;
    protected manifest;

    protected actualFlags: {
        env: string;
        rootdir: string;
        mdapimapfile: string;
        subpath: string;
        loglevel: string;
    };

    public static maybeCreateTag(xml: JsonCollection, tag: string, value: []): void {
        if (!Object.prototype.hasOwnProperty.call(xml, tag)) {
            xml[tag] = value;
        }
    }

    public static processConf(xml: JsonMap, conf: PatchFix): void {
        let token: JsonCollection[];
        if (conf.where) {
            const jsonqRes = jsonQuery(conf.where, { data: xml }).value as JsonMap;
            if (!_.isArray(jsonqRes)) token = [jsonqRes];
        } else if (!_.isArray(xml)) token = [xml];
        else token = xml;

        if (!token) return;

        if (conf.replace) {
            _.each(_.keys(conf.replace), t => {
                _.each(token, tk => {
                    tk[t] = conf.replace[t];
                });
            });
        }

        if (conf.concat) {
            _.each(conf.concat, tk => {
                token[0] = Object.assign(token[0], tk);
            });
        }

        if (conf.filter) {
            _.each(conf.filter, valueToFilter => {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete token[0][valueToFilter];
            });
        }

        if (conf.deletePermissionBlocks) {
            _.each(conf.deletePermissionBlocks, perm => {
                if (_.findIndex(token[0]['userPermissions'] as GenericEntity[], (p: GenericEntity) => p.name[0] === perm) !== -1) {
                    _.remove(token[0]['userPermissions'] as GenericEntity[], (p: GenericEntity) => p.name[0] === perm);
                }
            });
        }

        if (conf.disablePermissions && token[0]['userPermissions'] as GenericEntity[]) {
            _.each(conf.disablePermissions, perm => {
                if (_.findIndex(token[0]['userPermissions'] as GenericEntity[], (p: GenericEntity) => p.name[0] === perm) === -1) {
                    Patch.maybeCreateTag(token[0], 'userPermissions', []);
                    (token[0]['userPermissions'] as UserPermission[]).push({
                        enabled: [false],
                        name: [perm]
                    });
                }
            });
        }

        if (conf.deleteListView) {
            _.each(conf.deleteListView, perm => {
                if (_.findIndex(token[0]['listViews'] as GenericEntity[], (p: GenericEntity) => p.fullName[0] === perm) !== -1) {
                    _.remove(token[0]['listViews'] as GenericEntity[], (p: GenericEntity) => p.fullName[0] === perm);
                }
            });
        }

        if (conf.deleteFieldPermissions && token[0]['fieldPermissions'] as CustomField[]) {
            _.each(conf.deleteFieldPermissions, perm => {
                if (_.findIndex( token[0]['fieldPermissions'] as CustomField[], (p: CustomField) => p.field[0] === perm) !== -1) {
                    _.remove( token[0]['fieldPermissions'] as CustomField[], (p: CustomField) => p.field[0] === perm);
                }
            });
        }

        if (conf.disableTabs) {
            _.each(conf.disableTabs, perm => {
                if (_.findIndex(token[0]['tabVisibilities'] as CustomTab[], (t: CustomTab) => t.tab[0] === perm) === -1) {
                    Patch.maybeCreateTag(token[0], 'tabVisibilities', []);
                    (token[0]['tabVisibilities'] as CustomTab[]).push({
                        tab: [perm],
                        visibility: ['Hidden']
                    });
                }
            });
        }

        if (conf.disableApplications) {
            _.each(conf.disableApplications, app => {
                if (_.findIndex(token[0]['applicationVisibilities'] as CustomApplication[], (t: CustomApplication) => t.application[0] === app) === -1) {
                    Patch.maybeCreateTag(token[0], 'applicationVisibilities', []);
                    (token[0]['applicationVisibilities'] as CustomApplication[]).push({
                        application: [app],
                        default: ['false'],
                        visible: ['false']
                    });
                }
            });
        }

        if (conf.enableTabs) {
            _.each(conf.enableTabs, perm => {
                if (_.findIndex(token[0]['tabVisibilities'] as CustomTab[], (t: CustomTab) => t.tab[0] === perm) === -1) {
                    Patch.maybeCreateTag(token[0], 'tabVisibilities', []);
                    (token[0]['tabVisibilities'] as CustomTab[]).push({
                        tab: [perm],
                        visibility: ['DefaultOn']
                    });
                }
            });
        }

        if (conf.disableObjects) {
            _.each(conf.disableObjects, obj => {
                if (_.findIndex((token[0]['objectPermissions'] as ObjectPermission[]), (o: ObjectPermission) => o.object[0] === obj) === -1) {
                    Patch.maybeCreateTag(token[0], 'objectPermissions', []);
                    (token[0]['objectPermissions'] as ObjectPermission[]).push({
                        allowCreate: [false],
                        allowDelete: [false],
                        allowEdit: [false],
                        allowRead: [false],
                        modifyAllRecords: [false],
                        object: [obj],
                        viewAllRecords: [false]
                    });
                }
            });
        }
    }

    public async run(): Promise<AnyJson> {
        this.actualFlags = (await this.parse(Patch)).flags;

        const project = await SfProject.resolve();
        const config: JsonMap = await project.resolveProjectConfig();

        if (!config.plugins?.['mdataPatches']) {
            this.warn(messages.getMessage('metadata.patch.warns.missingConfiguration'));
            return messages.getMessage('metadata.patch.warns.missingConfiguration');
        }

        this.fixes = Object.assign({}, (config.plugins['mdataPatches'] as { [key: string]: PatchFixes })[this.actualFlags.env] || {});
        this.baseDir = path.join(this.actualFlags.rootdir || (config.packageDirectories[0] as PackageDir).path, this.actualFlags.subpath);

        this.log('Base Dir: ' + this.baseDir);

        if (!this.actualFlags.mdapimapfile || !fs.existsSync(this.actualFlags.mdapimapfile)) {
            this.log(messages.getMessage('metadata.patch.infos.executingPreDeployFixes'));
            await this.preDeployFixes();
        }
        this.log(messages.getMessage('general.infos.done'));

        return '';
    }

    public async preDeployFixes(): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        await _.reduce(_.keys(this.fixes), async (prevFixPromise, filePath) => {
            const getGlobFiles = async (p: string): Promise<string[]> => new Promise((resolve, reject) => {
                glob.glob(p, (err, files) => {
                    if (!err) {
                        resolve(files);
                    } else {
                        reject(err);
                    }
                });
            });

            const patchFile = async (f: string): Promise<void> => {
                const xml = await parseXml(f);
                let confs = self.fixes[filePath];
                if (!_.isArray(confs)) confs = [confs];
                _.each(confs, conf => {
                    Patch.processConf(xml, conf);
                });
                writeXml(f, xml);
            };

            await prevFixPromise;
            const pathChunks = filePath.split('/');
            const osAgnosticFilePath = path.join(...pathChunks);
            if (glob.hasMagic(osAgnosticFilePath)) {
                const files = await getGlobFiles(path.join(self.baseDir, osAgnosticFilePath));
                return _.reduce(files, async (prevPatchPromise, f) => {
                    await prevPatchPromise;
                    return patchFile(f);
                }, Promise.resolve());
            } else if (fs.existsSync(path.join(self.baseDir, osAgnosticFilePath))) {
                return patchFile(path.join(self.baseDir, osAgnosticFilePath));
            } else {
                this.warn(messages.getMessage('metadata.patch.warns.missingFile', [path.join(self.baseDir, osAgnosticFilePath)]));
                return Promise.resolve();
            }
        }, Promise.resolve());
    }
}

interface ObjectPermission {
    allowCreate: boolean[];
    allowDelete: boolean[];
    allowEdit: boolean[];
    allowRead: boolean[];
    modifyAllRecords: boolean[];
    object: string[];
    viewAllRecords: boolean[];
}

interface CustomTab {
    tab: string[];
    visibility: string[];
}

interface CustomApplication {
    application: string[];
    default: string[];
    visible: string[];
}

interface CustomField {
    field: string[];
}

interface GenericEntity {
    name?: string[];
    fullName?: string[];
}

interface UserPermission extends GenericEntity {
    enabled?: boolean[];
}
