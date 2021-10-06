import { flags, SfdxCommand } from '@salesforce/command';
import { Messages , SfdxProject } from '@salesforce/core';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { AnyJson } from '@salesforce/ts-types';
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import { Mdata } from '../../../mdata';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class ManifestSort extends SfdxCommand {

    public static description = messages.getMessage('manifest.align.description');

    public static examples = [
        `To align the manifest from the default package source directory
    $ sfdx mdata:manifest:align -x manifest/package.xml`,

        `To align the manifest from a list of source directories
    $ sfdx mdata:manifest:align -p /path/to/source1,/path/to/source2,/path/to/source3 -x manifest/package.xml`,

        `To align the manifest from the default package source directory together with components of another directory
    $ sfdx mdata:manifest:align -r /path/to/root/dir -x manifest/package.xml`,

        `To align the manifest from the default package source directory with only specific metadata
    $ sfdx mdata:manifest:align -m ApexClass,ApexTrigger,CustomObject -x manifest/package.xml`

    ];

    protected static flagsConfig = {
        rootdir: flags.string({
            char: 'r',
            description: messages.getMessage('manifest.align.flags.rootdir')
        }),
        sourcepath: flags.string({
            char: 'p',
            description: messages.getMessage('manifest.align.flags.sourcepath')
        }),
        manifest: flags.string({
            char: 'x',
            description: messages.getMessage('manifest.align.flags.manifest'),
            default: 'manifest/package.xml'
        }),
        metadata: flags.string({
            char: 'm',
            description: messages.getMessage('manifest.align.flags.metadata')
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

        const paths: string[] = [];

        if (this.flags.sourcepath) {
            paths.push(...this.flags.sourcepath.split(','));
        } else {
            paths.push(project.getDefaultPackage().fullPath);
        }

        if (this.flags.rootdir) {
            paths.push(this.flags.rootdir);
        }

        let include: ComponentSet;
        if (this.flags.metadata) {
            include = new ComponentSet(this.flags.metadata.split(',').map((m: string) => ({ fullName: ComponentSet.WILDCARD, type: m })));
        }

        const componentSet = ComponentSet.fromSource({
            fsPaths: paths,
            include
        });

        const packageXml = componentSet.getPackageXml();

        fs.writeFileSync(this.flags.manifest, packageXml);

        if (this.flags.json) {
            return await (new Promise((resolve, reject) => (new xml2js.Parser({ explicitArray: true }).parseString(packageXml, ((err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            })))));
        }

        return null;
    }
}
