import React, { useState } from 'react';

export function parseStateValue(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // keep as string
    }
  }
  return raw;
}

export function StateTreeNode({
  nodeKey,
  value,
  depth = 0,
}: {
  nodeKey: string;
  value: unknown;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === 'object' && !isArray;
  const isCollection = isArray || isObject;

  if (isCollection) {
    const entries: [string, unknown][] = isArray
      ? (value as unknown[]).map((v, i) => [String(i), v])
      : Object.entries(value as Record<string, unknown>);
    const badge = isArray ? `[${entries.length}]` : `{${entries.length}}`;

    return (
      <div className='tree-node' data-depth={depth}>
        <button
          type='button'
          className='tree-node__toggle'
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          <span
            className={`tree-node__arrow ${expanded ? 'tree-node__arrow--open' : ''}`}
          />
          <span className='tree-node__key'>{nodeKey}</span>
          <span className='tree-node__badge'>{badge}</span>
        </button>
        {expanded && (
          <div className='tree-node__children'>
            {entries.map(([k, v]) => (
              <StateTreeNode key={k} nodeKey={k} value={v} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const displayValue =
    value === null ? 'null' : value === undefined ? 'undefined' : String(value);
  const valueType =
    value === null
      ? 'null'
      : typeof value === 'boolean'
        ? 'boolean'
        : typeof value === 'number'
          ? 'number'
          : 'string';

  return (
    <div className='tree-node' data-depth={depth}>
      <div className='tree-node__leaf'>
        <span className='tree-node__dot' />
        <span className='tree-node__key'>{nodeKey}</span>
        <span className={`tree-node__value tree-node__value--${valueType}`}>
          {displayValue}
        </span>
      </div>
    </div>
  );
}
