const APPS_SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;
const GOOGLE_FOLDER_ID = import.meta.env.VITE_GOOGLE_FOLDER_ID;

export interface SemiJobCardRecord {
  timestamp: string;
  sjcSrNo: string;
  sfSrNo: string;
  supervisorName: string;
  productName: string;
  qty: number;
  dateOfProduction: string;
  actualMade?: number;
  pending?: number;
  status?: string;
  planned?: string;
}

export interface RawMaterialOption {
  name: string;
}

export interface SemiActualRecord {
  timestamp: string;
  semiFinishedJobCardNo: string;
  supervisorName: string;
  dateOfProduction: string;
  productName: string;
  qtyOfSemiFinishedGood: number;
  rawMaterial1Name: string;
  rawMaterial1Qty: number;
  rawMaterial2Name: string;
  rawMaterial2Qty: number;
  rawMaterial3Name: string;
  rawMaterial3Qty: number;
  isAnyEndProduct: string;
  endProductRawMaterialName: string;
  endProductQty: number;
  narration: string;
  sNo: string;
  startingReading: number;
  startingReadingPhoto: string;
  endingReading: number;
  endingReadingPhoto: string;
  machineRunningHour: number;
  rawMaterial4Name: string;
  rawMaterial4Qty: number;
  rawMaterial5Name: string;
  rawMaterial5Qty: number;
  machineRunning: number;
  semiFinishedProductionNo: string;
  planned1?: string;
  actual1?: string;
  rowIndex?: number;
  actual1ColumnIndex?: number;
}

// Format date to DD/MM/YY
export const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);

  return `${day}/${month}/${year}`;
};

// Format date string for display (DD/MM/YY)
export const formatDisplayDate = (dateString: string): string => {
  if (!dateString || dateString.trim() === '' || dateString === '-') return '-';

  // If it's already in DD/MM/YY format (length 8 and has slashes), keep it
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateString.trim())) return dateString.trim();

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If Date fails, try to strip time manually if it looks like "DD/MM/YY HH:MM:SS"
      const parts = dateString.split(' ');
      if (parts[0].includes('/')) return parts[0];
      return dateString;
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};

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

// Fetch Semi Job Card data - Only pending jobs (Planned not null and Status = PENDING)
// Fetch Semi Job Card data - Only pending jobs (Status = "Pending" and Planned not null)
export const fetchPendingSemiJobCards = async (): Promise<SemiJobCardRecord[]> => {
  try {
    const data = await fetchSheetData('Semi Job Card');

    if (data.length <= 4) return [];

    // Skip the first 4 header rows
    const dataRows = data.slice(4);

    console.log('Raw Semi Job Card rows:', dataRows); // Debug log

    return dataRows
      .map((row) => {
        // Skip empty rows or rows without SJC number
        if (!row || row.length < 5 || !row[1] || row[1].trim() === '' ||
          row[1].includes('Semi Job Card') || row[1].includes('Devshree') ||
          row[1].includes('Actual')) {
          return null;
        }

        // Log each row for debugging
        console.log('Processing row:', {
          sjcSrNo: row[1],
          status: row[9], // Status column (index 9)
          planned: row[10], // Planned column (index 10)
          actualMade: row[7],
          pending: row[8]
        });

        const sjcSrNo = row[1] || '';
        const status = row[9] ? row[9].toString().trim().toUpperCase() : ''; // Column J - Status
        const planned = row[10] ? row[10].toString().trim() : null; // Column K - Planned
        const actualMade = row[7] ? row[7].toString().trim() : '0';
        const pending = row[8] ? row[8].toString().trim() : '0';

        // Check if status is "PENDING" and planned is not null/empty
        // Also ensure it's not already completed (actualMade not "Complete" or similar)
        const isPending = status === 'PENDING' &&
          planned &&
          planned !== '' &&
          actualMade !== 'Complete' &&
          actualMade !== 'COMPLETE';

        console.log(`SJC ${sjcSrNo}: status=${status}, planned=${planned}, isPending=${isPending}`);

        // Only include if Status is PENDING AND Planned is not null/empty
        if (!isPending) {
          return null;
        }

        return {
          timestamp: row[0] || '',
          sjcSrNo: sjcSrNo,
          sfSrNo: row[2] || '',
          supervisorName: row[3] || '',
          productName: row[4] || '',
          qty: parseFloat(row[5]) || 0,
          dateOfProduction: row[6] || '',
          actualMade: actualMade !== 'Complete' && actualMade !== 'COMPLETE' ? parseFloat(actualMade) || 0 : 0,
          pending: parseFloat(pending) || 0,
          status: status,
          planned: planned
        };
      })
      .filter(record => {
        // Final filter to ensure we only return valid records
        return record !== null &&
          record.sjcSrNo &&
          !record.sjcSrNo.includes('Semi Job Card') &&
          !record.sjcSrNo.includes('Devshree') &&
          !record.sjcSrNo.includes('Actual');
      }) as SemiJobCardRecord[];
  } catch (error) {
    console.error('Error fetching pending semi job cards:', error);
    return [];
  }
};

