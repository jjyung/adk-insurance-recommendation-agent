'use client';

import React from 'react';

export interface InsuranceRecommendationData {
  type: 'insurance_recommendation';
  productName: string;
  reason: string;
  budgetFit: string;
  reminders: string;
  terms: string;
  rules: string;
}

interface InsuranceCardProps {
  data: InsuranceRecommendationData;
}

export const InsuranceCard: React.FC<InsuranceCardProps> = ({ data }) => {
  return (
    <div className="insurance-card">
      <div className="insurance-card__header">
        <div className="insurance-card__icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="24"
            height="24"
          >
            <path d="M12 2L3 6.5v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12v-5L12 2z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div className="insurance-card__title-area">
          <h4 className="insurance-card__product-name">{data.productName}</h4>
          <span className="insurance-card__badge">智能推薦</span>
        </div>
      </div>

      <div className="insurance-card__body">
        <div className="insurance-card__section">
          <span className="insurance-card__label">推薦原因</span>
          <div className="insurance-card__value">{data.reason}</div>
        </div>

        <div className="insurance-card__section">
          <span className="insurance-card__label">預算評估</span>
          <div className="insurance-card__value">{data.budgetFit}</div>
        </div>

        {(data.reminders || data.terms) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {data.reminders && (
              <div className="insurance-card__section">
                <span className="insurance-card__label">注意事項</span>
                <div className="insurance-card__value" style={{ fontSize: '13px' }}>{data.reminders}</div>
              </div>
            )}
            {data.terms && (
              <div className="insurance-card__section">
                <span className="insurance-card__label">條款摘要</span>
                <div className="insurance-card__value" style={{ fontSize: '13px' }}>{data.terms}</div>
              </div>
            )}
          </div>
        )}

        {data.rules && (
          <div className="insurance-card__section">
            <span className="insurance-card__label">推薦依據</span>
            <div className="insurance-card__value" style={{ fontSize: '13px', opacity: 0.8 }}>{data.rules}</div>
          </div>
        )}
      </div>

      <div className="insurance-card__footer">
        本建議僅供初步參考，實際投保請以保險公司合約為準。
      </div>
    </div>
  );
};
