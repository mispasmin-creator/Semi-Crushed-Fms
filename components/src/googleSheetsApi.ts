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
    throw error; // Throw error instead of returning empty array
  }
};

// Fetch the latest SF-Sr No. from Semi Production sheet
export const fetchLatestSFSrNo = async (): Promise<string> => {
  try {
    const data = await fetchSheetData('Semi Production');

    // Skip header rows (first 4 rows as shown in your screenshot)
    const actualDataRows = data.slice(6);

    if (actualDataRows.length === 0) {
      return 'SF-100';
    }

    const SF_SR_NO_COLUMN_INDEX = 1; // Column B (0-based index)
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

    if (maxNumber === 0) {
      return 'SF-100';
    }

    const nextNumber = maxNumber + 1;
    return `SF-${nextNumber}`;

  } catch (error) {
    console.error('Error fetching latest SF number:', error);
    throw error; // Throw error instead of returning fallback
  }
};

// Fetch all data from Semi Production sheet
export const fetchSemiProductionData = async (): Promise<SemiProductionRecord[]> => {
  try {
    const data = await fetchSheetData('Semi Production');

    if (data.length <= 6) return [];

    // Skip the first 4 header rows
    const dataRows = data.slice(6);

    return dataRows.map((row) => {
      // Make sure row has enough columns
      if (row.length < 5) return null;

      const timestamp = row[0] || '';
      const sfSrNo = row[1] || '';
      const nameOfSemiFinished = row[2] || '';
      const qty = parseFloat(row[3]) || 0;
      const notes = row[4] || '';
      const totalPlanned = parseFloat(row[5]) || 0;
      const totalMade = parseFloat(row[6]) || 0;
      const pending = parseFloat(row[7]) !== undefined ? parseFloat(row[7]) : qty;
      const status = row[8] || (pending > 0 ? 'PENDING' : 'COMPLETED');

      // Format timestamp properly
      let formattedTimestamp = timestamp;
      if (timestamp && timestamp.includes('T')) {
        try {
          const date = new Date(timestamp);
          formattedTimestamp = date.toLocaleString();
        } catch (e) {
          // Keep original if parsing fails
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
        actual: row[10] || ''
      };
    }).filter(record => record !== null) as SemiProductionRecord[];
  } catch (error) {
    console.error('Error fetching semi production data:', error);
    throw error; // Throw error instead of returning empty array
  }
};

// Extract dropdown options from "Crushing Items Name" sheet - PURE DYNAMIC VERSION
export const fetchSemiFinishedOptions = async (): Promise<DropdownOption[]> => {
  try {
    console.log('Fetching options from Crushing Items Name sheet...');
    const data = await fetchSheetData('Crushing Items Name');

    console.log('Raw data from Crushing Items Name:', data);

    if (data.length === 0) {
      console.log('No data returned from sheet');
      return []; // Return empty array, no hardcoded data
    }

    // Log all rows to see structure
    data.forEach((row, index) => {
      console.log(`Row ${index}:`, row);
    });

    // Find the header row (usually first row with content)
    let headerRowIndex = -1;
    let nameColumnIndex = -1;

    // Search for the header row that contains "Name Of Semi Finished Good"
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      for (let j = 0; j < row.length; j++) {
        const cellValue = (row[j] || '').toString().trim();
        if (cellValue.toLowerCase().includes('name of semi finished good')) {
          headerRowIndex = i;
          nameColumnIndex = j;
          console.log(`Found header at row ${i}, column ${j}:`, cellValue);
          break;
        }
      }
      if (headerRowIndex !== -1) break;
    }

    if (nameColumnIndex === -1) {
      console.log('Name Of Semi Finished Good column not found in any header row');
      return []; // Return empty array if column not found
    }

    console.log(`Using header row ${headerRowIndex}, column ${nameColumnIndex} for product names`);

    // Collect all values from the identified column (starting after header row)
    const options = new Set<string>();

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (row && row.length > nameColumnIndex) {
        const value = row[nameColumnIndex]?.toString().trim();
        // Only add non-empty, non-null values
        if (value && value !== '' && value !== 'undefined' && value !== 'null') {
          options.add(value);
          console.log(`Found product at row ${i}:`, value);
        }
      }
    }

    console.log('Collected unique products:', Array.from(options));

    // Convert to array of options
    const result = Array.from(options).map(value => ({
      value,
      label: value
    }));

    console.log('Final dropdown options:', result);
    return result;

  } catch (error) {
    console.error('Error fetching semi-finished options:', error);
    return []; // Return empty array on error - NO HARDCODED DATA
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
      body: formData
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