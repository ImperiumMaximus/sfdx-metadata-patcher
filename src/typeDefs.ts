/* eslint-disable no-shadow, @typescript-eslint/naming-convention */

import { JsonMap } from '@salesforce/ts-types';

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

export type WorkspaceMdapiElement = WorkspaceElement & { mdapiFilePath: string; mdapiType: string };

export enum LoggerLevel {
    TRACE = 10,
    DEBUG = 20,
    INFO = 30,
    WARN = 40,
    ERROR = 50,
    FATAL = 60
}

export type CommunitiesCAPIResponse = {
    communities: CommunityWRCAPI[];
    total: number;
};

export type CommunityWRCAPI = {
    allowChatterAccessWithoutLogin: boolean;
    allowMembersToFlag: boolean;
    description: string | null;
    guestMemberVisibilityEnabled: boolean;
    id: string;
    invitationsEnabled: boolean;
    knowledgeableEnabled: boolean;
    loginUrl: string;
    memberVisibilityEnabled: boolean;
    name: string;
    nicknameDisplayEnabled: boolean;
    privateMessagesEnabled: boolean;
    reputationEnabled: boolean;
    sendWelcomeEmail: boolean;
    siteAsContainerEnabled: boolean;
    siteUrl: string;
    status: string;
    templateName: string;
    url: string;
    urlPathPrefix: string;
};

export type CommunitiesPublishCAPIResponse = {
    id: string;
    message: string;
    name: string;
    url: string;
};

export type ExcelDataTableRow<C extends string | number | symbol> = { [key in C]: string | undefined; };

export type ExcelDataTable<C extends string | number | symbol> = {
    name: string;
    columns: C[];
    rows: Array<ExcelDataTableRow<C>>;
};

export type TranslationDataTable = ExcelDataTable<'Metadata Component' | 'Object/Type' | 'Sub Type 1' | 'Sub Type 2' | 'Label' | 'Translation' | 'Out of Date'>;

export enum StfType {
    Bilingual = 'Bilingual',
    Untranslated = 'Untranslated',
    Source = 'Source'
}

export type PackageXml = {
    'Package': {
        '$': {
            xmlns: string;
        };
        types: PackageType[];
        version: string[];
    };
};

export type PackageType = {
    members: string[];
    name: string[];
};

export type AddressSettingsMetadata = {
  AddressSettings: {
    countriesAndStates: Array<{
      countries: AddressSettingsMetadataCountry[];
    }>;
  };
};

export type AddressSettingsMetadataCountry = {
  isoCode: string[];
  integrationValue: string[];
  label: string[];
  states: AddressSettingsMetadataState[];
  active: boolean[];
  visible: boolean[];
};

export type AddressSettingsMetadataState = {
  integrationValue: string[];
  isoCode: string[];
  label: string[];
  active: boolean[];
  visible: boolean[];
};

export type CountryDataTable = ExcelDataTable<'label' | 'isoCode' | 'integrationValue' | 'active' | 'visible'>;
export type CountryDataTableRow = ExcelDataTableRow<'label' | 'isoCode' | 'integrationValue' | 'active' | 'visible'>;

export type StatesDataTable = ExcelDataTable<'countryIsoCode' | 'label' | 'isoCode' | 'integrationValue' | 'active' | 'visible'>;
export type StateDataTableRow = ExcelDataTableRow<'countryIsoCode' | 'label' | 'isoCode' | 'integrationValue' | 'active' | 'visible'>;

export type PatchFixes = {
  [key: string]: PatchFix[];
};

export type PatchFix = {
  where: string;
  deletePermissionBlocks?: string[];
  replace?: { [key: string]: string };
  concat?: Array<{
    [key: string]: JsonMap;
  }>;
  filter?: string[];
  disablePermissions?: string[];
  deleteListView?: string[];
  deleteFieldPermissions?: string[];
  disableTabs?: string[];
  disableApplications?: string[];
  enableTabs?: string[];
  disableObjects?: string[];
};
