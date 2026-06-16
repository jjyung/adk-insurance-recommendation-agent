'use client';

import { Product } from './types';

const TYPE_LABEL: Record<string, string> = {
  medical: '醫療保障',
  accident: '意外保障',
  family_protection: '家庭責任',
  income_protection: '收入保障',
  critical_illness: '重大疾病',
  life: '壽險保障',
};

const BUDGET_FIT_LABEL: Record<string, string> = {
  fully_within_budget: '完全在預算內',
  entry_affordable: '基本可負擔',
  over_budget: '高於預算',
};

const BUDGET_FIT_TONE: Record<string, 'ok' | 'soft' | 'warn'> = {
  fully_within_budget: 'ok',
  entry_affordable: 'soft',
  over_budget: 'warn',
};

function formatPremium(min?: number, max?: number) {
  if (min == null && max == null) return '—';
  const fmt = (n: number) => `NT$ ${n.toLocaleString('zh-TW')}`;
  if (min != null && max != null) {
    if (min === max) return fmt(min);
    return `${fmt(min)} – ${fmt(max)}`;
  }
  return fmt((min ?? max) as number);
}

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  index: number;
}

export function ProductCard({ product, onSelect, index }: ProductCardProps) {
  const typeLabel = TYPE_LABEL[product.product_type] ?? '保險商品';
  const fitTone = product.budget_fit
    ? BUDGET_FIT_TONE[product.budget_fit] ?? 'soft'
    : null;
  const fitLabel = product.budget_fit
    ? BUDGET_FIT_LABEL[product.budget_fit] ?? null
    : null;

  return (
    <article
      className="um-card"
      style={{ animationDelay: `${80 + Math.min(index, 11) * 40}ms` }}
    >
      <header className="um-card__head">
        <span className="um-card__type-pill">{typeLabel}</span>
        {fitTone && fitLabel && (
          <span className={`um-card__fit um-card__fit--${fitTone}`}>
            <span className="um-card__fit-dot" aria-hidden />
            {fitLabel}
          </span>
        )}
      </header>

      <h3 className="um-card__title">{product.product_name}</h3>

      {product.coverage_focus && (
        <p className="um-card__focus">{product.coverage_focus}</p>
      )}

      {(product.annual_premium_min != null ||
        product.annual_premium_max != null ||
        product.budget_fit_text) && (
        <div className="um-card__price">
          <span className="um-card__price-label">年保費</span>
          <span className="um-card__price-value">
            {product.annual_premium_min != null ||
            product.annual_premium_max != null
              ? formatPremium(
                  product.annual_premium_min,
                  product.annual_premium_max,
                )
              : product.budget_fit_text}
          </span>
        </div>
      )}

      <button
        type="button"
        className="um-card__cta"
        onClick={() => onSelect(product)}
        aria-label={`查看 ${product.product_name} 的詳細資訊`}
      >
        詳細資訊
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </button>
    </article>
  );
}
