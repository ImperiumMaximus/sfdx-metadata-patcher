import * as path from 'node:path'
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages, Org, SfProject } from '@salesforce/core';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { AnyJson } from '@salesforce/ts-types';
import { retrieveMetadataButKeepSubset } from '../../../retrieveUtility';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class ProfileRetrieve extends SfCommand<AnyJson> {

    public static readonly summary = messages.getMessage('profile.retrieve.description');

    public static readonly examples = [
        `To retrieve the profiles in the default package source directory
    $ sfdx mdata:permsets:retrieve`,

        `To retrieve the profiles in the default package source directory from a list of source directories
    $ sfdx mdata:permsets:retrieve -p /path/to/source1,/path/to/source2,/path/to/source3`,

        `To retrieve the profiles in the default package source directory from the default source directory together with components of another directory
    $ sfdx mdata:permsets:retrieve -r /path/to/root/dir`,

        `To retrieve the profiles in the default package source directory from a manifest (package.xml)
    $ sfdx mdata:permsets:retrieve -x manifest/package.xml`,

        `To retrieve the profiles in a specific output folder from the default source directory
    $ sfdx mdata:permsets:retrieve -d /path/to/out/dir`,

        `To retrieve a specific list of profiles in the default package source directory
    $ sfdx mdata:permsets:retrieve -m "Admin,Read Only,Custom: Sales Profile"`

    ];

    public static readonly flags = {
        rootdir: Flags.string({
            char: 'r',
            summary: messages.getMessage('profile.retrieve.flags.rootdir')
        }),
        sourcepath: Flags.string({
            char: 'p',
            summary: messages.getMessage('profile.retrieve.flags.sourcepath')
        }),
        targetusername: Flags.string({
          summary: messages.getMessage('general.flags.targetusername'),
          char: 'u',
        }),
        manifest: Flags.string({
            char: 'x',
            summary: messages.getMessage('profile.retrieve.flags.manifest'),
            default: 'manifest/package.xml'
        }),
        profiles: Flags.string({
            char: 'm',
            summary: messages.getMessage('profile.retrieve.flags.profiles')
        }),
        outdir: Flags.string({
            char: 'd',
            summary: messages.getMessage('profile.retrieve.flags.outdir')
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
    protected static requiresUsername = true;

    // Comment this out if your command does not support a hub org username
    protected static supportsDevhubUsername = false;

    protected actualFlags: {
      rootdir: string;
      sourcepath: string;
      targetusername: string;
      manifest: string;
      profiles: string;
      outdir: string;
      loglevel: string;
    };

    protected org: Org;

    public async run(): Promise<AnyJson> {
        this.actualFlags = (await this.parse(ProfileRetrieve)).flags;

        this.org = await Org.create({ aliasOrUsername: this.actualFlags.targetusername });

        this.log(messages.getMessage('general.infos.usingUsername', [this.org.getUsername()]));

        const project = await SfProject.resolve();

        const paths: string[] = [];

        if (this.actualFlags.sourcepath) {
            paths.push(...this.actualFlags.sourcepath.split(','));
        } else {
            paths.push(project.getDefaultPackage().fullPath);
        }

        if (this.actualFlags.rootdir) {
            paths.push(this.actualFlags.rootdir);
        }

        let outDir = path.join(project.getDefaultPackage().fullPath, 'main', 'default');
        if (this.actualFlags.outdir) {
            outDir = this.actualFlags.outdir;
        }

        const componentSet = ComponentSet.fromSource({
            fsPaths: paths
        });

        const retrievedFiles = await retrieveMetadataButKeepSubset(this.org.getUsername(), componentSet, 'Profile', 'profiles', outDir, this.actualFlags.profiles);

        this.log(messages.getMessage('general.infos.done'));

        return retrievedFiles;
    }
}
