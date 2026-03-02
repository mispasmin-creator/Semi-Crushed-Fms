export const APPS_SCRIPT_URL = (import.meta as any).env.VITE_APPSCRIPT_URL;

export interface DropdownOption {
  value: string;
  label: string;
}

export interface SemiProductionRecord {
  timestamp: string;
  sfSrNo: string;
  nameOfSemiFinished: string;
  qty: number;
  notes: string;
  totalPlanned: number;
  totalMade: number;
  pending: number;
  status: string;
  planned?: string;
  actual?: string;
}

// Fetch data from any sheet using doGet
export const fetchSheetData = async (sheetName: string): Promise<string[][]> => {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(sheetName)}`, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch data');
    }

    return result.data || [];
  } catch (error) {
    console.error(`Error fetching sheet ${sheetName}:`, error);
    throw error;
  }
};

// Fetch the latest SF-Sr No. from Semi Production sheet
export const fetchLatestSFSrNo = async (): Promise<string> => {
  try {
    const data = await fetchSheetData('Semi Production');

    const actualDataRows = data.slice(6);

    if (actualDataRows.length === 0) {
      return 'SF-100';
    }

    const SF_SR_NO_COLUMN_INDEX = 1;
    const sfPrefix = 'SF-';
    let maxNumber = 0;

    actualDataRows.forEach(row => {
      if (row.length > SF_SR_NO_COLUMN_INDEX) {
        const sfValue = row[SF_SR_NO_COLUMN_INDEX]?.toString() || '';
        if (sfValue.startsWith(sfPrefix)) {
          const numberPart = sfValue.replace(sfPrefix, '');
          const num = parseInt(numberPart, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });

    if (maxNumber === 0) return 'SF-100';

    return `SF-${maxNumber + 1}`;
  } catch (error) {
    console.error('Error fetching latest SF number:', error);
    throw error;
  }
};

// Fetch all data from Semi Production sheet
export const fetchSemiProductionData = async (): Promise<SemiProductionRecord[]> => {
  try {
    const data = await fetchSheetData('Semi Production');

    if (data.length <= 6) return [];

    const dataRows = data.slice(6);

    return dataRows.map((row) => {
      if (row.length < 5) return null;

      const timestamp = row[0] || '';
      const sfSrNo = row[1] || '';
      const nameOfSemiFinished = row[2] || '';
      const qty = parseFloat(row[3]) || 0;
      const notes = row[4] || '';
      const totalPlanned = parseFloat(row[5]) || 0;
      const totalMade = parseFloat(row[6]) || 0;
      const pending = parseFloat(row[7]) !== undefined ? parseFloat(row[7]) : qty;
      const cancelOrder = row[8] || ''; // row[8] is Cancel Order (Column I)
      const status = row[9] || (pending > 0 ? 'PENDING' : 'COMPLETED'); // row[9] is Status (Column J)

      let formattedTimestamp = timestamp;
      if (timestamp && timestamp.includes('T')) {
        try {
          formattedTimestamp = new Date(timestamp).toLocaleString();
        } catch (e) {
          // keep original
        }
      }

      return {
        timestamp: formattedTimestamp,
        sfSrNo,
        nameOfSemiFinished,
        qty,
        notes,
        totalPlanned,
        totalMade,
        pending,
        status,
        planned: row[9] || '',
        actual: row[10] || '',
      };
    }).filter(record => record !== null) as SemiProductionRecord[];
  } catch (error) {
    console.error('Error fetching semi production data:', error);
    throw error;
  }
};

// Extract dropdown options from "Crusing Items Name" sheet
export const fetchSemiFinishedOptions = async (): Promise<DropdownOption[]> => {
  try {
    const data = await fetchSheetData('Crusing Items Name');

    if (data.length === 0) return [];

    let headerRowIndex = -1;
    let nameColumnIndex = -1;

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      for (let j = 0; j < row.length; j++) {
        const cellValue = (row[j] || '').toString().trim().toLowerCase();
        if (cellValue === 'crushing product name' || cellValue.includes('crushing product name')) {
          headerRowIndex = i;
          nameColumnIndex = j;
          break;
        }
      }
      if (headerRowIndex !== -1) break;
    }

    if (nameColumnIndex === -1) {
      for (let i = 1; i < Math.min(5, data.length); i++) {
        const row = data[i];
        for (let j = 0; j < row.length; j++) {
          const cellValue = (row[j] || '').toString().trim();
          if (cellValue && cellValue.length > 2 && /[a-zA-Z]/.test(cellValue)) {
            nameColumnIndex = j;
            headerRowIndex = 0;
            break;
          }
        }
        if (nameColumnIndex !== -1) break;
      }
      if (nameColumnIndex === -1) return [];
    }

    const options = new Set<string>();

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (row && row.length > nameColumnIndex) {
        const value = row[nameColumnIndex]?.toString().trim();
        if (value && value !== '' && value !== 'undefined' && value !== 'null') {
          options.add(value);
        }
      }
    }

    return Array.from(options)
      .map(value => ({ value, label: value }))
      .sort((a, b) => a.label.localeCompare(b.label));

  } catch (error) {
    console.error('Error fetching semi-finished options:', error);
    return [];
  }
};

// Writes cancelQty directly into Column I (Cancel Order) for the matching sfSrNo row
export const submitCancelOrder = async (sfSrNo: string, cancelQty: number): Promise<boolean> => {
  try {
    console.log('[cancelOrder] Starting', { sfSrNo, cancelQty });

    // Step 1: fetch sheet to find the matching row
    const data = await fetchSheetData('Semi Production');

    // Rows 0-5 are headers; data starts at index 6
    // Sheet row (1-based) = array index + 1
    const HEADER_OFFSET = 6;
    let targetSheetRow = -1;

    for (let i = HEADER_OFFSET; i < data.length; i++) {
      if (data[i][1]?.toString().trim() === sfSrNo.trim()) {
        targetSheetRow = i + 1; // convert to 1-based sheet row
        break;
      }
    }

    if (targetSheetRow === -1) {
      console.error('[cancelOrder] SF Sr No not found:', sfSrNo);
      return false;
    }

    console.log('[cancelOrder] Writing', cancelQty, 'to col I, sheet row', targetSheetRow);

    // Step 2: write cancelQty into Column I (9, 1-based) - "Cancel Order"
    const fd = new FormData();
    fd.append('action', 'updateCell');
    fd.append('sheetName', 'Semi Production');
    fd.append('rowIndex', String(targetSheetRow));
    fd.append('columnIndex', '9');
    fd.append('value', String(cancelQty));

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      body: fd,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[cancelOrder] Server response', result);

    return result.success === true;

  } catch (error) {
    console.error('[cancelOrder] Error:', error);
    return false;
  }
};

// Submit data to "Semi Production" sheet using doPost
export const submitToSemiProduction = async (rowData: any[]): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append('action', 'insert');
    formData.append('sheetName', 'Semi Production');
    formData.append('rowData', JSON.stringify(rowData));

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Error submitting to Semi Production:', error);
    return false;
  }
};