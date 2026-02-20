
export enum ProductionStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  IN_PROGRESS = 'In Progress'
}

export interface RawMaterial {
  name: string;
  qty: number;
}

export interface Step1SFProduction {
  id: string;
  timestamp: string;
  sfSrNo: string;
  name: string;
  qty: number;
  notes: string;
  totalPlanned: number; // Sum of SJCs
  totalMade: number;    // Sum of Step 3 Entries
  pending: number;      // qty - totalMade
  status: ProductionStatus;
}

export interface Step2SJCPlanning {
  id: string;
  sjcSrNo: string;
  sfProductionId: string;
  supervisorName: string;
  productName: string;
  qty: number;
  date: string;
  actualMade: number; // Sum of Step 3 Entries for this SJC
}

export interface Step3SFEntry {
  id: string;
  sjcId: string;
  sfProductionId: string;
  supervisorName: string;
  date: string;
  productName: string;
  qtyProduced: number;
  rawMaterials: RawMaterial[];
  isAnyEndProduct: boolean;
  endProductName: string;
  endProductQty: number;
  narration: string;
  startReading: number;
  endReading: number;
  machineRunningHours: number;
  startPhoto?: string;
  endPhoto?: string;
}

export interface FinishedGoodOutput {
  name: string;
  qty: number;
}

export interface Step5Crushing {
  id: string;
  cjcSrNo: string;
  date: string;
  sfProductName: string;
  qtyCrushed: number;
  finishedGoods: FinishedGoodOutput[];
  startPhoto?: string;
  endPhoto?: string;
  remarks: string;
  machineRunningHours: number;
}

export interface AppState {
  productions: Step1SFProduction[];
  jobCards: Step2SJCPlanning[];
  actualEntries: Step3SFEntry[];
  crushingEntries: Step5Crushing[];
}
