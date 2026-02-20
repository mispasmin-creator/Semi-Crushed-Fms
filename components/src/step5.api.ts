import { fetchSheetData, APPS_SCRIPT_URL } from './googleSheetsApi';
import { SemiActualRecord } from './step3.api';

export interface CrushingItem {
    name: string;
}

export interface CrushingSubmissionData {
    dateOfProduction: string;
    date: string;
    startingReadingPhoto: string;
    endingReadingPhoto: string;
    crushingProductName: string;
    fg1Name: string;
    fg1Qty: number;
    fg2Name: string;
    fg2Qty: number;
    fg3Name: string;
    fg3Qty: number;
    fg4Name: string;
    fg4Qty: number;
    remarks: string;
    machineRunningHour: number;
    semiActualSNo: string; // To link back
    rowIndex: number; // To update actual2 in Semi Actual
    actual2ColumnIndex: number;
}

// Fetch crushing items for dropdowns (4 separate columns for FG1-4)
export const fetchCrushingItems = async (): Promise<{ headers: string[], options: string[][] }> => {
    try {
        const data = await fetchSheetData('Crusing Items Name');

        if (!data || data.length === 0) {
            return { headers: [], options: [[], [], [], [], []] };
        }

        // Columns with gap pattern: 0,2,4,6,8
        const targetIndices = [0, 2, 4, 6, 8];

        // Extract headers safely
        const headers = targetIndices.map(index =>
            data[0] && data[0][index]
                ? data[0][index].toString().trim()
                : `Column ${index}`
        );

        // Initialize 5 dropdown arrays
        const options: string[][] = targetIndices.map(() => []);

        // Extract values from each column
        data.slice(1).forEach(row => {
            targetIndices.forEach((colIndex, arrayIndex) => {
                const value = row[colIndex];
                if (value && value.toString().trim() !== '') {
                    options[arrayIndex].push(value.toString().trim());
                }
            });
        });

        return { headers, options };

    } catch (error) {
        console.error('Error fetching crushing items:', error);
        return { headers: [], options: [[], [], [], [], []] };
    }
};

// Fetch all crushing jobs (pending and history) from Semi Actual
export const fetchCrushingJobs = async (): Promise<SemiActualRecord[]> => {
    try {
        const data = await fetchSheetData('Semi Actual');
        if (data.length === 0) return [];

        // Find header row and column indices
        let headerRowIndex = -1;
        let planned2Index = -1;
        let actual2Index = -1;

        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row = data[i];
            let hasPlanned2 = false;
            let hasActual2 = false;
            for (let j = 0; j < row.length; j++) {
                const val = (row[j] || '').toString().toLowerCase().trim();
                if (val === 'planned2') {
                    planned2Index = j;
                    hasPlanned2 = true;
                }
                if (val === 'actual2') {
                    actual2Index = j;
                    hasActual2 = true;
                }
            }
            if (hasPlanned2 || hasActual2) {
                headerRowIndex = i;
                break;
            }
        }

        const startOffset = headerRowIndex !== -1 ? headerRowIndex + 1 : 4;
        const dataRows = data.slice(startOffset);

        return dataRows.map((row, index) => {
            if (!row || row.length < 5 || !row[1] || row[1].trim() === '') return null;

            return {
                timestamp: row[0] || '',
                semiFinishedJobCardNo: row[1] || '',
                supervisorName: row[2] || '',
                dateOfProduction: row[3] || '',
                productName: row[4] || '',
                qtyOfSemiFinishedGood: parseFloat(row[5]) || 0,
                sNo: row[16] || '',
                planned2: String(planned2Index !== -1 ? row[planned2Index] ?? '' : (row[30] ?? '')),
                actual2: String(actual2Index !== -1 ? row[actual2Index] ?? '' : (row[31] ?? '')),
                rowIndex: startOffset + index + 1,
                actual2ColumnIndex: actual2Index !== -1 ? actual2Index + 1 : 32
            } as any;
        }).filter((r: any) => r && r.planned2 && r.planned2.trim() !== '') as any;
    } catch (error) {
        console.error('Error fetching crushing jobs:', error);
        return [];
    }
};

// Submit to crushing actual
export const submitCrushingActual = async (rowData: any[]): Promise<boolean> => {
    try {
        const formData = new FormData();
        formData.append('action', 'insert');
        formData.append('sheetName', 'Crushing_actual');
        formData.append('rowData', JSON.stringify(rowData));

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            body: formData
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();

        if (!result.success) {
            console.error('Apps Script Error in submitCrushingActual:', result.error);
            // Optionally throw to let the caller handle the specific message
            // throw new Error(result.error); 
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error submitting crushing actual:', error);
        return false;
    }
};

// Update actual2 in Semi Actual sheet
export const updateCrushingActualDate = async (rowIndex: number, columnIndex: number, date: string): Promise<boolean> => {
    try {
        const formData = new FormData();
        formData.append('action', 'updateCell');
        formData.append('sheetName', 'Semi Actual');
        formData.append('rowIndex', rowIndex.toString());
        formData.append('columnIndex', columnIndex.toString());
        formData.append('value', date);

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            body: formData
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        return result.success === true;
    } catch (error) {
        console.error('Error updating crushing actual date:', error);
        return false;
    }
};
