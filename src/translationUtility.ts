import { Messages } from '@salesforce/core';
import * as csvParse from 'csv-parse';
import * as fs from 'fs';
import * as JSZip from 'jszip';
import * as lineReader from 'line-reader';
import { StfType, TranslationDataTable } from './typeDefs';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export class TranslationUtility {

    public static async importSTFZipFile(aSTFZipPath: string, encoding: string, filters?: string[]): Promise<TranslationDataTable[]> {
        if (!fs.existsSync(aSTFZipPath)) {
            throw new Error(messages.getMessage('translations.convert.errors.invalidFileName'));
        }
        const zipBuffer = fs.readFileSync(aSTFZipPath);
        const stfZip = await JSZip.loadAsync(zipBuffer);
        return Promise.all(Object.keys(stfZip.files).map(async k => {
            const zipEntry = stfZip.files[k];
            const reader = await this.getReaderFromStream(zipEntry.nodeStream(), encoding);
            return this.importSTFFileWithReader(reader, filters);
        }));
    }

    public static async importSTFFile(stfPath: string, encoding: string, filters?: string[]): Promise<TranslationDataTable> {
        if (!fs.existsSync(stfPath)) {
            throw new Error(messages.getMessage('translations.convert.errors.invalidFileName'));
        }
        const reader = await this.getReader(stfPath, encoding);
        return this.importSTFFileWithReader(reader, filters);
    }

    private static async importSTFFileWithReader(reader: Reader, filters?: string[]): Promise<TranslationDataTable> {
        const dataTable: TranslationDataTable = { name: '', columns: [], rows: [] };

        try {
            const languageCode = await this.extractFromSTFHeader('Language code:', reader);
            let type = await this.extractFromSTFHeader('Type:', reader);

            if (type === 'Outdated and untranslated') {
                type = 'Untranslated';
            }

            if (Object.values(StfType).includes(type as StfType)) {
                const stfFileType = type as StfType;

                let header = await this.readLinesTill('# KEY\tLABEL', reader);
                if (!header) {
                    throw new Error(messages.getMessage('translations.convert.errors.invalidStfNoHeader'));
                }

                let lastReadLine: string = '';
                let translatedChunk: string = '';
                let untranslatedChunk: string = '';

                if (header === '# KEY\tLABEL\tTRANSLATION\tOUT OF DATE') {
                    const { csvText, lastLine } = await this.readCSVInfo('# KEY\tLABEL\tTRANSLATION\tOUT OF DATE', reader);
                    translatedChunk = csvText;
                    lastReadLine = lastLine;
                }
                if (header === '# KEY\tLABEL' || lastReadLine === '# KEY\tLABEL') {
                    const { csvText, lastLine } = await this.readCSVInfo('# KEY\tLABEL', reader);
                    untranslatedChunk = csvText;
                    lastReadLine = lastLine;
                } else {
                    header = await this.readLinesTill('# KEY\tLABEL', reader);
                    if (header) {
                        const { csvText, lastLine } = await this.readCSVInfo(header, reader);
                        untranslatedChunk = csvText;
                        lastReadLine = lastLine;
                    }
                }

                let translatedChunkCsv = null;
                if (translatedChunk) {
                    translatedChunkCsv = await this.parseCSV(translatedChunk);
                }

                let untranslatedChunkCsv = null;
                if (untranslatedChunk) {
                    untranslatedChunkCsv = await this.parseCSV(untranslatedChunk);
                }

                dataTable.name = languageCode;
                dataTable.columns = ['Metadata Component', 'Object/Type', 'Label', 'Translation', 'Out of Date'];

                if (translatedChunkCsv) {
                    this.generateRowsFromSTFDataTable(dataTable, translatedChunkCsv, stfFileType, filters);
                }
                if (untranslatedChunkCsv) {
                    this.generateRowsFromSTFDataTable(dataTable, untranslatedChunkCsv, stfFileType, filters);

                }
            } else {
                throw new Error(messages.getMessage('translations.convert.errors.invalidStfType'));
            }
        } finally {
            reader.close(err => {
                if (err) throw err;
            });
        }

        return dataTable;
    }

    private static async readLinesTill(textToSearch: string, reader: Reader): Promise<string> {
        let line = await this.readLine(reader);

        while (line != null && !line.startsWith(textToSearch)) {
            line = await this.readLine(reader);
        }
        return line;
    }

    private static readLine(reader: Reader): Promise<string> {
        return new Promise((res, rej) => {
            if (!reader.hasNextLine()) {
                res(null);
            }
            reader.nextLine((err, line) => {
                if (err) rej(err);
                res(line);
            });
        });
    }

    private static async getReader(filePath: string, encoding: string): Promise<Reader> {
        return new Promise((res, rej) => {
            lineReader.open(filePath, { encoding }, (err, reader) => {
                if (err) rej(err);
                res(reader);
            });
        });
    }

    private static async getReaderFromStream(nodeStream: NodeJS.ReadableStream, encoding: string): Promise<Reader> {
        return new Promise((res, rej) => {
            lineReader.open(nodeStream, { encoding }, (err, reader) => {
                if (err) rej(err);
                res(reader);
            });
        });
    }

    private static async extractFromSTFHeader(key: string, reader: Reader) {
        const keyFind = await this.readLinesTill(key, reader);
        if (keyFind == null || keyFind.length <= key.length + 1) {
            throw new Error(messages.getMessage('translations.convert.errors.invalidStfKeyNotFound', [key]));
        }

        return keyFind.substring(key.length + 1);
    }

    private static async readCSVInfo(header: string, reader: Reader) {
        let lastLine = null;
        let csvText = '"' + header.replace(/\t/g, '"\t"').replace(/\t/g, ',') + '"';

        let line = await this.readLine(reader);
        while (line != null && (line.includes('\t') || line === '')) {
            if (line !== '') {
                csvText += '\n' + '"' + line.replace(/"/g, '""').replace(/\t/g, '","').replace(/\\t/g, '\t').replace(/\\n/g, '\n').replace(/\\r/g, '\r') + '"';
            }
            line = await this.readLine(reader);
        }
        lastLine = line;
        return { csvText, lastLine };
    }

    private static async parseCSV(csvText: string) {
        return new Promise((res, rej) => {
            csvParse(csvText, { columns: true }, (err, records) => {
                if (err) rej(err);
                res(records);
            });
        });
    }

    private static generateRowsFromSTFDataTable(resultTable: TranslationDataTable, csvTable: object[], stfFileType: StfType, filters?: string[]) {
        (filters && filters.length ? csvTable.filter(csvRow => filters.includes((csvRow['# KEY'] as string)) || filters.some(f => (csvRow['# KEY'] as string).startsWith(f))) : csvTable).forEach(csvRow => {
            const keyChunks = (csvRow['# KEY'] as string).split('.');
            if (keyChunks.length < 2) {
                throw new Error(messages.getMessage('translations.convert.errors.invalidStfFormat'));
            }
            let numColumns = keyChunks.length - 2;
            if (numColumns > 2) {
                numColumns = 2;
            }
            for (let i = 1; i <= numColumns; i++) {
                if (!resultTable.columns.includes(`Sub Type ${i}`)) {
                    resultTable.columns.splice(i + 1, 0, `Sub Type ${i}`);
                }
            }

            const resultRow = {};
            resultRow['Metadata Component'] = keyChunks[0];
            resultRow['Object/Type'] = keyChunks[1];
            resultRow['Label'] = csvRow['LABEL'];
            if (Object.prototype.hasOwnProperty.call(csvRow, 'TRANSLATION')) {
                resultRow['Translation'] = csvRow['TRANSLATION'];
            } else if (stfFileType === StfType.Source) {
                resultRow['Translation'] = '{!--Unknown--}';
            }

            if (Object.prototype.hasOwnProperty.call(csvRow, 'OUT OF DATE')) {
                if (csvRow['OUT OF DATE'] === '*') {
                    resultRow['Out of Date'] = 'Yes';
                } else {
                    resultRow['Out of Date'] = 'No';
                }
            } else if (stfFileType === StfType.Source) {
                resultRow['Out of Date'] = '{!--Unknown--}';
            } else {
                resultRow['Out of Date'] = 'No';
            }

            for (let j = 1; j <= numColumns; j++)  {
                let subType = keyChunks[j + 1];
                if (j === numColumns && keyChunks.length > 4) {
                    for (let k = 2 + numColumns + 1; k <= keyChunks.length; k++) {
                        subType += `.${keyChunks[k - 1]}`;
                    }
                }
                resultRow[`Sub Type ${j}`] = subType;
            }
            resultTable.rows.push(resultRow);
        });
    }
}
