import * as fs from 'fs';
import * as path from 'path';
import { Messages } from '@salesforce/core';
import * as csvParse from 'csv-parse';
import * as JSZip from 'jszip';
import * as lineReader from 'line-reader';
import { StfType, TranslationDataTable } from './typeDefs';
import { WritableMemoryStream } from './writableStream';

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

    public static async exportToSTF(dataTableList: TranslationDataTable[], stfFolderPath: string, encoding: BufferEncoding) {
        if (!fs.existsSync(stfFolderPath)) {
            throw new Error(messages.getMessage('translations.convert.errors.invalidFileName'));
        }

        let fileName = '';
        if (dataTableList.length === 1) {
            fileName = path.join(stfFolderPath, this.generateFileName('.stf', dataTableList[0].name));
            const fsWritable = this.getFsWritableStream(fileName, encoding);
            this.generateSTFStream(dataTableList[0], fsWritable);
            fsWritable.close();
        } else {
            fileName = path.join(stfFolderPath, this.generateFileName('.zip', ''));
            const zipFile = new JSZip();
            dataTableList.forEach(dataTable => {
                const entryName = this.generateFileName('.stf', dataTable.name);
                const memWritable = this.getMemWritableStream(encoding);
                this.generateSTFStream(dataTable, memWritable);
                zipFile.file(entryName, memWritable.toBuffer());
            });

            zipFile
                .generateNodeStream({type: 'nodebuffer', streamFiles: true})
                .pipe(this.getFsWritableStream(fileName, 'utf8'));
        }
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

    private static generateFileName(extension: string, languageCode: string) {
        if (languageCode) {
            return 'Bilingual_' + languageCode + '_' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/:/g, '-').replace(/ /g, '_') + extension;
        }
        return 'Bilingual_' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/:/g, '-').replace(/ /g, '_') + extension;
    }

    private static writeLine(writableStream: NodeJS.WritableStream, line: string) {
        writableStream.write(line + '\n');
    }

    private static getFsWritableStream(filename: string, encoding: BufferEncoding): fs.WriteStream {
        return fs.createWriteStream(filename, { encoding });
    }

    private static getMemWritableStream(encoding: BufferEncoding): WritableMemoryStream {
        return new WritableMemoryStream(encoding);
    }

    private static generateSTFStream(dataTable: TranslationDataTable, writableStream: NodeJS.WritableStream) {
        this.generateSTFHeader(dataTable.name, writableStream);

        try {
            dataTable.rows.forEach(r => {
                this.generateSTFRow(r, writableStream);
            });
        } catch (e) {
            throw e;
        }
    }

    private static generateSTFHeader(languageCode: string, writableStream: NodeJS.WritableStream) {
        this.writeLine(writableStream, '# Use the Bilingual file to review translations, edit labels that have already been translated, and add translations for labels that haven\'t been translated.');
        this.writeLine(writableStream, '# - The TRANSLATED section of the file contains the text that has been translated and needs to be reviewed.');
        this.writeLine(writableStream, '# - The UNTRANSLATED section of the file contains text that hasn\'t been translated. You can replace untranslated labels in the LABEL column with translated values.');
        this.writeLine(writableStream, '');
        this.writeLine(writableStream, '# The Out of Date indicators are:');
        this.writeLine(writableStream, '# - An asterisk (*): The label is out of date. A change was made to the default language label and the translation hasn\'t been updated.');
        this.writeLine(writableStream, '# - A dash (-): The translation is current.');
        this.writeLine(writableStream, '');
        this.writeLine(writableStream, '# Notes:');
        this.writeLine(writableStream, '# Don\'t add columns to or remove columns from this file.');
        this.writeLine(writableStream, '# Tabs (\\t), new lines (\\n) and carriage returns (\\r) are represented by special characters in this file. These characters should be preserved in the import file to maintain formatting.');
        this.writeLine(writableStream, '# Lines that begin with the # symbol are igenored during import.');
        this.writeLine(writableStream, '# Salesforce translation files are exported in the UTF-8 encoding to support extended and double-byte characters. This encoding cannot be changed.');
        this.writeLine(writableStream, '');
        this.writeLine(writableStream, `# Language: ${languageCode}`);
        this.writeLine(writableStream, `Language code: ${languageCode}`);
        this.writeLine(writableStream, 'Type: Bilingual');
        this.writeLine(writableStream, '');
        this.writeLine(writableStream, '------------------TRANSLATED-------------------');
        this.writeLine(writableStream, '');
        this.writeLine(writableStream, '# KEY   LABEL   TRANSLATION OUT OF DATE');
        this.writeLine(writableStream, '');
    }

    private static generateSTFRow(row: object, writableStream: NodeJS.WritableStream) {
        let translation: string = row['Translation'];
        if (!translation || translation === '{!--Unknown--}') {
            return;
        }

        let key: string = `${row['Metadata Component']}.${row['Object/Type']}`;
        if (row['Sub Type 1']) {
            key += `.${row['Sub Type 1']}`;
            if (row['Sub Type 2']) {
                key += `.${row['Sub Type 2']}`;
            }
        }

        const label = row['Label'].replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        translation = translation.replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        this.writeLine(writableStream, `${key}\t${label}\t${translation}\t-`);
    }
}
