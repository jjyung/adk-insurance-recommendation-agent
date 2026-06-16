INSERT INTO insurance_products (
    product_id, product_name, product_type, target_age_min, target_age_max,
    annual_premium_min, annual_premium_max, coverage_focus, coverage_summary,
    waiting_period_days, exclusions, is_active
) VALUES
(1, '安心住院醫療方案 A', 'medical', 20, 55, 12000, 24000, '住院醫療', '提供住院日額與手術給付，適合想補強基礎醫療保障者', 30, '既往症、等待期內疾病不賠', 1),
(2, '全方位重大疾病方案 B', 'critical_illness', 25, 60, 18000, 36000, '重大疾病', '提供重大疾病一次性給付，適合家庭經濟支柱', 90, '特定除外疾病、未誠實告知', 1),
(3, '家庭定期壽險方案 C', 'life', 25, 65, 15000, 50000, '家庭保障', '定期壽險，適合有家庭責任與貸款壓力者', 0, '自殺等待期、未揭露健康狀況', 1),
(4, '安心意外防護方案 D', 'accident', 18, 60, 6000, 15000, '意外保障', '提供意外身故與意外醫療，適合通勤族與外勤工作者', 0, '高風險活動不保或限額', 1),
(5, '高齡醫療補強方案 E', 'medical', 46, 70, 22000, 48000, '熟齡醫療', '適合中高齡族群補強醫療保障', 30, '既往症、特定慢性病除外', 1),
(6, '新鮮人基礎保障方案 F', 'accident', 22, 35, 5000, 10000, '低預算基礎保障', '適合預算有限的年輕族群，提供基礎意外保障', 0, '危險職業部分限保', 1),
(7, '經濟型住院醫療方案 G', 'medical', 20, 50, 6000, 12000, '入門住院醫療', '提供基本住院日額與手術給付，適合預算有限想先建立基礎醫療保障者', 30, '既往症、等待期內疾病不賠', 1),
(8, '全方位醫療保障方案 H', 'medical', 25, 55, 14000, 22000, '住院 + 門診 + 重大手術', '住院日額較高並涵蓋門診手術與特定癌症一次給付，適合想要較完整醫療網者', 30, '既往症、特定除外項目', 1),
(9, '高自費實支醫療方案 I', 'medical', 25, 50, 18000, 30000, '自費差額實支實付', '針對自費差額與新式療法給付額度較高，適合擔心住院自費負擔的中高所得族群', 30, '美容整型、實驗性療法除外', 1),
(10, '意外加值保障方案 J', 'accident', 25, 55, 8000, 14000, '意外身故 + 失能 + 醫療', '意外身故失能保障較高並含實支實付醫療日額，適合通勤族與外勤工作者', 0, '高風險活動不保或限額', 1),
(11, '家庭支柱定期壽險 K', 'life', 28, 55, 10000, 25000, '家庭責任保障', '定期壽險保額較高，適合主要經濟支柱補強家庭收入中斷風險', 0, '自殺等待期、未揭露健康狀況', 1),
-- ── 醫療補強 ─────────────────────────────────────────
(12, '學生族醫療入門方案 L', 'medical', 18, 30, 4000, 8000, '學生族住院基礎', '提供基礎住院日額與門診手術，適合學生及社會新鮮人建立第一張醫療', 30, '既往症、等待期內疾病不賠', 1),
(13, '銀髮安康醫療方案 M', 'medical', 55, 75, 28000, 55000, '熟齡住院 + 慢性病補強', '住院日額與特定慢性病保障，並有較長給付天數，適合退休前族群', 30, '部分慢性病既往症除外', 1),
(14, '癌症專項醫療 N', 'medical', 25, 65, 16000, 32000, '癌症專項補強', '癌症一次給付、放化療與標靶藥物理賠，適合家族癌症史族群', 60, '已罹癌或第一年內等待期內確診不賠', 1),
-- ── 意外補強 ─────────────────────────────────────────
(15, '高風險職業意外 O', 'accident', 25, 55, 12000, 22000, '高風險職業意外保障', '意外身故 / 失能 / 住院日額較高，適合警消、營造、外送等職業', 0, '極限運動與爆裂物相關除外', 1),
(16, '銀髮意外守護 P', 'accident', 55, 80, 10000, 18000, '熟齡意外與骨折補強', '針對骨折、跌倒住院與居家照護給付，適合長輩補強意外風險', 0, '過去 12 個月內骨折既往症', 1),
(17, '旅平意外加值 Q', 'accident', 20, 60, 3000, 6000, '短期旅遊意外', '海外旅遊期間意外身故、緊急醫療與行李遺失給付，適合常出國族群', 0, '戰爭區、特定極限活動除外', 1),
-- ── 重大疾病 ─────────────────────────────────────────
(18, '早期重大疾病一次給付 R', 'critical_illness', 20, 50, 10000, 18000, '初期癌症與輕度重疾', '初期癌症、心血管事件、腦血管事件一次給付，適合年輕族群早期布局', 90, '已確診重大疾病不賠', 1),
(19, '全方位重疾終身 S', 'critical_illness', 30, 65, 25000, 50000, '終身重大疾病保障', '提供 35 項重大疾病終身保障，並含豁免保費條款', 90, '特定除外疾病、未誠實告知', 1),
(20, '失能扶助險 T', 'critical_illness', 25, 55, 8000, 15000, '失能月給付保障', '失能後每月給付直至 65 歲，適合擔心收入中斷的年輕家庭', 0, '精神疾病與職業傷害另有規範', 1),
-- ── 壽險 / 家庭責任 ─────────────────────────────────
(21, '青年定期壽險 U', 'life', 22, 45, 6000, 12000, '低預算定期壽險', '20 年定期壽險，保額入門，適合剛出社會或首次投保族群', 0, '自殺等待期、未揭露健康狀況', 1),
(22, '高保額家庭壽險 V', 'life', 30, 60, 25000, 60000, '高保額家庭保障', '保額較高的定期壽險，適合房貸負擔重、家庭責任大的支柱', 0, '自殺等待期、戰爭風險除外', 1),
(23, '終身壽險穩健型 W', 'life', 25, 55, 18000, 40000, '終身壽險 + 儲蓄', '兼具終身保障與儲蓄功能，適合長期規劃保障與資產配置', 0, '前期解約金較低、不適合短期持有', 1);

