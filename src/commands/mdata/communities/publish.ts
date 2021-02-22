import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, Org } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as cliProgress from 'cli-progress';
import { Mdata } from '../../../mdata';
import { CommunitiesCAPIResponse, CommunitiesPublishCAPIResponse, CommunityWRCAPI, LoggerLevel } from './../../../typeDefs';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class Publish extends SfdxCommand {
  public static description = messages.getMessage('communities.publish.description');

  public static examples = [
`To publish all the communities in the org:
    $ sfdx mdata:communities:publish`,

`To find a community named Customer and publish it:
    $ sfdx mdata:communities:publish -n Customer`,

`To find communities named Customer, Partner and publish them:
    $ sfdx mdata:communities:publish -n Customer,Partner
`,

`To find a community named Customer in Org with alias uat and publish it:
    $ sfdx mdata:communities:publish -n Customer -u uat`,

`To find a community named Customer in Org with username admin.user@uat.myorg.com and publish it:
    $ sfdx mdata:communities:publish -n Customer -u admin.user@uat.myorg.com`
    ];

  protected static flagsConfig = {
    name: flags.string({
      char: 'n',
      description: messages.getMessage('communities.publish.flags.name')
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
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    Mdata.setLogLevel(this.flags.loglevel, this.flags.json);

    this.org = await Org.create({ aliasOrUsername: this.flags.targetusername });
    const names = this.flags.name ? this.flags.name.split(',') : [];

    const conn = this.org.getConnection();

    const communitiesList = ((await conn.request(`${conn.baseUrl()}/connect/communities/`)) as unknown) as CommunitiesCAPIResponse;
    let actualCommunitiesList: CommunityWRCAPI[];

    if (names && names.length) {
      actualCommunitiesList = communitiesList.communities.filter(c => c.siteAsContainerEnabled && names.includes(c.name));
    } else {
      actualCommunitiesList = Array.from(communitiesList.communities).filter(c => c.siteAsContainerEnabled);
    }

    if (!actualCommunitiesList.length) {
      Mdata.log(messages.getMessage('communities.publish.errors.noCommunitiesFound'), LoggerLevel.ERROR);
      return this.flags.json ? messages.getMessage('communities.publish.errors.noCommunitiesFound') : '';
    }

    let bar: cliProgress.SingleBar;
    const publishResults = [];

    if (!this.flags.json) {
      bar = new cliProgress.SingleBar({
        format: messages.getMessage('communities.publish.infos.progressBarFormat')
      }, cliProgress.Presets.shades_classic);
      bar.start(actualCommunitiesList.length, 0, { communityName: actualCommunitiesList[0].name });
    }

    publishResults.push(await actualCommunitiesList.reduce(async (prevPublishPromise, c, i) => {
      const r = await prevPublishPromise;
      if (i) {
        publishResults.push(r);
      }
      if (!this.flags.json) {
        bar.increment(1, { communityName: c.name });
      }
      return conn.request({
        method: 'POST',
        url: `${conn.baseUrl()}/connect/communities/${c.id}/publish`,
        body: '{}'
      });
    }, Promise.resolve<CommunitiesPublishCAPIResponse>(null)));

    if (!this.flags.json) {
      bar.update(actualCommunitiesList.length, { communityName: 'Completed' });

      bar.stop();
    }

    return this.flags.json ? { publishedCommunities: publishResults } : '';
  }
}
