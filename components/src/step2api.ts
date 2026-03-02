const APPS_SCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;

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

export interface SemiJobCardRecord {
  timestamp: string;
  sjcSrNo: string;
  sfSrNo: string;
  supervisorName: string;
  productName: string;
  qty: number;
  dateOfProduction: string;
  // Optional fields that might exist in the sheet
  actualMade?: number;
  pending?: number;
  status?: string;
}

export interface Supervisor {
  name: string;
}

// Format date to DD/MM/YY HH:MM:SS
export const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
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

// Fetch Semi Production data
// Fetch Semi Production data
// Fetch Semi Production data
// Fetch Semi Production data
export const fetchSemiProductionData = async (): Promise<SemiProductionRecord[]> => {
  try {
    const data = await fetchSheetData('Semi Production');

    if (data.length <= 4) return [];

    // Skip header rows (first 4 rows)
    const dataRows = data.slice(4);

    return dataRows
      .map((row, index) => {
        // Skip empty rows
        if (!row || row.length < 2) return null;
        
        // MORE AGGRESSIVE HEADER SKIPPING
        const sfSrNo = row[1] || '';
        
        // Check if this is a valid SF number (should start with SF-)
        if (!sfSrNo || 
            !sfSrNo.includes('SF-') || // Only include actual SF numbers
            sfSrNo.includes('SF-Sr No') || 
            sfSrNo.includes('Timestamp') ||
            sfSrNo.trim() === '') {
          return null;
        }

        const timestamp = row[0] || '';
        const nameOfSemiFinished = row[2] || '';
        const qty = parseFloat(row[3]) || 0;
        const notes = row[4] || '';
        const totalPlanned = parseFloat(row[5]) || 0;
        const totalMade = parseFloat(row[6]) || 0;
        const pending = row[7] ? parseFloat(row[7]) : qty;
        
        // Column J is "Status" (index 9)
        const status = row[9] || (pending > 0 ? 'PENDING' : 'COMPLETED');
        
        // Column K is "Planned" (index 10)
        let planned = row[10] || null;
        
        // Format planned date if it exists
        if (planned) {
          // Handle format like "2/18/2026, 4:17:51 PM"
          const dateMatch = planned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (dateMatch) {
            const [_, month, day, year] = dateMatch;
            planned = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)}`;
          }
        }
        
        // Column L is "Actual" (index 11)
        const actual = row[11] || null;

        return {
          timestamp,
          sfSrNo,
          nameOfSemiFinished,
          qty,
          notes,
          totalPlanned,
          totalMade,
          pending,
          status: status.trim(),
          planned,
          actual
        };
      })
      .filter(record => record !== null) as SemiProductionRecord[];
  } catch (error) {
    console.error('Error fetching semi production data:', error);
    return [];
  }
};
// Fetch Supervisors from Master sheet
export const fetchSupervisors = async (): Promise<Supervisor[]> => {
  try {
    const data = await fetchSheetData('Master');

    if (data.length === 0) return [];

    // Find the column containing supervisor names
    let supervisorColumnIndex = -1;

    // Search in first few rows for header
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      for (let j = 0; j < row.length; j++) {
        const cellValue = (row[j] || '').toString().toLowerCase().trim();
        if (cellValue.includes('supervisor') || cellValue.includes('name')) {
          supervisorColumnIndex = j;
          break;
        }
      }
      if (supervisorColumnIndex !== -1) break;
    }

    if (supervisorColumnIndex === -1) {
      // Default supervisors if column not found
      return [
        { name: 'Rahul Kumar' },
        { name: 'Amit Singh' },
        { name: 'Sunil Verma' },
        { name: 'Suresh Das' },
        { name: 'Rajesh Kumar' }
      ];
    }

    // Collect supervisor names (skip header row)
    const supervisors = new Set<string>();
    const startRow = 1; // Skip header

    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (row && row.length > supervisorColumnIndex) {
        const name = row[supervisorColumnIndex]?.toString().trim();
        if (name && name !== '' && name !== 'undefined' && name !== 'null') {
          supervisors.add(name);
        }
      }
    }

    return Array.from(supervisors).map(name => ({ name }));
  } catch (error) {
    console.error('Error fetching supervisors:', error);
    // Return default supervisors on error
    return [
      { name: 'Rahul Kumar' },
      { name: 'Amit Singh' },
      { name: 'Sunil Verma' },
      { name: 'Suresh Das' },
      { name: 'Rajesh Kumar' }
    ];
  }
};

// Fetch Semi Job Card data - Skip header rows properly
// Fetch Semi Job Card data - Skip header rows properly
// Fetch Semi Job Card data - Skip header rows properly
export const fetchSemiJobCardData = async (): Promise<SemiJobCardRecord[]> => {
  try {
    const data = await fetchSheetData('Semi Job Card');

    if (data.length <= 4) return []; // Need at least 4 rows of headers + data

    // Skip the first 4 header rows
    const dataRows = data.slice(4);

    return dataRows
      .map((row, index) => {
        // Skip empty rows
        if (!row || row.length < 2) return null;
        
        const sjcSrNo = row[1] || '';
        
        // MORE AGGRESSIVE HEADER SKIPPING
        if (!sjcSrNo || 
            sjcSrNo.includes('Semi Job Card') || 
            sjcSrNo.includes('SJC Sr. No') ||
            sjcSrNo.includes('Devshree') ||
            sjcSrNo.includes('Actual') ||
            sjcSrNo.includes('SJC-') === false || // Only include actual SJC numbers
            sjcSrNo.trim() === '') {
          return null;
        }

        const timestamp = row[0] || '';
        const sfSrNo = row[2] || '';
        const supervisorName = row[3] || '';
        const productName = row[4] || '';
        const qty = parseFloat(row[5]) || 0;
        let dateOfProduction = row[6] || '';
        
        // FIXED DATE FORMATTING - Handle ISO date strings
        if (dateOfProduction) {
          // Check if it's an ISO date string (like "2023-01-03T03:30:00.000Z")
          if (dateOfProduction.includes('T') && dateOfProduction.includes('Z')) {
            const date = new Date(dateOfProduction);
            if (!isNaN(date.getTime())) {
              const day = date.getDate().toString().padStart(2, '0');
              const month = (date.getMonth() + 1).toString().padStart(2, '0');
              const year = date.getFullYear().toString().slice(-2);
              dateOfProduction = `${day}/${month}/${year}`;
            }
          }
          // Handle format like "2/18/2026, 4:17:51 PM"
          else {
            const dateMatch = dateOfProduction.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (dateMatch) {
              const [_, month, day, year] = dateMatch;
              dateOfProduction = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)}`;
            }
          }
        }
        
        const actualMade = row[7] ? parseFloat(row[7]) : 0;
        const pending = row[8] ? parseFloat(row[8]) : qty;
        const status = row[9] || (pending > 0 ? 'PENDING' : 'COMPLETED');

        console.log(`Processing job card row ${index + 5}:`, { sjcSrNo, sfSrNo, dateOfProduction });

        return {
          timestamp,
          sjcSrNo: sjcSrNo.trim(),
          sfSrNo: sfSrNo.trim(),
          supervisorName: supervisorName.trim(),
          productName: productName.trim(),
          qty,
          dateOfProduction,
          actualMade,
          pending,
          status: status.trim()
        };
      })
      .filter(record => record !== null) as SemiJobCardRecord[];
  } catch (error) {
    console.error('Error fetching semi job card data:', error);
    return [];
  }
};

