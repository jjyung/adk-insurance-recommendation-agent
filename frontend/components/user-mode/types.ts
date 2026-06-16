export type ProductType =
  | 'medical'
  | 'accident'
  | 'family_protection'
  | 'income_protection'
  | 'critical_illness'
  | 'life'
  | string;

export type BudgetFit =
  | 'fully_within_budget'
  | 'entry_affordable'
  | 'over_budget'
  | string;

export interface Product {
  product_id: number | string;
  product_name: string;
  product_type: ProductType;
  target_age_min?: number;
  target_age_max?: number;
  annual_premium_min?: number;
  annual_premium_max?: number;
  coverage_focus?: string;
  coverage_summary?: string;
  waiting_period_days?: number;
  exclusions?: string;
  budget_fit?: BudgetFit;
  source_tool?: string;
  /** 來自 agent message 內 ```json insurance_recommendation 區塊` 的補充欄位 */
  reason?: string;
  reminders?: string;
  terms?: string;
  rules?: string;
  /** 來自推薦時的人類可讀預算評估文字 (e.g. "年保費約 5000 - 10000 元") */
  budget_fit_text?: string;
}

export type UserModeView = 'empty' | 'browsing' | 'detail';
