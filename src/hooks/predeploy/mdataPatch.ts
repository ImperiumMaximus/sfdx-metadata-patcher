/* tslint:disable no-var-requires */
import { Command, Hook } from '@oclif/config';
import { Config, ConfigAggregator, Org, SfdxProject } from '@salesforce/core';
import { getString, JsonMap } from '@salesforce/ts-types';
import Patch from '../../commands/mdata/patch';
const substrings = require('common-substrings');

type HookFunction = (this: Hook.Context, options: HookOptions) => void;

type HookOptions = {
  Command: Command.Class;
  argv: string[];
  commandId: string;
  result?: PreDeployResult;
};

type PreDeployResult = {
  [aggregateName: string]: {
    mdapiFilePath: string;
    workspaceElements: WorkspaceElement[];
  };
};

type WorkspaceElement = {
  fullName: string;
  metadataName: string;
  sourcePath: string;
  state: string;
  deleteSupported: boolean;
};

export const hook: HookFunction = async options => {
  // Run only on the deploy command, not the push command
  if (options.commandId === 'force:source:deploy' && options.result &&
      Object.keys(options.result).length && options.result[Object.keys(options.result)[0]].workspaceElements.length) {

    const project = await SfdxProject.resolve();
    const config: JsonMap = await project.resolveProjectConfig();

    if (!config.plugins || !config.plugins['mdataPatches'] || !config.plugins['mdataPatches']['hook']) {
      return;
    }

    const mdapiName = options.result[Object.keys(options.result)[0]];
    const tmpPath = mdapiName.mdapiFilePath.replace(substrings([mdapiName.mdapiFilePath, mdapiName.workspaceElements[0].sourcePath])[0].name, '');

    const defaultOrg: Org = await Org.create({});

    const configAggregator: ConfigAggregator = defaultOrg.getConfigAggregator();
    const aliasOrUsername = getString(configAggregator.getInfo(Config.DEFAULT_USERNAME), 'value');

    const patchCommandArgv = ['-e', aliasOrUsername, '-r', tmpPath, '-s', ''];

    if (options.argv.includes('--json')) {
      patchCommandArgv.push('--json');
    }

    await Patch.run(patchCommandArgv);
  }
};

export default hook;
