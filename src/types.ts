export interface Contractor {
  uid: string;
  name?: string;
  email: string;
  regions: string[];
  categories: string[];
  createdAt?: any;
}

export interface JobLead {
  id?: string;
  title: string;
  description: string;
  pay: string;
  region: string;
  sourceUrl: string;
  sourceSite: string;
  category: string;
  status: "new" | "saved" | "contacted" | "ignored";
  contractorId: string;
  createdAt?: any;
}

export interface SearchLog {
  id: string;
  contractorId: string;
  query: string;
  timestamp: any;
  resultsCount: number;
}
