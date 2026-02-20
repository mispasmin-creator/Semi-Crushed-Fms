import { fetchSheetData, APPS_SCRIPT_URL } from './googleSheetsApi';
import { SemiActualRecord } from './step3.api';

// Fetch Semi Actual data for Step 4 (Mark Done)
export const fetchStep4Data = async (): Promise<SemiActualRecord[]> => {
    try {
        const data = await fetchSheetData('Semi Actual');

        if (data.length === 0) return [];

        // Find header row and column indices
        let headerRowIndex = -1;
        let planned1Index = -1;
        let actual1Index = -1;

        // Search for header row containing the keywords
        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row = data[i];
            let hasPlanned = false;
            let hasActual = false;
            for (let j = 0; j < row.length; j++) {
                const val = (row[j] || '').toString().toLowerCase().trim();
                if (val === 'planned1') {
                    planned1Index = j;
                    hasPlanned = true;
                }
                if (val === 'actual1') {
                    actual1Index = j;
                    hasActual = true;
                }
            }
            if (hasPlanned || hasActual) {
                headerRowIndex = i;
                break;
            }
        }

        const startOffset = headerRowIndex !== -1 ? headerRowIndex + 1 : 4;
        const dataRows = data.slice(startOffset);

        return dataRows
            .map((row, index) => {
                // Skip empty rows or rows with header text
                if (!row || row.length < 5 || !row[1] ||
                    row[1].trim() === '' ||
                    row[1].includes('Semi Finished Entry') ||
                    row[1].includes('Devshree') ||
                    row[1].includes('Form') ||
                    row[1].includes('Actual')) {
                    return null;
                }

                return {
                    timestamp: row[0] || '',
                    semiFinishedJobCardNo: row[1] || '',
                    supervisorName: row[2] || '',
                    dateOfProduction: row[3] || '',
                    productName: row[4] || '',
                    qtyOfSemiFinishedGood: parseFloat(row[5]) || 0,
                    rawMaterial1Name: row[6] || '',
                    rawMaterial1Qty: parseFloat(row[7]) || 0,
                    rawMaterial2Name: row[8] || '',
                    rawMaterial2Qty: parseFloat(row[9]) || 0,
                    rawMaterial3Name: row[10] || '',
                    rawMaterial3Qty: parseFloat(row[11]) || 0,
                    isAnyEndProduct: row[12] || 'No',
                    endProductRawMaterialName: row[13] || '',
                    endProductQty: parseFloat(row[14]) || 0,
                    narration: row[15] || '',
                    sNo: row[16] || '',
                    startingReading: parseFloat(row[17]) || 0,
                    startingReadingPhoto: row[18] || '',
                    endingReading: parseFloat(row[19]) || 0,
                    endingReadingPhoto: row[20] || '',
                    machineRunningHour: parseFloat(row[21]) || 0,
                    rawMaterial4Name: row[22] || '',
                    rawMaterial4Qty: parseFloat(row[23]) || 0,
                    rawMaterial5Name: row[24] || '',
                    rawMaterial5Qty: parseFloat(row[25]) || 0,
                    machineRunning: parseFloat(row[26]) || 0,
                    semiFinishedProductionNo: row[27] || '',
                    planned1: String(planned1Index !== -1 ? row[planned1Index] ?? '' : (row[28] ?? '')),
                    actual1: String(actual1Index !== -1 ? row[actual1Index] ?? '' : (row[29] ?? '')),
                    rowIndex: startOffset + index + 1, // 1-based index for Google Sheets
                    actual1ColumnIndex: actual1Index !== -1 ? actual1Index + 1 : 30 // 1-based index (fallback to 30 if column not found)
                };
            })
            .filter(record => record !== null) as SemiActualRecord[];
    } catch (error) {
        console.error('Error fetching step 4 data:', error);
        return [];
    }
};

// Update actual1 date in Semi Actual sheet
export const updateStep4ActualDate = async (rowIndex: number, columnIndex: number, date: string): Promise<boolean> => {
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
        console.error('Error updating step 4 actual date:', error);
        return false;
    }
};
