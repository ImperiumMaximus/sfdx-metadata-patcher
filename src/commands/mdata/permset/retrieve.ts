import * as path from 'path';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, Org, SfdxProject } from '@salesforce/core';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { AnyJson } from '@salesforce/ts-types';
import { Mdata } from '../../../mdata';
import { retrieveMetadataButKeepSubset } from '../../../retrieveUtility';
import { LoggerLevel } from '../../../typeDefs';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class PermSetRetrieve extends SfdxCommand {

    public static description = messages.getMessage('profile.retrieve.description');

    public static examples = [
        `To retrieve the permission sets in the default package source directory
    $ sfdx mdata:permsets:retrieve`,

        `To retrieve the permission sets in the default package source directory from a list of source directories
    $ sfdx mdata:permsets:retrieve -p /path/to/source1,/path/to/source2,/path/to/source3`,

        `To retrieve the permission sets in the default package source directory from the default source directory together with components of another directory
    $ sfdx mdata:permsets:retrieve -r /path/to/root/dir`,

        `To retrieve the permission sets in the default package source directory from a manifest (package.xml)
    $ sfdx mdata:permsets:retrieve -x manifest/package.xml`,

        `To retrieve the permission sets in a specific output folder from the default source directory
    $ sfdx mdata:permsets:retrieve -d /path/to/out/dir`,

        `To retrieve a specific list of permission sets in the default package source directory
    $ sfdx mdata:permsets:retrieve -m "MyCoolPermSet1,MyCoolPermSet2"`

    ];

    protected static flagsConfig = {
        rootdir: flags.string({
            char: 'r',
            description: messages.getMessage('permset.retrieve.flags.rootdir')
        }),
        sourcepath: flags.string({
            char: 'p',
            description: messages.getMessage('permset.retrieve.flags.sourcepath')
        }),
        manifest: flags.string({
            char: 'x',
            description: messages.getMessage('permset.retrieve.flags.manifest'),
            default: 'manifest/package.xml'
        }),
        permsets: flags.string({
            char: 'm',
            description: messages.getMessage('permset.retrieve.flags.profiles')
        }),
        outdir: flags.string({
            char: 'd',
            description: messages.getMessage('permset.retrieve.flags.outdir')
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
    protected static requiresUsername = true;

    // Comment this out if your command does not support a hub org username
    protected static supportsDevhubUsername = false;

    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    protected static requiresProject = true;

    public async run(): Promise<AnyJson> {
        Mdata.setLogLevel(this.flags.loglevel, this.flags.json);

        this.org = await Org.create({ aliasOrUsername: this.flags.targetusername });

        Mdata.log(messages.getMessage('general.infos.usingUsername', [this.org.getUsername()]), LoggerLevel.INFO);

        const project = await SfdxProject.resolve();

        const paths: string[] = [];

        if (this.flags.sourcepath) {
            paths.push(...this.flags.sourcepath.split(','));
        } else {
            paths.push(project.getDefaultPackage().fullPath);
        }

        if (this.flags.rootdir) {
            paths.push(this.flags.rootdir);
        }

        let outDir = path.join(project.getDefaultPackage().fullPath, 'main', 'default');
        if (this.flags.outdir) {
            outDir = this.flags.outdir;
        }

        const componentSet = ComponentSet.fromSource({
            fsPaths: paths
        });

        const retrievedFiles = await retrieveMetadataButKeepSubset(this.org.getUsername(), componentSet, 'PermissionSet', 'permissionsets', outDir, this.flags.permsets);

        Mdata.log(messages.getMessage('general.infos.done'), LoggerLevel.INFO);

        if (this.flags.json) {
            return retrievedFiles;
        }

        return null;
    }
}
