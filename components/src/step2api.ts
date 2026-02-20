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
export const fetchSemiProductionData = async (): Promise<SemiProductionRecord[]> => {
  try {
    const data = await fetchSheetData('Semi Production');
    
    if (data.length <= 4) return [];
    
    // Skip header rows (first 4 rows)
    const dataRows = data.slice(4);
    
    return dataRows
      .map((row) => {
        // Skip empty rows
        if (!row || row.length < 5 || !row[1] || row[1].trim() === '') {
          return null;
        }
        
        const timestamp = row[0] || '';
        const sfSrNo = row[1] || '';
        const nameOfSemiFinished = row[2] || '';
        const qty = parseFloat(row[3]) || 0;
        const notes = row[4] || '';
        const totalPlanned = parseFloat(row[5]) || 0;
        const totalMade = parseFloat(row[6]) || 0;
        const pending = parseFloat(row[7]) !== undefined ? parseFloat(row[7]) : qty;
        const status = row[8] || (pending > 0 ? 'PENDING' : 'COMPLETED');
        const planned = row[9] || null;
        const actual = row[10] || null;
        
        return {
          timestamp,
          sfSrNo,
          nameOfSemiFinished,
          qty,
          notes,
          totalPlanned,
          totalMade,
          pending,
          status,
          planned,
          actual
        };
      })
      .filter(record => record !== null) as SemiProductionRecord[];
  } catch (error) {
    console.error('Error fetching semi production data:', error);
    throw error;
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
export const fetchSemiJobCardData = async (): Promise<SemiJobCardRecord[]> => {
  try {
    const data = await fetchSheetData('Semi Job Card');
    
    if (data.length <= 4) return []; // Need at least 4 rows of headers + data
    
    // Skip the first 4 header rows
    const dataRows = data.slice(4);
    
    return dataRows
      .map((row) => {
        // Skip empty rows or rows without SJC number
        if (!row || row.length < 2 || !row[1] || row[1].trim() === '' || row[1].includes('Semi Job Card')) {
          return null;
        }
        
        return {
          timestamp: row[0] || '',
          sjcSrNo: row[1] || '',
          sfSrNo: row[2] || '',
          supervisorName: row[3] || '',
          productName: row[4] || '',
          qty: parseFloat(row[5]) || 0,
          dateOfProduction: row[6] || '',
          actualMade: row[7] ? parseFloat(row[7]) : 0,
          pending: row[8] ? parseFloat(row[8]) : (parseFloat(row[5]) || 0),
          status: row[9] || 'PENDING'
        };
      })
      .filter(record => record !== null && record.sjcSrNo && !record.sjcSrNo.includes('Semi Job Card')) as SemiJobCardRecord[];
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

// Get pending orders (Planned not null, Actual null)
export const getPendingOrders = (productionData: SemiProductionRecord[]): SemiProductionRecord[] => {
  return productionData.filter(prod => 
    prod.planned && prod.planned !== '' && (!prod.actual || prod.actual === '')
  );
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