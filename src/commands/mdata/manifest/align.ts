import * as fs from 'fs';
import { Messages , SfdxProject } from '@salesforce/core';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { AnyJson } from '@salesforce/ts-types';
import * as xml2js from 'xml2js';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class ManifestSort extends SfCommand<AnyJson> {

    public static readonly summary = messages.getMessage('manifest.align.description');

    public static readonly examples = [
        `To align the manifest from the default package source directory
    $ sfdx mdata:manifest:align -x manifest/package.xml`,

        `To align the manifest from a list of source directories
    $ sfdx mdata:manifest:align -p /path/to/source1,/path/to/source2,/path/to/source3 -x manifest/package.xml`,

        `To align the manifest from the default package source directory together with components of another directory
    $ sfdx mdata:manifest:align -r /path/to/root/dir -x manifest/package.xml`,

        `To align the manifest from the default package source directory with only specific metadata
    $ sfdx mdata:manifest:align -m ApexClass,ApexTrigger,CustomObject -x manifest/package.xml`

    ];

    public static readonly flags = {
        rootdir: Flags.string({
            char: 'r',
            summary: messages.getMessage('manifest.align.flags.rootdir')
        }),
        sourcepath: Flags.string({
            char: 'p',
            summary: messages.getMessage('manifest.align.flags.sourcepath')
        }),
        manifest: Flags.string({
            char: 'x',
            summary: messages.getMessage('manifest.align.flags.manifest'),
            default: 'manifest/package.xml'
        }),
        metadata: Flags.string({
            char: 'm',
            summary: messages.getMessage('manifest.align.flags.metadata')
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

    protected actualFlags: {
      rootdir: string;
      sourcepath: string;
      manifest: string;
      metadata: string;
      loglevel: string;
    };

    public async run(): Promise<AnyJson> {
        this.actualFlags = (await this.parse(ManifestSort)).flags;

        const project = await SfdxProject.resolve();

        const paths: string[] = [];

        if (this.actualFlags.sourcepath) {
            paths.push(...this.actualFlags.sourcepath.split(','));
        } else {
            paths.push(project.getDefaultPackage().fullPath);
        }

        if (this.actualFlags.rootdir) {
            paths.push(this.actualFlags.rootdir);
        }

        let include: ComponentSet;
        if (this.actualFlags.metadata) {
            include = new ComponentSet(this.actualFlags.metadata.split(',').map((m: string) => ({ fullName: ComponentSet.WILDCARD, type: m })));
        }

        const componentSet = ComponentSet.fromSource({
            fsPaths: paths,
            include
        });

        const packageXml = componentSet.getPackageXml();

        fs.writeFileSync(this.actualFlags.manifest, packageXml);

        if (this.jsonEnabled()) {
            return (new Promise((resolve, reject) => (new xml2js.Parser({ explicitArray: true }).parseString(packageXml, ((err, result: AnyJson) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            })))));
        }

        return null;
    }
}
