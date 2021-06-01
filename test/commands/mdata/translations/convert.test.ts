import { expect, test } from '@salesforce/command/lib/test';
import { Messages } from '@salesforce/core';
import { testSetup } from '@salesforce/core/lib/testSetup';
import { stubMethod } from '@salesforce/ts-sinon';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import * as lineReader from 'line-reader';
import * as XLSX from 'exceljs/lib/xlsx/xlsx';
import { TranslationUtility } from '../../../../src/translationUtility';
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
        let xlsxWriteFileStub: sinon.SinonStub;
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
        let xlsxWriteFileStub: sinon.SinonStub;
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
        let xlsxWriteFileStub: sinon.SinonStub;
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
        let xlsxWriteFileStub: sinon.SinonStub;
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

    describe('Import excel file with single sheet', () => {
        let writeStreamStub: sinon.SinonStub;
        let closeStreamStub: sinon.SinonStub;
        test
            .do(() => {
                // Workaround in order to have a consistent instance of an ExcelJS.Workbook.
                // For some reason the instance created in the actual code doesn't have
                // its properties correctly populated, though this happens only during
                // test execution.
                const wb = new ExcelJS.Workbook();
                $$.SANDBOX.replaceGetter(wb, 'xlsx', () => {
                    return new XLSX(wb);
                });

                const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
                existsSyncStub.callsFake((_path: string) => {
                    if (_path.includes('Bilingual_it.xlsx') || _path.includes('out')) {
                        return true;
                    }
                    return existsSyncStub.wrappedMethod.call(this, _path);
                })

                const xlsxReadStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype.xlsx, 'readFile');
                xlsxReadStub.callsFake(async (_path: string) => {
                    if (_path.includes('Bilingual_it.xlsx')) {
                        return wb.xlsx.read(fs.createReadStream(_path));
                    }
                    return null;
                });

                const createWriteStreamStub = stubMethod($$.SANDBOX, fs, 'createWriteStream')
                createWriteStreamStub.callsFake((_path: string) => {
                    if (_path.includes('out')) {
                        const s = {
                            write: (_: string | Buffer) => { return true },
                            close: () => { return }
                        }
                        writeStreamStub = sinon.stub(s, 'write');
                        closeStreamStub = sinon.stub(s, 'close');
                        return s;
                    }
                    return createWriteStreamStub.wrappedMethod.call(this, _path);
                })   
            })
            .stdout()
            .command(['mdata:translations:convert', '-f', 'xlsx', '-t', 'stf', '-i', path.join(__dirname, '..', '..', '..', 'data', 'translations', 'Bilingual_it.xlsx'), '-o', 'outdir'])
            .it('should generate a single STF file', _ => {
                expect(writeStreamStub.called).to.be.true;
                expect(writeStreamStub.args[0][0]).to.equal('# Use the Bilingual file to review translations, edit labels that have already been translated, and add translations for labels that haven\'t been translated.\n');
                expect(writeStreamStub.args[14][0]).to.equal('# Language: it\n');
                expect(writeStreamStub.args[15][0]).to.equal('Language code: it\n');
                expect(writeStreamStub.args[22][0]).to.equal('CustomField.Account.Active.FieldLabel\tTest Replace\tTest Sostituisci\t-\n');
                expect(writeStreamStub.args[23][0]).to.equal('CustomField.Contact.Languages.FieldLabel\tLanguages\tLingue\t-\n');
                expect(closeStreamStub.called).to.be.true;
            });
    })

    describe('Import excel file with multiple sheet', () => {
        let writeStreamStubs: sinon.SinonStub[] = [];
        let closeStreamStubs: sinon.SinonStub[] = [];
        test
            .do(() => {
                // Workaround in order to have a consistent instance of an ExcelJS.Workbook.
                // For some reason the instance created in the actual code doesn't have
                // its properties correctly populated, though this happens only during
                // test execution.
                const wb = new ExcelJS.Workbook();
                $$.SANDBOX.replaceGetter(wb, 'xlsx', () => {
                    return new XLSX(wb);
                });

                const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
                existsSyncStub.callsFake((_path: string) => {
                    if (_path.includes('Bilingual_en_US_it.xlsx') || _path.includes('out')) {
                        return true;
                    }
                    return existsSyncStub.wrappedMethod.call(this, _path);
                })

                const xlsxReadStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype.xlsx, 'readFile');
                xlsxReadStub.callsFake(async (_path: string) => {
                    if (_path.includes('Bilingual_en_US_it.xlsx')) {
                        return wb.xlsx.read(fs.createReadStream(_path));
                    }
                    return null;
                });

                const memWritableStreamStub = stubMethod($$.SANDBOX, TranslationUtility, 'getMemWritableStream')
                memWritableStreamStub.callsFake((_: string) => {
                    const s = {
                        write: (_: string | Buffer) => { return true },
                        toBuffer: () => { return Buffer.from('', 'utf8') },
                        close: () => { return }
                    }
                    writeStreamStubs.push(sinon.stub(s, 'write'));
                    closeStreamStubs.push(sinon.stub(s, 'close'));
                    return s;
                })

                const createWriteStreamStub = stubMethod($$.SANDBOX, fs, 'createWriteStream')
                createWriteStreamStub.callsFake((_path: string, _: object) => {
                    if (_path.endsWith('.zip')) {
                        const s = {
                            write: (_: string | Buffer) => { return true },
                            on: (_: string, ...__: any[]) => { return s },
                            end: (_: any, __: string, ___: () => void) => { return },
                            once: (_: string, ...__: any[]) => { return s },
                            emit: (_: string | symbol, ...__: any[]) => { return true },
                            close: () => { return }
                        }
                        return s;
                    }
                    return createWriteStreamStub.wrappedMethod.call(this, _path);
                })
            })
            .stdout()
            .command(['mdata:translations:convert', '-f', 'xlsx', '-t', 'stf', '-i', path.join(__dirname, '..', '..', '..', 'data', 'translations', 'Bilingual_en_US_it.xlsx'), '-o', 'outdir'])
            .it('should generate a ZIP file with the same number of files', _ => {
                expect(writeStreamStubs[0].called).to.be.true;
                expect(writeStreamStubs[0].args[0][0]).to.equal('# Use the Bilingual file to review translations, edit labels that have already been translated, and add translations for labels that haven\'t been translated.\n');
                expect(writeStreamStubs[0].args[14][0]).to.equal('# Language: en_US\n');
                expect(writeStreamStubs[0].args[15][0]).to.equal('Language code: en_US\n');
                expect(writeStreamStubs[0].args[22][0]).to.equal('LayoutSection.Metric.Layout metrica di completamento.Descrizione_1\tDescrizione\tDescription\t-\n');
                expect(writeStreamStubs[1].called).to.be.true;
                expect(writeStreamStubs[1].args[0][0]).to.equal('# Use the Bilingual file to review translations, edit labels that have already been translated, and add translations for labels that haven\'t been translated.\n');
                expect(writeStreamStubs[1].args[14][0]).to.equal('# Language: it\n');
                expect(writeStreamStubs[1].args[15][0]).to.equal('Language code: it\n');
                expect(writeStreamStubs[1].args[22][0]).to.equal('CustomField.Account.Active.FieldLabel\tTest Replace\tTest Sostituisci\t-\n');
                expect(writeStreamStubs[1].args[23][0]).to.equal('CustomField.Contact.Languages.FieldLabel\tLanguages\tLingue\t-\n');
            });
    })

    describe('Import excel file with multiple sheets but filtering', () => {
        let writeStreamStub: sinon.SinonStub;
        let closeStreamStub: sinon.SinonStub;
        test
            .do(() => {
                // Workaround in order to have a consistent instance of an ExcelJS.Workbook.
                // For some reason the instance created in the actual code doesn't have
                // its properties correctly populated, though this happens only during
                // test execution.
                const wb = new ExcelJS.Workbook();
                $$.SANDBOX.replaceGetter(wb, 'xlsx', () => {
                    return new XLSX(wb);
                });

                const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
                existsSyncStub.callsFake((_path: string) => {
                    if (_path.includes('Bilingual_en_US_it.xlsx') || _path.includes('out')) {
                        return true;
                    }
                    return existsSyncStub.wrappedMethod.call(this, _path);
                })

                const xlsxReadStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype.xlsx, 'readFile');
                xlsxReadStub.callsFake(async (_path: string) => {
                    if (_path.includes('Bilingual_en_US_it.xlsx')) {
                        return wb.xlsx.read(fs.createReadStream(_path));
                    }
                    return null;
                });

                const createWriteStreamStub = stubMethod($$.SANDBOX, fs, 'createWriteStream')
                createWriteStreamStub.callsFake((_path: string) => {
                    if (_path.includes('out')) {
                        const s = {
                            write: (_: string | Buffer) => { return true },
                            close: () => { return }
                        }
                        writeStreamStub = sinon.stub(s, 'write');
                        closeStreamStub = sinon.stub(s, 'close');
                        return s;
                    }
                    return createWriteStreamStub.wrappedMethod.call(this, _path);
                })
            })
            .stdout()
            .command(['mdata:translations:convert', '-f', 'xlsx', '-t', 'stf', '-i', path.join(__dirname, '..', '..', '..', 'data', 'translations', 'Bilingual_en_US_it.xlsx'), '-o', 'outdir', '-s', 'en_US'])
            .it('should generate a single STF file', _ => {
                expect(writeStreamStub.called).to.be.true;
                expect(writeStreamStub.args[0][0]).to.equal('# Use the Bilingual file to review translations, edit labels that have already been translated, and add translations for labels that haven\'t been translated.\n');
                expect(writeStreamStub.args[14][0]).to.equal('# Language: en_US\n');
                expect(writeStreamStub.args[15][0]).to.equal('Language code: en_US\n');
                expect(writeStreamStub.args[22][0]).to.equal('LayoutSection.Metric.Layout metrica di completamento.Descrizione_1\tDescrizione\tDescription\t-\n');
                expect(closeStreamStub.called).to.be.true;
            });
    })
});