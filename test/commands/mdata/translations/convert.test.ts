import { expect, test } from '@salesforce/command/lib/test';
import { Messages } from '@salesforce/core';
import { testSetup } from '@salesforce/core/lib/testSetup';
import { stubMethod } from '@salesforce/ts-sinon';
import { SinonStub } from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import * as lineReader from 'line-reader';
//import { ensureJsonMap, ensureString } from '@salesforce/ts-types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

const $$ = testSetup()

describe('mdata:translations:convert', () => {
    describe('Invalid "from" & "to" combo', () => {
        test
            .stderr()
            .command(['mdata:translations:convert', '-f', 'xlsx', '-t', 'xlsx', '-i', 'invalid.zip', '-o', 'invalid.xlsx'])
            .it('should return an error message', ctx => {
                expect(ctx.stderr).to.contain(messages.getMessage('translations.convert.errors.invalidFromToCombo'));
            });
    });

    describe('Import single stf file', () => {
        let xlsxWriteFileStub: SinonStub;
        let workbook: ExcelJS.Workbook;
        test
            .do(() => {
                const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
                existsSyncStub.callsFake((path: string) => {
                    if (path === 'Outdated and untranslated_en_US.stf') {
                        return true;
                    }
                    return existsSyncStub.wrappedMethod.call(this, path);
                })

                const lineReaderOpenStub = stubMethod($$.SANDBOX, lineReader, 'open')
                lineReaderOpenStub.callsFake((file: string | NodeJS.ReadableStream, options: LineReaderOptions, cb: (err: Error, reader: Reader) => void) => {
                    if(file !== 'Outdated and untranslated_en_US.stf') {
                        return
                    }
                    return lineReaderOpenStub.wrappedMethod.call(this, path.join(__dirname, '..', '..', '..', 'data', 'translations', 'Outdated and untranslated_en_US.stf'), options, cb);
                });

                const addWorksheetStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype, 'addWorksheet');
                addWorksheetStub.callsFake((name: string) => {
                    workbook = addWorksheetStub.thisValues[0];
                    return addWorksheetStub.wrappedMethod.call(addWorksheetStub.thisValues[0], name);
                });

                xlsxWriteFileStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype.xlsx, 'writeFile');
            })
            .stdout()
            .command(['mdata:translations:convert', '-f', 'stf', '-t', 'xlsx', '-i', 'Outdated and untranslated_en_US.stf', '-o', 'out.xlsx'])
            .it('should generate an xlsx file with one sheet', _ => {
                expect(xlsxWriteFileStub.called).to.be.true;
                expect(xlsxWriteFileStub.args[0][0]).to.equal('out.xlsx');
                expect(workbook.getWorksheet(1).name).to.equal('en_US');
                expect((workbook.getWorksheet(1).getRow(1).values as ExcelJS.CellValue[]).slice(1))
                    .deep
                    .equal(['Metadata Component', 'Object/Type', 'Sub Type 1', 'Sub Type 2', 'Label', 'Translation', 'Out of Date']);
                expect(workbook.getWorksheet(1).actualRowCount).to.equal(718);
            });
    })

    describe('Import multiple stf files in a zip', () => {
        let xlsxWriteFileStub: SinonStub;
        let workbook: ExcelJS.Workbook;
        test
            .do(() => {
                const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
                existsSyncStub.callsFake((path: string) => {
                    if (path === 'Outdated and untranslated.zip') {
                        return true;
                    }
                    return existsSyncStub.wrappedMethod.call(this, path);
                })

                const readFileSyncStub = stubMethod($$.SANDBOX, fs, 'readFileSync')
                readFileSyncStub.callsFake((_path: string) => {
                    if (_path === 'Outdated and untranslated.zip') {
                        return readFileSyncStub.wrappedMethod.call(this, path.join(__dirname, '..', '..', '..', 'data', 'translations', 'Outdated and untranslated.zip'));
                    } else {
                        return ''
                    }
                })

                const addWorksheetStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype, 'addWorksheet');
                addWorksheetStub.callsFake((name: string) => {
                    workbook = addWorksheetStub.thisValues[0];
                    return addWorksheetStub.wrappedMethod.call(addWorksheetStub.thisValues[0], name);
                });

                xlsxWriteFileStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype.xlsx, 'writeFile');
            })
            .stdout()
            .command(['mdata:translations:convert', '-f', 'stf', '-t', 'xlsx', '-i', 'Outdated and untranslated.zip', '-o', 'out.xlsx'])
            .it('should generate an xlsx file with two sheets', _ => {
                expect(xlsxWriteFileStub.called).to.be.true;
                expect(xlsxWriteFileStub.args[0][0]).to.equal('out.xlsx');
                expect(workbook.getWorksheet(1).name).to.equal('it');
                expect(workbook.getWorksheet(2).name).to.equal('en_US');
                expect((workbook.getWorksheet(1).getRow(1).values as ExcelJS.CellValue[]).slice(1))
                    .deep
                    .equal(['Metadata Component', 'Object/Type', 'Sub Type 1', 'Sub Type 2', 'Label', 'Translation', 'Out of Date']);
                expect((workbook.getWorksheet(2).getRow(1).values as ExcelJS.CellValue[]).slice(1))
                    .deep
                    .equal(['Metadata Component', 'Object/Type', 'Sub Type 1', 'Sub Type 2', 'Label', 'Translation', 'Out of Date']);
                expect(workbook.getWorksheet(1).actualRowCount).to.equal(718);
                expect(workbook.getWorksheet(2).actualRowCount).to.equal(718);

            });
    })

    describe('Import single stf Bilingual file', () => {
        let xlsxWriteFileStub: SinonStub;
        let workbook: ExcelJS.Workbook;
        test
            .do(() => {
                const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
                existsSyncStub.callsFake((path: string) => {
                    if (path === 'Bilingual_it.stf') {
                        return true;
                    }
                    return existsSyncStub.wrappedMethod.call(this, path);
                })

                const lineReaderOpenStub = stubMethod($$.SANDBOX, lineReader, 'open')
                lineReaderOpenStub.callsFake((file: string | NodeJS.ReadableStream, options: LineReaderOptions, cb: (err: Error, reader: Reader) => void) => {
                    if (file !== 'Bilingual_it.stf') {
                        return
                    }
                    return lineReaderOpenStub.wrappedMethod.call(this, path.join(__dirname, '..', '..', '..', 'data', 'translations', 'Bilingual_it.stf'), options, cb);
                });

                const addWorksheetStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype, 'addWorksheet');
                addWorksheetStub.callsFake((name: string) => {
                    workbook = addWorksheetStub.thisValues[0];
                    return addWorksheetStub.wrappedMethod.call(addWorksheetStub.thisValues[0], name);
                });

                xlsxWriteFileStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype.xlsx, 'writeFile');
            })
            .stdout()
            .command(['mdata:translations:convert', '-f', 'stf', '-t', 'xlsx', '-i', 'Bilingual_it.stf', '-o', 'out.xlsx'])
            .it('should generate an xlsx file with one sheet and the translated string at the top', _ => {
                expect(xlsxWriteFileStub.called).to.be.true;
                expect(xlsxWriteFileStub.args[0][0]).to.equal('out.xlsx');
                expect(workbook.getWorksheet(1).name).to.equal('it');
                expect((workbook.getWorksheet(1).getRow(1).values as ExcelJS.CellValue[]).slice(1))
                    .deep
                    .equal(['Metadata Component', 'Object/Type', 'Sub Type 1', 'Sub Type 2', 'Label', 'Translation', 'Out of Date']);
                expect(workbook.getWorksheet(1).actualRowCount).to.equal(718);
                expect(workbook.getWorksheet(1).getRow(2).getCell(6).value).to.equal('Test Sostituisci');
            });
    })

    describe('Import single stf Source file', () => {
        let xlsxWriteFileStub: SinonStub;
        let workbook: ExcelJS.Workbook;
        test
            .do(() => {
                const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
                existsSyncStub.callsFake((path: string) => {
                    if (path === 'Source_en_US.stf') {
                        return true;
                    }
                    return existsSyncStub.wrappedMethod.call(this, path);
                })

                const lineReaderOpenStub = stubMethod($$.SANDBOX, lineReader, 'open')
                lineReaderOpenStub.callsFake((file: string | NodeJS.ReadableStream, options: LineReaderOptions, cb: (err: Error, reader: Reader) => void) => {
                    if (file !== 'Source_en_US.stf') {
                        return
                    }
                    return lineReaderOpenStub.wrappedMethod.call(this, path.join(__dirname, '..', '..', '..', 'data', 'translations', 'Source_en_US.stf'), options, cb);
                });

                const addWorksheetStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype, 'addWorksheet');
                addWorksheetStub.callsFake((name: string) => {
                    workbook = addWorksheetStub.thisValues[0];
                    return addWorksheetStub.wrappedMethod.call(addWorksheetStub.thisValues[0], name);
                });

                xlsxWriteFileStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype.xlsx, 'writeFile');
            })
            .stdout()
            .command(['mdata:translations:convert', '-f', 'stf', '-t', 'xlsx', '-i', 'Source_en_US.stf', '-o', 'out.xlsx'])
            .it('should generate an xlsx file with one sheet with Translation and Out of Date columns having unknown status', _ => {
                expect(xlsxWriteFileStub.called).to.be.true;
                expect(xlsxWriteFileStub.args[0][0]).to.equal('out.xlsx');
                expect(workbook.getWorksheet(1).name).to.equal('en_US');
                expect((workbook.getWorksheet(1).getRow(1).values as ExcelJS.CellValue[]).slice(1))
                    .deep
                    .equal(['Metadata Component', 'Object/Type', 'Sub Type 1', 'Sub Type 2', 'Label', 'Translation', 'Out of Date']);
                expect(workbook.getWorksheet(1).actualRowCount).to.equal(718);
                expect(workbook.getWorksheet(1).getRow(2).getCell(6).value).to.equal('{!--Unknown--}');
                expect(workbook.getWorksheet(1).getRow(2).getCell(7).value).to.equal('{!--Unknown--}');
            });
    })
});