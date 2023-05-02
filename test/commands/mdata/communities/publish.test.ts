import { expect, test } from '@salesforce/command/lib/test';
import { Messages } from '@salesforce/core';
import { AnyJson, ensureJsonMap, ensureString } from '@salesforce/ts-types';
import { CommunitiesPublishCAPIResponse, CommunitiesCAPIResponse } from '../../../../src/typeDefs';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

describe('mdata:communities:publish', () => {
  test
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest((request: AnyJson) => {
      if (typeof request == 'object' && ensureJsonMap(request) && ensureString(request?.['url']).match(/\/connect\/communities\/[a-zA-Z0-9]+\/publish/)) {
        return Promise.resolve<CommunitiesPublishCAPIResponse>({
          id: '132562476',
          message: 'We are publishing your changes now. You will receive an email confirmation when your changes are live.',
          name: 'FakeCommunity',
          url: 'fake url'
        });
      } else if (typeof request == 'string' && ensureString(request).match(/\/connect\/communities\//)) {
        return Promise.resolve<CommunitiesCAPIResponse>({
          communities: [
            {
              allowChatterAccessWithoutLogin: false,
              allowMembersToFlag: false,
              description: null,
              guestMemberVisibilityEnabled: false,
              id: '132562476',
              invitationsEnabled: false,
              knowledgeableEnabled: false,
              loginUrl: 'fake login url',
              memberVisibilityEnabled: false,
              name: 'FakeCommunity',
              nicknameDisplayEnabled: false,
              privateMessagesEnabled: false,
              reputationEnabled: false,
              sendWelcomeEmail: false,
              siteAsContainerEnabled: true,
              siteUrl: 'fake site url',
              status: 'UnderConstruction',
              templateName: 'fake template',
              url: 'fake url',
              urlPathPrefix: 'fake'
            }
          ],
          total: 1
        });
      }
      return Promise.resolve({});
    })
    .stdout()
    .command(['mdata:communities:publish',  '--targetusername', 'test@org.com'])
    .it('publishes all communities with targetusername test@org.com', ctx => {
      expect(ctx.stdout).to.equal('');
    })

  test
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest((request: AnyJson) => {
      if (typeof request == 'object' && ensureJsonMap(request) && ensureString(request?.['url']).match(/\/connect\/communities\/[a-zA-Z0-9]+\/publish/)) {
        return Promise.resolve<CommunitiesPublishCAPIResponse>({
          id: '132562476',
          message: 'We are publishing your changes now. You will receive an email confirmation when your changes are live.',
          name: 'FakeCommunity',
          url: 'fake url'
        });
      } else if (typeof request == 'string' && ensureString(request).match(/\/connect\/communities\//)) {
        return Promise.resolve<CommunitiesCAPIResponse>({
          communities: [
            {
              allowChatterAccessWithoutLogin: false,
              allowMembersToFlag: false,
              description: null,
              guestMemberVisibilityEnabled: false,
              id: '132562476',
              invitationsEnabled: false,
              knowledgeableEnabled: false,
              loginUrl: 'fake login url',
              memberVisibilityEnabled: false,
              name: 'FakeCommunity',
              nicknameDisplayEnabled: false,
              privateMessagesEnabled: false,
              reputationEnabled: false,
              sendWelcomeEmail: false,
              siteAsContainerEnabled: true,
              siteUrl: 'fake site url',
              status: 'UnderConstruction',
              templateName: 'fake template',
              url: 'fake url',
              urlPathPrefix: 'fake'
            }
          ],
          total: 1
        });
      }
      return Promise.resolve({});
    })
    .stdout()
    .command(['mdata:communities:publish',  '--targetusername', 'test@org.com', '--json'])
    .it('publishes all communities with targetusername test@org.com with json output', ctx => {
      expect(ctx.stdout).to.contain(`{
        "id": "132562476",
        "message": "We are publishing your changes now. You will receive an email confirmation when your changes are live.",
        "name": "FakeCommunity",
        "url": "fake url"
      }`);
    })

    test
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest((request: AnyJson) => {
      if (typeof request == 'object' && ensureJsonMap(request) && ensureString(request?.['url']).match(/\/connect\/communities\/132562477\/publish/)) {
        return Promise.resolve<CommunitiesPublishCAPIResponse>({
          id: '132562477',
          message: 'We are publishing your changes now. You will receive an email confirmation when your changes are live.',
          name: 'FakeCommunity',
          url: 'fake url'
        });
      } else if (typeof request == 'string' && ensureString(request).match(/\/connect\/communities\//)) {
        return Promise.resolve<CommunitiesCAPIResponse>({
          communities: [
            {
              allowChatterAccessWithoutLogin: false,
              allowMembersToFlag: false,
              description: null,
              guestMemberVisibilityEnabled: false,
              id: '132562476',
              invitationsEnabled: false,
              knowledgeableEnabled: false,
              loginUrl: 'fake login url',
              memberVisibilityEnabled: false,
              name: 'FakeCommunity2',
              nicknameDisplayEnabled: false,
              privateMessagesEnabled: false,
              reputationEnabled: false,
              sendWelcomeEmail: false,
              siteAsContainerEnabled: true,
              siteUrl: 'fake site url',
              status: 'UnderConstruction',
              templateName: 'fake template',
              url: 'fake url',
              urlPathPrefix: 'fake'
            },
            {
              allowChatterAccessWithoutLogin: false,
              allowMembersToFlag: false,
              description: null,
              guestMemberVisibilityEnabled: false,
              id: '132562477',
              invitationsEnabled: false,
              knowledgeableEnabled: false,
              loginUrl: 'fake login url',
              memberVisibilityEnabled: false,
              name: 'FakeCommunity',
              nicknameDisplayEnabled: false,
              privateMessagesEnabled: false,
              reputationEnabled: false,
              sendWelcomeEmail: false,
              siteAsContainerEnabled: true,
              siteUrl: 'fake site url',
              status: 'UnderConstruction',
              templateName: 'fake template',
              url: 'fake url',
              urlPathPrefix: 'fake'
            }
          ],
          total: 1
        });
      }
      return Promise.resolve({});
    })
    .stdout()
    .command(['mdata:communities:publish',  '--targetusername', 'test@org.com', '--json', '-n', 'FakeCommunity'])
    .it('publishes named community with targetusername test@org.com with json output', ctx => {
      expect(ctx.stdout).to.contain(`{
        "id": "132562477",
        "message": "We are publishing your changes now. You will receive an email confirmation when your changes are live.",
        "name": "FakeCommunity",
        "url": "fake url"
      }`);
      expect(ctx.stdout).to.not.contain(`{
        "id": "132562476",
        "message": "We are publishing your changes now. You will receive an email confirmation when your changes are live.",
        "name": "FakeCommunity2",
        "url": "fake url"
      }`);
    })

    test
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest((request: AnyJson) => {
      if (typeof request == 'object' && ensureJsonMap(request) && ensureString(request?.['url']).match(/\/connect\/communities\/132562477\/publish/)) {
        return Promise.resolve<CommunitiesPublishCAPIResponse>({
          id: '132562477',
          message: 'We are publishing your changes now. You will receive an email confirmation when your changes are live.',
          name: 'FakeCommunity',
          url: 'fake url'
        });
      } else if (typeof request == 'object' && ensureJsonMap(request) && ensureString(request?.['url']).match(/\/connect\/communities\/132562476\/publish/)) {
        return Promise.resolve<CommunitiesPublishCAPIResponse>({
          id: '132562476',
          message: 'We are publishing your changes now. You will receive an email confirmation when your changes are live.',
          name: 'FakeCommunity2',
          url: 'fake url'
        });
      } else if (typeof request == 'string' && ensureString(request).match(/\/connect\/communities\//)) {
        return Promise.resolve<CommunitiesCAPIResponse>({
          communities: [
            {
              allowChatterAccessWithoutLogin: false,
              allowMembersToFlag: false,
              description: null,
              guestMemberVisibilityEnabled: false,
              id: '132562476',
              invitationsEnabled: false,
              knowledgeableEnabled: false,
              loginUrl: 'fake login url',
              memberVisibilityEnabled: false,
              name: 'FakeCommunity2',
              nicknameDisplayEnabled: false,
              privateMessagesEnabled: false,
              reputationEnabled: false,
              sendWelcomeEmail: false,
              siteAsContainerEnabled: true,
              siteUrl: 'fake site url',
              status: 'UnderConstruction',
              templateName: 'fake template',
              url: 'fake url',
              urlPathPrefix: 'fake'
            },
            {
              allowChatterAccessWithoutLogin: false,
              allowMembersToFlag: false,
              description: null,
              guestMemberVisibilityEnabled: false,
              id: '132562477',
              invitationsEnabled: false,
              knowledgeableEnabled: false,
              loginUrl: 'fake login url',
              memberVisibilityEnabled: false,
              name: 'FakeCommunity',
              nicknameDisplayEnabled: false,
              privateMessagesEnabled: false,
              reputationEnabled: false,
              sendWelcomeEmail: false,
              siteAsContainerEnabled: true,
              siteUrl: 'fake site url',
              status: 'UnderConstruction',
              templateName: 'fake template',
              url: 'fake url',
              urlPathPrefix: 'fake'
            }
          ],
          total: 1
        });
      }
      return Promise.resolve({});
    })
    .stdout()
    .command(['mdata:communities:publish',  '--targetusername', 'test@org.com', '--json'])
    .it('publishes all communities (2) with targetusername test@org.com with json output', ctx => {
      expect(ctx.stdout).to.contain(`{
        "id": "132562477",
        "message": "We are publishing your changes now. You will receive an email confirmation when your changes are live.",
        "name": "FakeCommunity",
        "url": "fake url"
      }`);
      expect(ctx.stdout).to.contain(`{
        "id": "132562476",
        "message": "We are publishing your changes now. You will receive an email confirmation when your changes are live.",
        "name": "FakeCommunity2",
        "url": "fake url"
      }`);
    })

    test
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest((request: AnyJson) => {
      if (typeof request == 'object' && ensureJsonMap(request) && ensureString(request?.['url']).match(/\/connect\/communities\/[a-zA-Z0-9]+\/publish/)) {
        return Promise.resolve<CommunitiesPublishCAPIResponse>({
          id: '132562476',
          message: 'We are publishing your changes now. You will receive an email confirmation when your changes are live.',
          name: 'FakeCommunity',
          url: 'fake url'
        });
      } else if (typeof request == 'string' && ensureString(request).match(/\/connect\/communities\//)) {
        return Promise.resolve<CommunitiesCAPIResponse>({
          communities: [
            {
              allowChatterAccessWithoutLogin: false,
              allowMembersToFlag: false,
              description: null,
              guestMemberVisibilityEnabled: false,
              id: '132562476',
              invitationsEnabled: false,
              knowledgeableEnabled: false,
              loginUrl: 'fake login url',
              memberVisibilityEnabled: false,
              name: 'FakeCommunity',
              nicknameDisplayEnabled: false,
              privateMessagesEnabled: false,
              reputationEnabled: false,
              sendWelcomeEmail: false,
              siteAsContainerEnabled: true,
              siteUrl: 'fake site url',
              status: 'UnderConstruction',
              templateName: 'fake template',
              url: 'fake url',
              urlPathPrefix: 'fake'
            }
          ],
          total: 1
        });
      }
      return Promise.resolve({});
    })
    .stdout()
    .command(['mdata:communities:publish',  '--targetusername', 'test@org.com', '--json', '-n', 'FakeCommunity2'])
    .it('should throw an error if the community is not found', ctx => {
      expect(ctx.stdout).to.contain(messages.getMessage('communities.publish.errors.noCommunitiesFound'));
    })
})
