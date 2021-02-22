/* tslint:disable no-var-requires */

import { Config, ConfigAggregator, Org, SfdxProject } from '@salesforce/core';
import { getString, JsonMap } from '@salesforce/ts-types';
import * as fs from 'fs';
import * as path from 'path';
import Patch from '../../commands/mdata/patch';
import { HookFunction } from '../../mdata';
const substrings = require('common-substrings');

export const hook: HookFunction = async options => {
  if ((options.commandId === 'force:source:deploy' || options.commandId === 'force:source:push') && options.result &&
      Object.keys(options.result).length && options.result[Object.keys(options.result)[0]].workspaceElements.length) {

    const project = await SfdxProject.resolve();
    const config: JsonMap = await project.resolveProjectConfig();

    if (!config.plugins || !config.plugins['mdataPatches'] || !config.plugins['mdataPatches']['hook']) {
      return;
    }

    const mdapiName = options.result[Object.keys(options.result)[0]];
    const subStrs = substrings([mdapiName.mdapiFilePath, mdapiName.workspaceElements[0].sourcePath]).sort((a, b) => {
      return b.weight - a.weight;
    });
    const tmpPath = mdapiName.mdapiFilePath.substring(0, mdapiName.mdapiFilePath.indexOf(subStrs[0].name));

    const procCwd = process.cwd();

    const wrkSpcElToMdapiFilePath = Object.keys(options.result).reduce((acc, mdapiType) => {
      if (!options.result[mdapiType].workspaceElements.length) {
        return acc;
      }

      const mdapiFilePath = options.result[mdapiType].mdapiFilePath.replace(tmpPath + '/', '');

      options.result[mdapiType].workspaceElements.forEach(el => {
        acc[el.sourcePath.replace(procCwd + '/', '')] = Object.assign({ mdapiFilePath, mdapiType }, el);
      });

      return acc;
    }, {});

    const defaultOrg: Org = await Org.create({});

    const configAggregator: ConfigAggregator = defaultOrg.getConfigAggregator();
    const aliasOrUsername = getString(configAggregator.getInfo(Config.DEFAULT_USERNAME), 'value');

    const mdapimapJsonFile = path.join(tmpPath, `mdapimap_${Date.now()}.json`);
    fs.writeFileSync(mdapimapJsonFile, JSON.stringify(wrkSpcElToMdapiFilePath));

    const patchCommandArgv = ['-e', aliasOrUsername, '-r', tmpPath, '-s', '', '-m', mdapimapJsonFile];

    if (options.argv.includes('--json')) {
      patchCommandArgv.push('--json');
    }

    await Patch.run(patchCommandArgv);

    fs.unlinkSync(mdapimapJsonFile);
  }
};

export default hook;
