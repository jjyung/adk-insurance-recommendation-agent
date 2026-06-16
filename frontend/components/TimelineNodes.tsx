import React from 'react';
import { TimelineEvent } from '../lib/mock-data';

export type TimelineDisplayNode =
  | { kind: 'single'; event: TimelineEvent; isLast: boolean }
  | { kind: 'stream-group'; events: TimelineEvent[]; isLast: boolean }
  | { kind: 'state-group'; events: TimelineEvent[]; isLast: boolean }
  | { kind: 'transcription-group'; events: TimelineEvent[]; isLast: boolean; title: string };

export function groupStreamEvents(events: TimelineEvent[]): TimelineDisplayNode[] {
  const filteredEvents = events.filter((e) => e.kind !== 'state');

  const nodes: TimelineDisplayNode[] = [];
  let i = 0;
  while (i < filteredEvents.length) {
    if (filteredEvents[i].kind === 'stream') {
      const group: TimelineEvent[] = [];
      while (i < filteredEvents.length && filteredEvents[i].kind === 'stream') {
        group.push(filteredEvents[i]);
        i++;
      }
      nodes.push({ kind: 'stream-group', events: group, isLast: false });
    } else if (
      (filteredEvents[i].title === 'input_transcription' || filteredEvents[i].title === 'output_transcription')
    ) {
      const groupTitle = filteredEvents[i].title;

      // Only merge with the last node if it's the same transcription type
      const lastNode = nodes[nodes.length - 1];

      if (
        lastNode &&
        lastNode.kind === 'transcription-group' &&
        lastNode.title === groupTitle
      ) {
        lastNode.events.push(filteredEvents[i]);
      } else {
        // Create a new group
        nodes.push({
          kind: 'transcription-group',
          events: [filteredEvents[i]],
          isLast: false,
          title: groupTitle,
        });
      }
      i++;
    } else {
      nodes.push({ kind: 'single', event: filteredEvents[i], isLast: false });
      i++;
    }
  }

  if (nodes.length > 0) {
    nodes[nodes.length - 1] = { ...nodes[nodes.length - 1], isLast: true };
  }
  return nodes;
}

export function StateGroupNode({
  events,
  isLast,
}: {
  events: TimelineEvent[];
  isLast: boolean;
}) {
  const first = events[0];
  const last = events[events.length - 1];
  return (
    <details className='timeline__node'>
      <summary className='timeline__header'>
        <span className='timeline__dot' data-kind='state' />
        {!isLast && <span className='timeline__line' />}
        <span className='event__kind event__kind--state'>state</span>
        <span className='timeline__title'>stateDelta</span>
        <span className='timeline__group-badge'>×{events.length}</span>
        <span className='event__timestamp'>{last.timestamp?.slice(0, 5)}</span>
      </summary>
      <div className='timeline__detail'>
        <p className='timeline__summary'>
          狀態更新 {events.length} 次，首次於 {first.timestamp?.slice(0, 5)}
        </p>
        <div className='timeline__group-chunks'>
          {events.map((evt, chunkIdx) => (
            <div key={evt.id} className='timeline__chunk' style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '0.85em', color: 'var(--text-soft, #666)', marginBottom: '4px' }}>
                更新 {chunkIdx + 1} <span style={{ opacity: 0.6 }}>({evt.timestamp?.slice(0, 5)})</span>
              </div>
              {evt.payload.length > 0 && (
                <ul className='timeline__payload'>
                  {evt.payload.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

export function StreamGroupNode({
  events,
  isLast,
}: {
  events: TimelineEvent[];
  isLast: boolean;
}) {
  const first = events[0];
  const last = events[events.length - 1];
  return (
    <details className='timeline__node'>
      <summary className='timeline__header'>
        <span className='timeline__dot' data-kind='stream' />
        {!isLast && <span className='timeline__line' />}
        <span className='event__kind event__kind--stream'>stream</span>
        <span className='timeline__title'>partial_response</span>
        <span className='timeline__group-badge'>×{events.length}</span>
        <span className='event__timestamp'>{last.timestamp?.slice(0, 5)}</span>
      </summary>
      <div className='timeline__detail'>
        <p className='timeline__summary'>
          串流 {events.length} 個片段，首段於 {first.timestamp?.slice(0, 5)}
        </p>
        <ol className='timeline__group-chunks'>
          {events.map((evt, chunkIdx) => (
            <li key={evt.id} className='timeline__chunk'>
              <span className='timeline__chunk-idx'>{chunkIdx + 1}</span>
              <span className='timeline__chunk-text'>
                {evt.payload[0] ?? evt.summary}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}

export function TranscriptionGroupNode({
  events,
  isLast,
  title,
}: {
  events: TimelineEvent[];
  isLast: boolean;
  title: string;
}) {
  const first = events[0];
  const last = events[events.length - 1];
  const kind = first.kind;

  // Combine all the summaries into a single paragraph.
  // If the summaries are cumulative (common in streaming transcription),
  // we take the longest one or the last one. Here we use a simple heuristic to avoid duplicates.
  let combinedText = '';
  if (events.length > 0) {
    // Check if the last summary contains the previous one (cumulative)
    const lastSummary = events[events.length - 1].summary;
    const firstSummary = events[0].summary;
    if (lastSummary.includes(firstSummary) && lastSummary.length > firstSummary.length) {
      combinedText = lastSummary;
    } else {
      combinedText = events.map(e => e.summary).join('');
    }
  }

  return (
    <details className='timeline__node' open>
      <summary className='timeline__header'>
        <span className='timeline__dot' data-kind={kind} />
        {!isLast && <span className='timeline__line' />}
        <span className={`event__kind event__kind--${kind}`}>{kind}</span>
        <span className='timeline__title'>{title}</span>
        <span className='event__timestamp'>{last.timestamp?.slice(0, 5)}</span>
      </summary>
      <div className='timeline__detail'>
        <p className='timeline__summary'>{combinedText}</p>
        {events[0].payload && events[0].payload.length > 0 && (
          <ul className='timeline__payload'>
            {events[0].payload.map((line: string) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
