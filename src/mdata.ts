import pino from 'pino';
import pretty from 'pino-pretty';
import { LoggerLevel } from './typeDefs';

export class Mdata {
    private static logger: pino.Logger;
    /* private static defaultFolder: string;
  private static projectDirectories: string[];
  private static pluginConfig;*/
    private static isJsonFormatEnabled: boolean;
    /* private static ux: UX;
  private static sourceApiVersion: any;*/

    public static setLogLevel(logLevel: string, isJsonFormatEnabled: boolean): void {
        logLevel = logLevel.toLowerCase();
        this.isJsonFormatEnabled = isJsonFormatEnabled;

        if (!isJsonFormatEnabled) {
            this.logger = pino({
                    name: 'mdata',
                    level: logLevel
                },
                pretty({
                    levelFirst: true, // --levelFirst
                    colorize: true,
                    translateTime: true,
                    ignore: 'pid,hostname', // --ignore
                    sync: true
                })
            );
        } else {
            // do nothing for now, need to put pino to move to file
        }
    }

    public static log(message: string, logLevel: LoggerLevel): void {
        if (this.logger === null || this.logger === undefined) return;
        if (this.isJsonFormatEnabled) return;
        switch (logLevel) {
        case LoggerLevel.TRACE:
            this.logger.trace(message);
            break;
        case LoggerLevel.DEBUG:
            this.logger.debug(message);
            break;
        case LoggerLevel.INFO:
            this.logger.info(message);
            break;
        case LoggerLevel.WARN:
            this.logger.warn(message);
            break;
        case LoggerLevel.ERROR:
            this.logger.error(message);
            break;
        case LoggerLevel.FATAL:
            this.logger.fatal(message);
            break;
        }
    }

}
