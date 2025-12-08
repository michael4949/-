export interface GroundingSource {
  title: string;
  uri: string;
}

export interface MaturityDimension {
  dimension: string;
  score: number; // 0-100
  description: string;
}

export interface Scenario {
  name: string;
  impact: number; // 0-100
  feasibility: number; // 0-100
  description: string;
}

export interface Methodology {
  title: string;
  iconType: 'chart' | 'process' | 'target' | 'puzzle';
  content: string;
}

export interface RoadmapPhase {
  phase: string;
  timeframe: string;
  title: string;
  items: string[];
}

export interface ReportData {
  companyName: string;
  reportTitle: string;
  executiveSummary: string;
  backgroundImageKeyword: string; // Used to fetch a relevant placeholder
  maturityModel: {
    title: string;
    description: string;
    data: MaturityDimension[];
  };
  highValueScenarios: {
    title: string;
    description: string;
    data: Scenario[];
  };
  methodologies: Methodology[];
  roadmap: RoadmapPhase[];
  conclusion: string;
}

export interface ReportResponse {
  report: ReportData;
  sources: GroundingSource[];
}

// New types for the Refinement Step
export interface RefinementOption {
  label: string;
  value: string;
}

export interface RefinementQuestion {
  id: string;
  question: string;
  allowMultiple: boolean;
  options: RefinementOption[];
}

export interface RefinementResponse {
  questions: RefinementQuestion[];
}
