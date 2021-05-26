import { Messages } from '@salesforce/core';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { TranslationDataTable } from './typeDefs';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export class ExcelUtility {

    public static async toExcel(dataTableList: TranslationDataTable[], saveTofilePath: string) {
        if (!fs.existsSync(path.dirname(saveTofilePath))) {
            throw new Error(messages.getMessage('translations.convert.errors.invalidSaveFilePath'));
        }

        const workbook = new ExcelJS.Workbook();
        const usedSheets = [];

        dataTableList.forEach(dataTable => {
            const worksheetName = this.generateSheetName(dataTable.name, usedSheets);
            usedSheets.push(worksheetName);
            const worksheet = workbook.addWorksheet(worksheetName);

            let headerGroups = 0;
            if (dataTable.columns.length >= 1) {
                headerGroups = this.getNumberOfHeaderGroups(dataTable.columns[0]);
            }

            for (let i = 0; i < dataTable.columns.length; i++) {
                for (let j = 1; j <= headerGroups; j++) {
                    const cell = worksheet.getRow(j).getCell(i + 1);
                    cell.value = this.getSubColumnName(dataTable.columns[i], j);
                    cell.font = {
                        bold: true,
                        color: { argb: 'FFFFFFFF' }
                    };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        bgColor: { argb: 'FF00008B' }
                    };
                    cell.border = {
                        bottom: { color: { argb: 'FFFFFFFF' } },
                        left: { color: { argb: 'FFFFFFFF' } },
                        right: { color: { argb: 'FFFFFFFF' } },
                        top: { color: { argb: 'FFFFFFFF' } }
                    };
                }
            }
            this.mergeHeadersIfNeeded(1, headerGroups, dataTable.columns.length, worksheet);
            dataTable.rows.forEach((r, i) => {
                dataTable.columns.forEach((c, j) => {
                    const cell = worksheet.getRow(i + headerGroups + 1).getCell(j + 1);
                    cell.value = this.formatCellForUpdate(r[c]);
                });
            });
        });

        await workbook.xlsx.writeFile(saveTofilePath);
    }

    private static groupHeaderSeparator = '\n';

    private static generateSheetName(originalName: string, usedSheets: string[]): string {
        const maxSheetNameLength = 31;
        let sheetNum = 1;
        let sheetName = originalName;
        if (originalName.length > maxSheetNameLength) {
            sheetName = this.truncate(originalName, maxSheetNameLength - sheetNum.toString().length - 1) + '_' + sheetNum;
        }
        while (usedSheets.includes(sheetName)) {
            sheetName = this.truncate(originalName, maxSheetNameLength - sheetNum.toString().length - 1) + '_' + sheetNum;
            sheetNum++;
        }
        return sheetName;
    }

    private static truncate(source: string, len: number) {
        if (source.length > len) {
            return source.substr(0, len);
        }
        return source;
    }

    private static getNumberOfHeaderGroups(col: string): number {
        return col.split(this.groupHeaderSeparator).length;
    }

    private static getSubColumnName(col: string, subGroupNumber: number): string {
        const subHeaders = col.split(this.groupHeaderSeparator);
        if (subHeaders.length >= subGroupNumber) {
            return subHeaders[subGroupNumber - 1];
        }
        return '';
    }

    private static formatCellForUpdate(rawValue: string) {
        if (rawValue && rawValue.length > 0 && (rawValue.startsWith('=') || rawValue.startsWith('+') ||
            rawValue.startsWith('-') || rawValue.startsWith('\'') || rawValue.includes('.') ||
            (rawValue.startsWith('0') && this.isNumeric(rawValue) && rawValue !== '0'))) {
            return '\'' + rawValue;
        }
        const maybeDate = new Date(rawValue);
        if (this.isValidDate(maybeDate)) {
            return maybeDate;
        }

        return rawValue;
    }

    private static isNumeric(str) {
        if (typeof str !== 'string') return false; // we only process strings!
        return !isNaN(str as unknown as number) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
            !isNaN(parseFloat(str)); // ...and ensure strings of whitespace fail
    }

    private static isValidDate(d: Date) {
        return d instanceof Date && !isNaN(d as unknown as number);
    }

    private static mergeHeadersIfNeeded(headerRow: number, numHeaderGroups: number, numCol: number, worksheet: ExcelJS.Worksheet) {
        // Merge horizontally headers cells having same value
        for (let i = headerRow; i <= headerRow + numHeaderGroups - 1; i++) {
            let curValue: ExcelJS.CellValue = null;
            let range: ExcelJS.Location = { top: i, left: 1, bottom: i, right: 1 };
            for (let j = 1; j <= numCol; j++) {
                const cell = worksheet.getRow(i).getCell(j);
                if (cell.value === curValue) {
                    range.right++;
                }
                if (cell.value !== curValue || j === numCol) {
                    if ((range.right - range.left) > 0) {
                        worksheet.mergeCells(range);
                        cell.master.alignment = {
                            horizontal: 'center',
                            vertical: 'middle'
                        };
                    }
                    range = { top: range.top, left: range.right, bottom: range.bottom, right: range.right };
                    curValue = cell.value;
                }
            }
        }

        // Merge vertically headers cells having same value
        for (let k = 1; k <= numCol; k++) {
            let curValue: ExcelJS.CellValue = null;
            let range: ExcelJS.Location = { top: 1, left: k, bottom: 1, right: k };
            for (let l = headerRow; l <= headerRow + numHeaderGroups - 1; l++) {
                const cell = worksheet.getRow(l).getCell(k);
                const curCellValue = cell.master.value;
                if (curValue === curCellValue) {
                    range.bottom++;
                }
                if (curValue !== curCellValue || l === (headerRow + numHeaderGroups - 1)) {
                    if ((range.bottom - range.top) > 0) {
                        worksheet.mergeCells(range);
                        cell.master.alignment = {
                            horizontal: 'center',
                            vertical: 'middle'
                        };
                    }
                    range = { top: range.bottom, left: range.left, bottom: range.bottom, right: range.right };
                    curValue = curCellValue;
                }
            }
        }
    }
}
