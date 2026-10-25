import React, { useState, useMemo, useEffect } from 'react';

interface JsonViewerProps {
  data: any;
  name?: string;
  isLast?: boolean;
  searchQuery?: string;
  activeMatchIndex?: number;
  hasNavigated?: boolean;
  matchCounter?: { current: number };
  onTotalMatchesChange?: (count: number) => void;
}

function highlightMatch(
  text: string,
  searchQuery: string | undefined,
  matchCounter: { current: number } | undefined,
  activeMatchIndex: number | undefined,
  hasNavigated: boolean | undefined
): React.ReactNode {
  if (!searchQuery || !searchQuery.trim() || !text) {
    return text;
  }

  const query = searchQuery.trim();
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    if (parts.length <= 1) {
      return text;
    }

    return parts.map((part, index) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        const matchIdx = matchCounter ? matchCounter.current++ : -1;
        const isCurrent = !!hasNavigated && matchIdx === activeMatchIndex;

        return (
          <mark
            key={index}
            id={isCurrent ? 'active-response-match' : undefined}
            style={{
              backgroundColor: isCurrent ? '#ff922b' : 'rgba(255, 224, 102, 0.4)',
              color: isCurrent ? '#ffffff' : 'inherit',
              borderRadius: '3px',
              padding: '1px 3px',
              fontWeight: isCurrent ? 'bold' : 'normal',
              boxShadow: isCurrent ? '0 0 0 2px #ff6b6b, 0 2px 8px rgba(255, 107, 107, 0.5)' : 'none',
              outline: isCurrent ? '1px solid #ffffff' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  } catch {
    return text;
  }
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ 
  data, 
  name = "root", 
  isLast = true,
  searchQuery,
  activeMatchIndex = 0,
  hasNavigated = false,
  matchCounter,
  onTotalMatchesChange
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const isRoot = name === "root";
  const isArray = Array.isArray(data);
  const isObject = data !== null && typeof data === 'object';

  // Objek counter yang konsisten per render pass
  const counter = useMemo(() => {
    return matchCounter || { current: 0 };
  }, [matchCounter, data, searchQuery, activeMatchIndex, hasNavigated]);

  if (isRoot && !matchCounter) {
    counter.current = 0;
  }

  // Laporkan total kecocokan setelah render selesai (hanya dari level root)
  useEffect(() => {
    if (isRoot && onTotalMatchesChange) {
      onTotalMatchesChange(counter.current);
    }
  });

  // Jika node ditutup tetapi subtree di dalamnya memuat query pencarian, buka otomatis agar terlihat
  const hasMatchInChildren = useMemo(() => {
    if (!collapsed || !searchQuery || !searchQuery.trim()) return false;
    try {
      return JSON.stringify(data).toLowerCase().includes(searchQuery.trim().toLowerCase());
    } catch {
      return false;
    }
  }, [collapsed, data, searchQuery]);

  const isEffectivelyCollapsed = (searchQuery && searchQuery.trim() && hasMatchInChildren) ? false : collapsed;
  
  if (!isObject) {
    const type = typeof data;
    const valueStr = String(data);
    let displayClass = `json-${data === null ? 'null' : type}`;
    
    if (type === 'string') {
      displayClass = 'json-string';
      return (
        <div className="json-node leaf">
          <span className="json-caret-placeholder" />
          {name !== undefined && name !== "root" && (
            <span className="json-key">
              "{highlightMatch(name, searchQuery, counter, activeMatchIndex, hasNavigated)}":{' '}
            </span>
          )}
          <span className={displayClass}>
            "{highlightMatch(String(data), searchQuery, counter, activeMatchIndex, hasNavigated)}"
          </span>
          <span className="json-punctuation">{isLast ? '' : ','}</span>
        </div>
      );
    } 
    
    if (type === 'boolean') {
      displayClass = 'json-boolean';
    } else if (type === 'number') {
      displayClass = 'json-number';
    }

    return (
      <div className="json-node leaf">
        <span className="json-caret-placeholder" />
        {name !== undefined && name !== "root" && (
          <span className="json-key">
            "{highlightMatch(name, searchQuery, counter, activeMatchIndex, hasNavigated)}":{' '}
          </span>
        )}
        <span className={displayClass}>
          {highlightMatch(valueStr, searchQuery, counter, activeMatchIndex, hasNavigated)}
        </span>
        <span className="json-punctuation">{isLast ? '' : ','}</span>
      </div>
    );
  }

  const keys = Object.keys(data);
  const isEmpty = keys.length === 0;
  const bracketOpen = isArray ? '[' : '{';
  const bracketClose = isArray ? ']' : '}';

  return (
    <div className="json-node">
      <div 
        className="json-summary" 
        onClick={(e) => { 
          e.stopPropagation(); 
          setCollapsed(!isEffectivelyCollapsed); 
        }}
      >
        {!isEmpty ? (
          <span className="json-caret">
            {isEffectivelyCollapsed ? (
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M6 4v8l5-4-5-4z"/></svg>
            ) : (
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M4 6h8l-4 5-4-5z"/></svg>
            )}
          </span>
        ) : (
          <span className="json-caret-placeholder" />
        )}
        {name !== undefined && name !== "root" && (
          <span className="json-key">
            "{highlightMatch(name, searchQuery, counter, activeMatchIndex, hasNavigated)}":{' '}
          </span>
        )}
        <span className="json-bracket">{bracketOpen}</span>
        {isEffectivelyCollapsed && !isEmpty && <span className="json-collapsed-text"> ... </span>}
        {isEffectivelyCollapsed && <span className="json-bracket">{bracketClose}</span>}
        {isEffectivelyCollapsed && <span className="json-punctuation">{isLast ? '' : ','}</span>}
      </div>

      {!isEffectivelyCollapsed && !isEmpty && (
        <div className="json-children">
          {keys.map((k, i) => (
            <JsonViewer 
              key={k} 
              data={data[k as keyof typeof data]} 
              name={isArray ? undefined : k} 
              isLast={i === keys.length - 1} 
              searchQuery={searchQuery}
              activeMatchIndex={activeMatchIndex}
              hasNavigated={hasNavigated}
              matchCounter={counter}
            />
          ))}
        </div>
      )}
      
      {!isEffectivelyCollapsed && !isEmpty && (
        <div className="json-bracket-end">
          <span className="json-caret-placeholder" />
          <span className="json-bracket">{bracketClose}</span>
          <span className="json-punctuation">{isLast ? '' : ','}</span>
        </div>
      )}
    </div>
  );
};
