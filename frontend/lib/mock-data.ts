export type EventKind =
  | 'user'
  | 'tool-call'
  | 'tool-result'
  | 'state'
  | 'stream'
  | 'agent';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
  status: 'final' | 'streaming';
  image?: string;
  imageType?: string;
}

export interface TimelineEvent {
  id: string;
  kind: EventKind;
  title: string;
  summary: string;
  timestamp: string;
  payload: string[];
}

export interface SessionRecord {
  id: string;
  title: string;
  subtitle: string;
  status: 'live' | 'idle' | 'pending';
  updatedAt: string;
  messages: ChatMessage[];
  events: TimelineEvent[];
  state: Record<string, string>;
}

export interface SimulatedTurn {
  toolName: string;
  toolArgs: Record<string, string | number>;
  toolSummary: string;
  productName: string;
  statePatch: Record<string, string>;
  streamText: string;
  finalText: string;
}

const objectiveLabelMap: Record<string, string> = {
  medical: '醫療保障',
  accident: '意外保障',
  family_protection: '家庭責任保障',
  income_protection: '收入中斷保障',
};

const objectiveToolMap: Record<string, string> = {
  medical: 'search_medical_products',
  accident: 'search_accident_products',
  family_protection: 'search_family_protection_products',
  income_protection: 'search_income_protection_products',
};

const objectiveProductMap: Record<string, string> = {
  medical: '安心住院醫療 2000 計畫',
  accident: '意外即時守護 A 方案',
  family_protection: '家庭責任安心定期壽險',
  income_protection: '收入緩衝失能保障 Plus',
};

export const initialSessions: SessionRecord[] = [
  {
    id: 'session-medical',
    title: '醫療保障訪談',
    subtitle: '沿用年齡、預算與上一張推薦商品',
    status: 'live',
    updatedAt: '剛剛',
    messages: [
      {
        id: 'msg-medical-1',
        role: 'user',
        text: '我 30 歲，年度預算 15000，想加強醫療保障。',
        timestamp: '09:12',
        status: 'final',
      },
      {
        id: 'msg-medical-2',
        role: 'agent',
        text: '目前條件足夠，我先以醫療保障工具查詢候選商品，再整理推薦原因、等待期與除外條款提醒。',
        timestamp: '09:12',
        status: 'final',
      },
    ],
    events: [
      {
        id: 'evt-medical-1',
        kind: 'user',
        title: 'user_message',
        summary: '收到需求：30 歲 / 15000 / 醫療保障',
        timestamp: '09:12',
        payload: ['author: user', 'invocation_id: inv-medical-001'],
      },
      {
        id: 'evt-medical-2',
        kind: 'tool-call',
        title: 'search_medical_products',
        summary: 'LLM 觸發結構化醫療商品查詢',
        timestamp: '09:12',
        payload: ['args: {"age": 30, "budget": 15000, "objective": "medical"}'],
      },
      {
        id: 'evt-medical-3',
        kind: 'tool-result',
        title: 'search_medical_products result',
        summary: '找到 3 個候選商品，最佳匹配已排序',
        timestamp: '09:12',
        payload: ['top_product: 安心住院醫療 2000 計畫', 'candidate_count: 3'],
      },
      {
        id: 'evt-medical-4',
        kind: 'state',
        title: 'state_delta',
        summary: '更新最近一次推薦與保障目標',
        timestamp: '09:12',
        payload: ['lastProduct: 安心住院醫療 2000 計畫', 'objective: medical'],
      },
      {
        id: 'evt-medical-5',
        kind: 'agent',
        title: 'final_response',
        summary: '完成一輪可顯示的 agent response',
        timestamp: '09:12',
        payload: ['is_final_response: true', 'turn_complete: true'],
      },
    ],
    state: {
      age: '30',
      annualBudget: '15000 元',
      objective: 'medical',
      household: '單身',
      lastProduct: '安心住院醫療 2000 計畫',
      adviceMode: '保守說明',
    },
  },
  {
    id: 'session-family',
    title: '家庭保障追問',
    subtitle: '示範先追問再查工具的互動節奏',
    status: 'idle',
    updatedAt: '3 分鐘前',
    messages: [
      {
        id: 'msg-family-1',
        role: 'user',
        text: '我想補家庭保障。',
        timestamp: '09:08',
        status: 'final',
      },
      {
        id: 'msg-family-2',
        role: 'agent',
        text: '我可以幫你整理家庭保障選項；但還缺年齡與年度預算，先補這兩項我再查候選商品。',
        timestamp: '09:08',
        status: 'final',
      },
    ],
    events: [
      {
        id: 'evt-family-1',
        kind: 'user',
        title: 'user_message',
        summary: '收到需求，但資料不足',
        timestamp: '09:08',
        payload: ['missing_fields: age, annualBudget'],
      },
      {
        id: 'evt-family-2',
        kind: 'agent',
        title: 'follow_up_question',
        summary: '根據 prompt policy 發出追問',
        timestamp: '09:08',
        payload: ['is_final_response: true', 'turn_complete: true'],
      },
    ],
    state: {
      objective: 'family_protection',
      adviceMode: '保守說明',
      lastProduct: '尚未推薦',
    },
  },
  {
    id: 'session-income',
    title: '收入中斷保障',
    subtitle: '示範工具結果、state 與最終回覆分開落事件',
    status: 'idle',
    updatedAt: '12 分鐘前',
    messages: [
      {
        id: 'msg-income-1',
        role: 'user',
        text: '如果我月收入 6 萬，預算 2 萬，想補收入中斷風險，有什麼方向？',
        timestamp: '08:59',
        status: 'final',
      },
      {
        id: 'msg-income-2',
        role: 'agent',
        text: '我會先看收入中斷保障商品，再補充理賠條件與等待期提醒，避免把收益或核保當成承諾。',
        timestamp: '08:59',
        status: 'final',
      },
    ],
    events: [
      {
        id: 'evt-income-1',
        kind: 'tool-call',
        title: 'search_income_protection_products',
        summary: '依收入風險場景執行查詢',
        timestamp: '08:59',
        payload: ['args: {"budget": 20000, "objective": "income_protection"}'],
      },
      {
        id: 'evt-income-2',
        kind: 'tool-result',
        title: 'get_recommendation_rules',
        summary: '補抓規則說明，提供推薦理由',
        timestamp: '08:59',
        payload: ['rule_priority: income-01', 'waiting_period: 60 days'],
      },
    ],
    state: {
      annualBudget: '20000 元',
      objective: 'income_protection',
      household: '已婚',
      lastProduct: '收入緩衝失能保障 Plus',
      adviceMode: '保守說明',
    },
  },
];

