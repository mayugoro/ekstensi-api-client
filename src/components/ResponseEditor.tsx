import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { ResponseDetails } from '../types';
import { t } from '../utils';
import { JsonViewer } from './JsonViewer';

interface Props {
  response?: ResponseDetails;
  loading: boolean;
  language: string;
  theme: string;
}

export const ResponseEditor: React.FC<Props> = ({ response, loading, language }) => {
  const [activeTab, setActiveTab] = useState<'body'|'headers'>('body');
  const [isCopied, setIsCopied] = useState(false);
  const [isRaw, setIsRaw] = useState(true);

  const handleCopy = () => {
    if (!response) return;
    let content = response.body || '';
    if (typeof response.body === 'object') {
      content = JSON.stringify(response.body, null, 2);
    } else if (typeof response.body === 'string' && (response.body.trim().startsWith('{') || response.body.trim().startsWith('['))) {
      try {
        content = JSON.stringify(JSON.parse(response.body), null, 2);
      } catch (e) {}
    }
    
    navigator.clipboard.writeText(content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => {
      console.error('Failed to copy text');
    });
  };

  if (loading) {
    return (
      <div className="response-section" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>{t(language, 'sending')}</div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="response-section" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Enter the URL and click Send to get a response</div>
      </div>
    );
  }

  const isError = !response.success || (response.status && response.status >= 400);

  return (
    <div className="response-section">
      <div className="response-meta">
        <div className={`meta-item ${isError ? 'error' : 'success'}`}>
          {t(language, 'status')}: <span>{response.status} {response.statusText}</span>
        </div>
        <div className="meta-item">
          {t(language, 'time')}: <span>{response.time} ms</span>
        </div>
        <div className="meta-item">
          {t(language, 'size')}: <span>{response.size ? (response.size / 1024).toFixed(2) : 0} KB</span>
        </div>
      </div>
      
      <div className="section-tabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '1rem' }}>
        <div style={{ display: 'flex' }}>
          <div className={`section-tab ${activeTab === 'headers' ? 'active' : ''}`} onClick={() => setActiveTab('headers')}>{t(language, 'headersTab')}</div>
          <div className={`section-tab ${activeTab === 'body' ? 'active' : ''}`} onClick={() => setActiveTab('body')}>{t(language, 'bodyTab')}</div>
        </div>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <input 
            type="checkbox" 
            checked={isRaw}
            onChange={(e) => setIsRaw(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          {t(language, 'rawTab')}
        </label>
      </div>
      
      <div className="section-content" style={{ padding: 0 }}>
        {activeTab === 'body' && (
          <div className="json-viewer" style={{ position: 'relative' }}>
            <div 
              onClick={handleCopy}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                color: isCopied ? 'var(--success-color)' : 'var(--text-secondary)'
              }}
              title="Copy to clipboard"
            >
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
            </div>
            
            {(isRaw || (typeof response.body === 'string' && !response.body.trim().startsWith('{') && !response.body.trim().startsWith('['))) ? (
              <div style={{ 
                padding: '1rem', 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-all', 
                fontFamily: 'inherit', 
                fontSize: 'inherit',
                color: isError ? 'var(--error-color)' : 'var(--success-color)',
                userSelect: 'text',
                WebkitUserSelect: 'text'
              }}>
                {(() => {
                  if (typeof response.body === 'object') return JSON.stringify(response.body, null, 2);
                  if (typeof response.body === 'string' && (response.body.trim().startsWith('{') || response.body.trim().startsWith('['))) {
                    try {
                      return JSON.stringify(JSON.parse(response.body), null, 2);
                    } catch (e) {
                      return response.body;
                    }
                  }
                  return String(response.body);
                })()}
              </div>
            ) : (
              <div className="json-viewer" style={{ padding: '1rem' }}>
                <JsonViewer data={typeof response.body === 'string' ? JSON.parse(response.body) : response.body} />
              </div>
            )}
            
            {response.error && (
              <span style={{ color: 'var(--error-color)', display: 'block', marginTop: '1rem' }}>{response.error}</span>
            )}
          </div>
        )}
        
        {activeTab === 'headers' && response.headers && (
          <div style={{ padding: '1rem', overflow: 'auto', backgroundColor: isRaw ? 'var(--bg-input)' : 'transparent', height: '100%' }}>
            {isRaw ? (
              <div style={{ fontFamily: 'inherit', fontSize: 'inherit', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-all', userSelect: 'text', WebkitUserSelect: 'text' }}>
                {Object.entries(response.headers).map(([k, v]) => (
                  <div key={k}>
                    <span style={{ color: '#9cdcfe' }}>{k}</span>: <span style={{ color: '#ce9178' }}>{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <table className="kv-table" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(response.headers).map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ padding: '0.5rem', whiteSpace: 'nowrap', width: '1%' }}>{k}</td>
                      <td style={{ padding: '0.5rem', wordBreak: 'break-all' }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
