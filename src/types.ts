export type MedicationCategory = "herb" | "painkiller";

export interface Medication {
  id: string;
  name: string;
  subtitle: string;
  category: MedicationCategory;
  minIntervalHours: number;
  dailyMaxLimit: number;
  defaultDose: string;
  order: number;
}

export interface DoseLog {
  id: string;
  timestamp: number;
  medicationId: string;
  medicationName: string;
  category: MedicationCategory;
  dose?: string;
  painScale?: number | null;
  notes?: string;
}

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isMock?: boolean;
}

export const DEFAULT_MEDICATIONS: Medication[] = [
  {
    id: "herb_1",
    name: "허브 1",
    subtitle: "페퍼민트 오일 / 차",
    category: "herb",
    minIntervalHours: 2,
    dailyMaxLimit: 4,
    defaultDose: "1잔",
    order: 1
  },
  {
    id: "herb_2",
    name: "허브 2",
    subtitle: "피버퓨 / 마그네슘",
    category: "herb",
    minIntervalHours: 4,
    dailyMaxLimit: 3,
    defaultDose: "1정",
    order: 2
  },
  {
    id: "herb_3",
    name: "허브 3",
    subtitle: "카모마일 / 레몬밤",
    category: "herb",
    minIntervalHours: 2,
    dailyMaxLimit: 4,
    defaultDose: "1회",
    order: 3
  },
  {
    id: "painkiller_1",
    name: "진통제 1",
    subtitle: "아세트아미노펜 계열",
    category: "painkiller",
    minIntervalHours: 4,
    dailyMaxLimit: 4,
    defaultDose: "500mg",
    order: 4
  },
  {
    id: "painkiller_2",
    name: "진통제 2",
    subtitle: "NSAIDs / 이부프로펜",
    category: "painkiller",
    minIntervalHours: 6,
    dailyMaxLimit: 3,
    defaultDose: "400mg",
    order: 5
  }
];

