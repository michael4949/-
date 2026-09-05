export interface FnSource { level: string; module: string; course: string; points: string[] }
export interface ProductFunction {
  id: string; product: string; name: string; summary: string;
  sources: FnSource[]; input: string; process: string; panels: string[];
  output: string; dataSources: string[]; compliance: string; demoSample: string;
}
export interface Catalog { functions: ProductFunction[]; stats: { products: number; functions: number; sourceCourses: number; points: number } }
