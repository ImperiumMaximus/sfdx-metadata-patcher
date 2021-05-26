import { Command, Hook } from '@oclif/config';

export type HookFunction = (this: Hook.Context, options: HookOptions) => void;

export type HookOptions = {
  Command: Command.Class;
  argv: string[];
  commandId: string;
  result?: PreDeployResult;
};

export type PreDeployResult = {
  [aggregateName: string]: {
    mdapiFilePath: string;
    workspaceElements: WorkspaceElement[];
  };
};

export type WorkspaceElement = {
  fullName: string;
  metadataName: string;
  sourcePath: string;
  state: string;
  deleteSupported: boolean;
};

export type WorkspaceMdapiElement = WorkspaceElement & { mdapiFilePath: string, mdapiType: string };

export enum LoggerLevel {
  TRACE = 10,
  DEBUG = 20,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  FATAL = 60
}

export type CommunitiesCAPIResponse = {
  communities: CommunityWRCAPI[],
  total: number
};

export type CommunityWRCAPI = {
  allowChatterAccessWithoutLogin: boolean,
  allowMembersToFlag: boolean,
  description: string,
  guestMemberVisibilityEnabled: boolean,
  id: string,
  invitationsEnabled: boolean,
  knowledgeableEnabled: boolean,
  loginUrl: string,
  memberVisibilityEnabled: boolean,
  name: string,
  nicknameDisplayEnabled: boolean,
  privateMessagesEnabled: boolean,
  reputationEnabled: boolean,
  sendWelcomeEmail: boolean,
  siteAsContainerEnabled: boolean,
  siteUrl: string,
  status: string,
  templateName: string,
  url: string,
  urlPathPrefix: string
};

export type CommunitiesPublishCAPIResponse = {
  id: string,
  message: string,
  name: string,
  url: string
};

export type TranslationDataTable = {
  name: string,
  columns: string[],
  rows: object[]
};

export enum StfType {
  Bilingual = 'Bilingual',
  Untranslated = 'Untranslated',
  Source = 'Source'
}