// Fetch Semi Actual data for display - SKIP HEADER ROWS
export const fetchSemiActualData = async (): Promise<SemiActualRecord[]> => {
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
    console.error('Error fetching semi actual data:', error);
    return [];
  }
};


// Fetch Raw Materials from Master sheet
export const fetchRawMaterials = async (): Promise<RawMaterialOption[]> => {
  try {
    const data = await fetchSheetData('Master');

    if (data.length === 0) return [];

    // Find the column containing raw material names
    let rawMaterialColumnIndex = -1;

    // Search in first few rows for header
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      for (let j = 0; j < row.length; j++) {
        const cellValue = (row[j] || '').toString().toLowerCase().trim();
        if (cellValue.includes('raw material') || cellValue.includes('material name')) {
          rawMaterialColumnIndex = j;
          break;
        }
      }
      if (rawMaterialColumnIndex !== -1) break;
    }

    if (rawMaterialColumnIndex === -1) {
      // Default raw materials if column not found
      return [
        { name: 'Raw Stone' },
        { name: 'Fuel' },
        { name: 'Lubricants' },
        { name: 'Coolant' },
        { name: 'Misc' },
        { name: 'Stone-A' },
        { name: 'Stone-B' },
        { name: 'Fuel-D' },
        { name: 'Mobil-1' },
        { name: 'Grease-X' }
      ];
    }

    // Collect raw material names (skip header row)
    const rawMaterials = new Set<string>();
    const startRow = 1; // Skip header

    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (row && row.length > rawMaterialColumnIndex) {
        const name = row[rawMaterialColumnIndex]?.toString().trim();
        if (name && name !== '' && name !== 'undefined' && name !== 'null') {
          rawMaterials.add(name);
        }
      }
    }

    return Array.from(rawMaterials).map(name => ({ name }));
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    // Return default raw materials on error
    return [
      { name: 'Raw Stone' },
      { name: 'Fuel' },
      { name: 'Lubricants' },
      { name: 'Coolant' },
      { name: 'Misc' }
    ];
  }
};

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Upload image to Google Drive - FIXED to match Apps Script
export const uploadImageToDrive = async (file: File, fileName: string): Promise<string> => {
  try {
    // Convert file to base64
    const base64Data = await fileToBase64(file);

    const formData = new FormData();
    formData.append('action', 'uploadFile'); // Must match Apps Script action
    formData.append('folderId', GOOGLE_FOLDER_ID);
    formData.append('fileName', fileName);
    formData.append('mimeType', file.type);
    formData.append('base64Data', base64Data);

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to upload image');
    }

    return result.fileUrl || '';
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Generate Serial Number for Semi Actual
export const generateSerialNo = async (): Promise<string> => {
  try {
    const data = await fetchSheetData('Semi Actual');

    if (data.length <= 4) {
      return 'SA-001'; // Start from SA-001 if empty
    }

    // Skip header rows (first 4 rows)
    const dataRows = data.slice(4);
    const S_NO_COLUMN_INDEX = 16; // Column Q (0-based index 16)
    const prefix = 'SA-';

    let maxNumber = 0;

    dataRows.forEach(row => {
      if (row && row.length > S_NO_COLUMN_INDEX) {
        const sNoValue = row[S_NO_COLUMN_INDEX]?.toString() || '';
        if (sNoValue.startsWith(prefix)) {
          const numberPart = sNoValue.replace(prefix, '');
          const num = parseInt(numberPart, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });

    const nextNumber = maxNumber + 1;
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;

  } catch (error) {
    console.error('Error generating serial number:', error);
    return 'SA-001';
  }
};

// Submit to Semi Actual sheet
export const submitToSemiActual = async (rowData: any[]): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append('action', 'insert');
    formData.append('sheetName', 'Semi Actual');
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
    console.error('Error submitting to Semi Actual:', error);
    return false;
  }
};