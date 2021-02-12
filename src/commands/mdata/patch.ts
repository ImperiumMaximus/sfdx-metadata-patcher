import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxProject } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import * as xml2js from 'xml2js';
import * as _ from 'lodash';
import * as glob from 'glob';
import * as jsonQuery from 'json-query';
import { LoggerLevel, Mdata } from "../../mdata";

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class Patch extends SfdxCommand {

  public static description = messages.getMessage("metadata.patch.description");

  // Comment this out if your command does not require an org username
  //protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  //protected static supportsDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  //protected static requiresProject = true;

  protected baseDir;
  protected fixes;
  protected manifest;

  protected static flagsConfig = {
    env: flags.string({
      char: "e",
      default: "default",
      description: messages.getMessage("metadata.patch.flags.env")
    }),
    rootdir: flags.string({
      char: "r",
      description: messages.getMessage("metadata.patch.flags.rootdir")
    }),
    inmanifestdir: flags.string({
      char: "x",
      default: "manifest",
      description: messages.getMessage("metadata.patch.flags.inmanifestdir")
    }),
    loglevel: flags.enum({
      description: messages.getMessage("general.flags.loglevel"),
      default: "info",
      required: false,
      options: [
        "trace",
        "debug",
        "info",
        "warn",
        "error",
        "fatal",
        "TRACE",
        "DEBUG",
        "INFO",
        "WARN",
        "ERROR",
        "FATAL"
      ]
    })
  }

   // Comment this out if your command does not require an org username
   protected static requiresUsername = false;

   // Comment this out if your command does not support a hub org username
   protected static supportsDevhubUsername = false;

   // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
   protected static requiresProject = true;

  public async run(): Promise<AnyJson> {
    Mdata.setLogLevel(this.flags.loglevel, this.flags.json);

    const project = await SfdxProject.resolve();
    var config:any = await project.resolveProjectConfig();

    if (!config.plugins || !config.plugins.mdataPatches){
      Mdata.log(messages.getMessage("metadata.patch.warns.missingConfiguration"), LoggerLevel.WARN)
      return messages.getMessage("metadata.patch.warns.missingConfiguration")
    }

    this.fixes = Object.assign({}, config.plugins.mdataPatches[this.flags.env] || {})
    this.baseDir = this.flags.rootDir || config.packageDirectories[0].path

    Mdata.log(messages.getMessage("metadata.patch.infos.executingPreDeployFixes"), LoggerLevel.INFO)
    await this.preDeployFixes()
    Mdata.log(messages.getMessage("general.infos.done"), LoggerLevel.INFO)

    return ''
  }

  public async readManifest(): Promise<AnyJson> {
    return await this.parseXml(`${this.flags.inmanifestdir}/package.xml`)
  }

  public async parseXml(xmlFile: string): Promise<AnyJson> {
    return new Promise((resolve, reject) => {
      const parser = new xml2js.Parser({ explicitArray: true });
      const data = fs.readFileSync(xmlFile)
      parser.parseString(data, (err, result) => {
        if (err) {
          reject(err)
        }
        resolve(result)
      })
    })
  }

  public async fixEmailUnfiledPublicFolder(): Promise<void> {
    const emailTemplate = _.find(this.manifest.Package.types, function (t) { return t.name[0] === 'EmailTemplate' })
    if (emailTemplate) emailTemplate.members = _.filter(emailTemplate.members, function (m) { return m !== 'unfiled$public' })
  }

  public async preDeployFixes(): Promise<void> {
    const self = this
    _.each(_.keys(this.fixes), async function (path) {
      if (glob.hasMagic(path)) {
        glob(`${self.baseDir}/${path}`, function (err, files) {
          _.each(files, patchFile)
        })
      } else if (fs.existsSync(`${self.baseDir}/${path}`)) {
        await patchFile(`${self.baseDir}/${path}`)
      } else {
        Mdata.log(messages.getMessage("metadata.patch.warns.missingFile", [self.baseDir, path]), LoggerLevel.WARN)
      }

      async function patchFile(f) {
        const xml = await self.parseXml(f)
        let confs = self.fixes[path]
        if (!_.isArray(confs)) confs = [confs]
        _.each(confs, function (conf) {
          self.processConf(xml, conf)
        })
        await self.writeXml(f, xml)
      }
    })
  }

  public async writeManifest(): Promise<void> {
    let manifestDir;
    if (!this.flags.inmanifestdir) {
      manifestDir = this.flags.inmanifestdir
    } else {
      await fsExtra.emptyDir(this.flags.inmanifestdir)
      manifestDir = this.flags.inmanifestdir
    }

    await this.writeXml(`${manifestDir}/package.xml`, this.manifest)
  }

  public async writeXml(xmlFile: string, obj: unknown): Promise<void> {
    const builder = new xml2js.Builder({
      renderOpts: {
        'pretty': true,
        'indent': '    ',
        'newline': '\n'
      },
      xmldec: {
        encoding: 'UTF-8'
      }
    })
    fs.writeFileSync(xmlFile, builder.buildObject(obj))
  }

  public async processConf(xml, conf): Promise<void> {
    let token = xml
    if (conf.where) token = jsonQuery(conf.where, { data: xml })

    if (!token.value) return xml
    token = token.value
    if (!_.isArray(token)) token = [token]

    if (conf.replace) {
      _.each(_.keys(conf.replace), function (t) {
        _.each(token, function (tk) {
          tk[t] = conf.replace[t]
        })
      })
    }

    if (conf.concat) {
      _.each(conf.concat, function (tk) {
        token.push(tk)
      })
    }

    if (conf.filter) {
      _.each(conf.filter, function (valueToFilter) {
        delete token[0][valueToFilter]
      })
    }

    if (conf.deletePermissionBlocks) {
      _.each(conf.deletePermissionBlocks, function (perm) {
        if (_.findIndex(token[0].userPermissions, (p: GenericEntity) => p.name[0] === perm) !== -1) {
          _.remove(token[0].userPermissions, (p: GenericEntity) => {
            return p.name[0] === perm
          })
        }
      })
    }

    if (conf.disablePermissions && token[0].userPermissions) {
      _.each(conf.disablePermissions, function (perm) {
        if (_.findIndex(token[0].userPermissions, (p: GenericEntity) => p.name[0] === perm) === -1) {
          token[0].userPermissions.push({
            enabled: false,
            name: perm
          })
        }
      })
    }

    if (conf.deleteListView) {
      _.each(conf.deleteListView, function (perm) {
        if (_.findIndex(token[0].listViews, (p: GenericEntity) => p.fullName[0] === perm) !== -1) {
          _.remove(token[0].listViews, (p: GenericEntity) => {
            return p.fullName[0] === perm
          })
        }
      })
    }

    if (conf.deleteFieldPermissions && token[0].fieldPermissions) {
      _.each(conf.deleteFieldPermissions, function(perm) {
        if (_.findIndex(token[0].fieldPermissions, (p: CustomField) => p.field[0] === perm) !== -1) {
          _.remove(token[0].fieldPermissions, (p: CustomField) => {
            return p.field[0] === perm
          })
        }
      })
    }

    if (conf.disableTabs) {
      _.each(conf.disableTabs, function (perm) {
        if (_.findIndex(token[0].tabVisibilities, (t: CustomTab) => t.tab[0] === perm) === -1) {
          token[0].tabVisibilities.push({
            tab: perm,
            visibility: 'Hidden'
          })
        }
      })
    }

    if (conf.disableApplications) {
      _.each(conf.disableApplications, function (app) {
        if (_.findIndex(token[0].applicationVisibilities, (t: CustomApplication) => t.application[0] === app) === -1) {
          token[0].applicationVisibilities.push({
            application: app,
            'default': 'false',
            visible: 'false'
          })
        }
      })
    }

    if (conf.enableTabs) {
      _.each(conf.enableTabs, function (perm) {
        if (_.findIndex(token[0].tabVisibilities, (t: CustomTab) => t.tab[0] === perm) === -1) {
          token[0].tabVisibilities.push({
            tab: perm,
            visibility: 'DefaultOn'
          })
        }
      })
    }

    if (conf.disableObjects) {
      _.each(conf.disableObjects, function (obj) {
        if (_.findIndex(token[0].objectPermissions, (o: ObjectPermission) => o.object[0] === obj) === -1) {
          token[0].objectPermissions.push({
            'allowCreate': false,
            'allowDelete': false,
            'allowEdit': false,
            'allowRead': false,
            'modifyAllRecords': false,
            'object': obj,
            'viewAllRecords': false
          })
        }
      })
    }
  }
}

interface ObjectPermission {
  object: Array<string>
}


interface CustomTab {
  tab: Array<string>
}

interface CustomApplication {
  application: Array<string>
}

interface CustomField {
  field: Array<string>
}

interface GenericEntity {
  name?: Array<string>
  fullName?: Array<string>
}
