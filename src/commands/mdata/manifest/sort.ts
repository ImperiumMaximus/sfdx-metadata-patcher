import * as fs from 'fs';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { PackageXml } from '../../../typeDefs';
import { parseXml, writeXml } from '../../../xmlUtility';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class ManifestSort extends SfCommand<AnyJson> {

    public static readonly summary = messages.getMessage('manifest.sort.description');

    public static readonly examples = [
        `To sort the components of a manifest file
    $ sfdx mdata:manifest:sort -x manifest/package.xml`

    ];

    public static readonly flags = {
        manifest: Flags.string({
            char: 'x',
            summary: messages.getMessage('manifest.sort.flags.manifest'),
            required: true
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

    // Comment this out if your command does not require an org username
    protected static requiresUsername = false;

    // Comment this out if your command does not support a hub org username
    protected static supportsDevhubUsername = false;

    protected actualFlags: {
      manifest: string;
      loglevel: string;
    };

    public async run(): Promise<AnyJson> {
        this.actualFlags = (await this.parse(ManifestSort)).flags;

        // eslint-disable-next-line no-console
        console.error(this.actualFlags.manifest);

        if (!fs.existsSync(this.actualFlags.manifest)) {
            this.logToStderr(messages.getMessage('manifest.sort.errors.noInputFileFound'));
            return null;
        }

        let manifestXml: PackageXml;
        try {
            manifestXml = (await parseXml(this.actualFlags.manifest)) as unknown as PackageXml;
        } catch (e) {
            this.logToStderr(messages.getMessage('manifest.sort.errors.badXml', [(e as Error).message]));
            return null;
        }

        manifestXml.Package.types = manifestXml.Package.types.sort((a, b) => a.name[0].localeCompare(b.name[0]));
        manifestXml.Package.types.forEach(t => t.members.sort((a, b) => a.localeCompare(b)));

        try {
            writeXml(this.actualFlags.manifest, manifestXml);
        } catch (e) {
            this.logToStderr(messages.getMessage('manifest.sort.errors.writeXml', [(e as Error).message]));
            return null;
        }

        return manifestXml;
    }
}