INSERT INTO recommendation_rules (
    rule_id, rule_name, product_type, condition_json, recommendation_logic, priority, is_active
) VALUES
(1, '年輕低預算先補基礎意外', 'accident', '{"age_max":35,"budget_max":12000}', '若年齡較輕且預算有限，優先推薦低門檻基礎意外商品', 10, 1),
(2, '家庭支柱優先考慮壽險', 'life', '{"has_children":true}', '若有子女或家庭責任，優先考慮壽險補足家庭收入中斷風險', 5, 1),
(3, '重視醫療支出可先看醫療險', 'medical', '{"main_goal":"medical"}', '若主要目標是補強住院與手術費用，先推薦醫療型商品', 8, 1),
(4, '收入支柱可補重大疾病', 'critical_illness', '{"main_goal":"income_protection"}', '若擔心重大疾病造成收入中斷，可納入重大疾病商品', 7, 1),
(5, '熟齡族群檢查年齡限制', 'medical', '{"age_min":46}', '熟齡族群應優先檢查商品投保年齡與醫療保障內容', 20, 1);

-- Insert users first to satisfy foreign key constraints in user_profiles
INSERT INTO users (user_id, username, hashed_password, is_active) VALUES
(1, 'testuser', '$2b$12$PiQEwZz3xRfN6.c7rBQsR.1uTWwR8IywvSWLxO9ksDfkfa6r9j0YW', 1),
(2, 'brian_test', '$2b$12$PiQEwZz3xRfN6.c7rBQsR.1uTWwR8IywvSWLxO9ksDfkfa6r9j0YW', 1),
(3, 'cindy_test', '$2b$12$PiQEwZz3xRfN6.c7rBQsR.1uTWwR8IywvSWLxO9ksDfkfa6r9j0YW', 1),
(4, 'david_test', '$2b$12$PiQEwZz3xRfN6.c7rBQsR.1uTWwR8IywvSWLxO9ksDfkfa6r9j0YW', 1),
(5, 'eva_test', '$2b$12$PiQEwZz3xRfN6.c7rBQsR.1uTWwR8IywvSWLxO9ksDfkfa6r9j0YW', 1);

INSERT INTO user_profiles (
    user_id, name, age, marital_status, has_children, occupation_risk_level,
    annual_income, insurance_budget, main_goal, risk_preference, existing_coverage
) VALUES
(1, 'Amy', 30, 'single', 0, 'low', 700000, 12000, 'medical', 'balanced', 'company_group_insurance'),
(2, 'Brian', 42, 'married', 1, 'medium', 1200000, 30000, 'family_protection', 'conservative', 'medical_basic'),
(3, 'Cindy', 50, 'married', 1, 'low', 1500000, 40000, 'medical', 'balanced', 'life_basic'),
(4, 'David', 27, 'single', 0, 'medium', 650000, 8000, 'accident', 'aggressive', 'none'),
(5, 'Eva', 38, 'married', 1, 'low', 1100000, 25000, 'income_protection', 'balanced', 'medical_basic');

INSERT INTO faq_knowledge (
    faq_id, question, answer, related_product_type, audience_tag
) VALUES
(1, '醫療險主要保障什麼？', '醫療險通常用於補強住院、手術 or 特定醫療費用支出。', 'medical', 'general'),
(2, '壽險適合哪些人？', '壽險通常較適合有家庭責任、房貸 or 收入支柱角色的人。', 'life', 'family'),
(3, '意外險和醫療險有什麼不同？', '意外險重點在意外事故造成的傷害，醫療險則多補強疾病 or 住院醫療費用。', 'accident', 'general'),
(4, '重大疾病險適合誰？', '擔心重大疾病造成收入中斷 or 一次性高額支出的人，通常會考慮重大疾病保障。', 'critical_illness', 'income_protection'),
(5, 'AI 推薦是否等於正式投保建議？', '不是，AI 僅能提供初步資訊整理與商品篩選，正式投保仍需以條款與核保結果為準。', NULL, 'compliance');

-- Reset sequences for SERIAL columns after manual ID insertion
SELECT setval(pg_get_serial_sequence('insurance_products', 'product_id'), (SELECT MAX(product_id) FROM insurance_products));
SELECT setval(pg_get_serial_sequence('recommendation_rules', 'rule_id'), (SELECT MAX(rule_id) FROM recommendation_rules));
SELECT setval(pg_get_serial_sequence('faq_knowledge', 'faq_id'), (SELECT MAX(faq_id) FROM faq_knowledge));
SELECT setval(pg_get_serial_sequence('users', 'user_id'), (SELECT MAX(user_id) FROM users));