export function simulateAgentTurn(
  prompt: string,
  sessionState: Record<string, string>,
): SimulatedTurn {
  const promptLower = prompt.toLowerCase();
  const ageMatch = prompt.match(/(\d{2})\s*歲/);
  const budgetMatch = prompt.match(/(\d{4,6})/);

  const objective = detectObjective(promptLower, sessionState.objective);
  const objectiveLabel = objectiveLabelMap[objective];
  const toolName = objectiveToolMap[objective];
  const productName = objectiveProductMap[objective];
  const budgetValue =
    budgetMatch?.[1] ??
    sessionState.annualBudget?.replace(/[^\d]/g, '') ??
    '15000';
  const household = /已婚|小孩|家庭/.test(prompt)
    ? '已婚有眷屬'
    : (sessionState.household ?? '單身');

  const statePatch: Record<string, string> = {
    objective,
    annualBudget: `${budgetValue} 元`,
    household,
    lastProduct: productName,
  };

  if (ageMatch?.[1]) {
    statePatch.age = ageMatch[1];
  }

  const toolArgs: Record<string, string | number> = {
    objective,
    budget: Number(budgetValue),
  };

  if (ageMatch?.[1]) {
    toolArgs.age = Number(ageMatch[1]);
  }

  const streamText = `已收到需求，正在透過 ${toolName} 查詢候選商品，並同步整理規則與等待期提醒。`;

  const recommendationJson = JSON.stringify({
    type: "insurance_recommendation",
    productName: productName,
    reason: `針對您的${objectiveLabel}需求，此方案提供了最全面的覆蓋，特別是在您的預算範圍內提供了優質的保障。`,
    budgetFit: `完全符合您年度 ${budgetValue} 元的預算設定。`,
    reminders: "投保時需據實告知健康狀況，以免影響理賠權益。",
    terms: "疾病等待期為 30 天，意外傷害則無等待期。",
    rules: "根據推薦規則 IR-001：優先推薦符合預算且保障額度最高之商品。"
  }, null, 2);

  const finalText = [
    `依你目前條件，我會先把重點放在${objectiveLabel}，目前第一順位可先看「${productName}」。`,
    "以下是為您準備的推薦卡片：",
    "```json",
    recommendationJson,
    "```",
    "如果您對此方案感興趣，我可以進一步為您說明詳細條款。"
  ].join('\n\n');

  return {
    toolName,
    toolArgs,
    toolSummary: `${objectiveLabel}候選商品已排序，首位為 ${productName}`,
    productName,
    statePatch,
    streamText,
    finalText,
  };
}

function detectObjective(promptLower: string, fallback?: string): string {
  if (promptLower.includes('醫療') || promptLower.includes('住院')) {
    return 'medical';
  }

  if (promptLower.includes('意外')) {
    return 'accident';
  }

  if (promptLower.includes('收入') || promptLower.includes('失能')) {
    return 'income_protection';
  }

  if (promptLower.includes('家庭') || promptLower.includes('壽險')) {
    return 'family_protection';
  }

  return fallback && objectiveLabelMap[fallback] ? fallback : 'medical';
}