// Get latest SJC number
export const fetchLatestSJCNo = async (): Promise<string> => {
  try {
    const data = await fetchSheetData('Semi Job Card');

    if (data.length <= 4) {
      return 'SJC-381'; // Start from SJC-381 if empty
    }

    // Skip header rows (first 4 rows)
    const dataRows = data.slice(4);
    const SJC_COLUMN_INDEX = 1; // Column B
    const sjcPrefix = 'SJC-';

    let maxNumber = 380; // Start from 381

    dataRows.forEach(row => {
      if (row && row.length > SJC_COLUMN_INDEX) {
        const sjcValue = row[SJC_COLUMN_INDEX]?.toString() || '';
        if (sjcValue.startsWith(sjcPrefix)) {
          const numberPart = sjcValue.replace(sjcPrefix, '');
          const num = parseInt(numberPart, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });

    const nextNumber = maxNumber + 1;
    return `SJC-${nextNumber}`;

  } catch (error) {
    console.error('Error fetching latest SJC number:', error);
    return 'SJC-381';
  }
};

// Submit to Semi Job Card sheet - Only 7 columns as requested
export const submitToSemiJobCard = async (rowData: any[]): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append('action', 'insert');
    formData.append('sheetName', 'Semi Job Card');
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
    console.error('Error submitting to Semi Job Card:', error);
    return false;
  }
};

// Get all production orders (returns all records - UI splits by status)
export const getPendingOrders = (productionData: SemiProductionRecord[]): SemiProductionRecord[] => {
  // Return all valid production records regardless of planned/actual date
  // The UI in Step2List filters further by status (pending vs completed)
  return productionData.filter(prod => prod.sfSrNo && prod.sfSrNo !== '');
};

// Get history orders (from Semi Job Card sheet) - Skip header rows
export const getHistoryOrders = (jobCardData: SemiJobCardRecord[]): SemiJobCardRecord[] => {
  return jobCardData.filter(job =>
    job.sjcSrNo &&
    job.sjcSrNo !== '' &&
    !job.sjcSrNo.includes('Semi Job Card') &&
    !job.sjcSrNo.includes('Devshree') &&
    !job.sjcSrNo.includes('Actual')
  );
};

// Get job cards for a specific SF number
export const getJobCardsForSF = (jobCardData: SemiJobCardRecord[], sfSrNo: string): SemiJobCardRecord[] => {
  return jobCardData.filter(jc => jc.sfSrNo === sfSrNo);
};