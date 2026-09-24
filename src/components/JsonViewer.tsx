import React, { useState } from 'react';

interface JsonViewerProps {
  data: any;
  name?: string;
  isLast?: boolean;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, name = "root", isLast = true }) => {
  const [collapsed, setCollapsed] = useState(false);
  const isArray = Array.isArray(data);
  const isObject = data !== null && typeof data === 'object';
  
  if (!isObject) {
    let type = typeof data;
    let valueStr = String(data);
    let displayClass = `json-${data === null ? 'null' : type}`;
    
    if (type === 'string') {
      valueStr = `"${data}"`;
      displayClass = 'json-string';
    } else if (type === 'boolean') {
      displayClass = 'json-boolean';
    } else if (type === 'number') {
      displayClass = 'json-number';
    }

    return (
      <div className="json-node leaf">
        <span className="json-caret-placeholder" />
        {name !== "root" && <span className="json-key">"{name}": </span>}
        <span className={displayClass}>{valueStr}</span>
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
      <div className="json-summary" onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}>
        {!isEmpty ? (
          <span className="json-caret">
            {collapsed ? (
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M6 4v8l5-4-5-4z"/></svg>
            ) : (
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M4 6h8l-4 5-4-5z"/></svg>
            )}
          </span>
        ) : (
          <span className="json-caret-placeholder" />
        )}
        {name !== "root" && <span className="json-key">"{name}": </span>}
        <span className="json-bracket">{bracketOpen}</span>
        {collapsed && !isEmpty && <span className="json-collapsed-text"> ... </span>}
        {collapsed && <span className="json-bracket">{bracketClose}</span>}
        {collapsed && <span className="json-punctuation">{isLast ? '' : ','}</span>}
      </div>

      {!collapsed && !isEmpty && (
        <div className="json-children">
          {keys.map((k, i) => (
            <JsonViewer 
              key={k} 
              data={data[k as keyof typeof data]} 
              name={isArray ? undefined : k} 
              isLast={i === keys.length - 1} 
            />
          ))}
        </div>
      )}
      
      {!collapsed && !isEmpty && (
        <div className="json-bracket-end">
          <span className="json-caret-placeholder" />
          <span className="json-bracket">{bracketClose}</span>
          <span className="json-punctuation">{isLast ? '' : ','}</span>
        </div>
      )}
    </div>
  );
}
