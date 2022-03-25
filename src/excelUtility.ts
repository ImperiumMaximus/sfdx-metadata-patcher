import * as fs from 'fs';
import * as path from 'path';
import { Messages } from '@salesforce/core';
import * as ExcelJS from 'exceljs';
import { TranslationDataTable } from './typeDefs';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export class ExcelUtility {
    private static groupHeaderSeparator = '\n';

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

    public static async importFromExcel(aPath: string, sheetNames: string[], aRowHeader: number): Promise<TranslationDataTable[]> {
        if (!fs.existsSync(aPath)) {
            throw new Error(messages.getMessage('translations.convert.errors.invalidFileName'));
        }

        let workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
        workbook = await workbook.xlsx.readFile(aPath);

        let worksheets: ExcelJS.Worksheet[] = workbook.worksheets;
        const dataTableList: TranslationDataTable[] = [];

        if (sheetNames && sheetNames.length) {
            const worksheetSubList = workbook.worksheets.filter(ws => sheetNames.includes(ws.name));
            if (worksheetSubList.length !== sheetNames.length) {
                throw new Error(messages.getMessage('translations.convert.errors.oneOrMoreSheetsNotFound'));
            }
            worksheets = [...worksheetSubList];
        }

        worksheets.forEach(ws => {
            const numRows = ws.actualRowCount;
            const numCols = ws.actualColumnCount;
            const numHeaderGroups = this.getNumberOfHeaderGroupsInWorksheet(aRowHeader, ws);
            const extractedLines: TranslationDataTable = { name: ws.name, columns: [], rows: [] };
            this.getExcelSheetInfo(ws, extractedLines, aRowHeader, numHeaderGroups, numCols);

            for (let i = aRowHeader + numHeaderGroups; i <= numRows; i++) {
                const extractedRow = {};
                let skipAddToDataTable = true;
                for (let j = 1; j <= numCols; j++) {
                    const cell = ws.getRow(i).getCell(j);
                    if (cell.value && cell.value.toString() !== '') {
                        skipAddToDataTable = false;
                        extractedRow[extractedLines.columns[j - 1]] = cell.value;
                    }
                }
                if (!skipAddToDataTable) {
                    extractedLines.rows.push(extractedRow);
                }
            }
            dataTableList.push(extractedLines);
        });

        return dataTableList;
    }

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

    private static getNumberOfHeaderGroupsInWorksheet(headerRow: number, workSheet: ExcelJS.Worksheet): number {
        let groupSize = headerRow;
        let cell = workSheet.getRow(groupSize).getCell(1);
        while (cell.isMerged) {
            groupSize++;
            cell = workSheet.getRow(groupSize).getCell(1);
        }
        if (groupSize === headerRow) {
            return 1;
        }
        cell = workSheet.getRow(groupSize - 1).getCell(1);
        if (cell.master === workSheet.getRow(groupSize - 1).getCell(2).master) {
            return groupSize - headerRow + 1;
        }
        return groupSize - headerRow;

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

    private static getExcelSheetInfo(worksheet: ExcelJS.Worksheet, extractedDataTable: TranslationDataTable, aRowHeader: number, numHeaderGroups: number, numCols: number) {
        for (let i = 1; i <= numCols; i++) {
            const columnName = this.getColumnName(aRowHeader, i, numHeaderGroups, worksheet);
            if (columnName && columnName !== '') {
                extractedDataTable.columns.push(columnName);
            }
        }
    }

    private static getColumnName(headerRow: number, colNumber: number, headerColumnNumber: number, worksheet: ExcelJS.Worksheet): string {
        let columnName = '';

        for (let i = headerRow; i < headerRow + headerColumnNumber; i++) {
            let cell = worksheet.getRow(i).getCell(colNumber);
            if (!cell.isMerged) {
                columnName += cell.value + this.groupHeaderSeparator;
                continue;
            }
            cell = cell.master;
            columnName += cell.value + this.groupHeaderSeparator;
        }

        return columnName.substr(0, columnName.length - this.groupHeaderSeparator.length);
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
