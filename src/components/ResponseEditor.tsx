import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Copy, Check, Search, ChevronUp, ChevronDown, X, ArrowUp } from 'lucide-react';
import type { ResponseDetails } from '../types';
import { t, getHttpStatusText } from '../utils';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [hasNavigated, setHasNavigated] = useState(false);
  const jsonViewerRef = useRef<HTMLDivElement>(null);

  const handleScrollToTop = () => {
    if (jsonViewerRef.current) {
      jsonViewerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Filter agar tidak menerima karakter json {}[]:
  const sanitizeSearch = (val: string) => {
    return val.replace(/[{}\[\]:]/g, '');
  };

  const handleSearchChange = (val: string) => {
    const cleaned = sanitizeSearch(val);
    setSearchQuery(cleaned);
    setCurrentMatchIndex(0);
    setHasNavigated(false);
  };

  const rawText = useMemo(() => {
    if (!response || !response.body) return '';
    if (typeof response.body === 'object') return JSON.stringify(response.body, null, 2);
    if (typeof response.body === 'string' && (response.body.trim().startsWith('{') || response.body.trim().startsWith('['))) {
      try {
        return JSON.stringify(JSON.parse(response.body), null, 2);
      } catch (e) {
        return response.body;
      }
    }
    return String(response.body);
  }, [response]);

  const escapedQuery = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return '';
    return trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }, [searchQuery]);

  const matchesCount = useMemo(() => {
    if (!escapedQuery || !rawText) return 0;
    try {
      const regex = new RegExp(escapedQuery, 'gi');
      const matches = rawText.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }, [escapedQuery, rawText]);

  const triggerScrollToActive = () => {
    setTimeout(() => {
      const activeEl = document.getElementById('active-response-match');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 40);
  };

  useEffect(() => {
    if (hasNavigated && matchesCount > 0) {
      triggerScrollToActive();
    }
  }, [currentMatchIndex, hasNavigated, matchesCount]);

  const handleNextMatch = () => {
    if (matchesCount > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % matchesCount);
      triggerScrollToActive();
    }
  };

  const handlePrevMatch = () => {
    if (matchesCount > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + matchesCount) % matchesCount);
      triggerScrollToActive();
    }
  };

  const handleEnterPress = (shift: boolean) => {
    if (matchesCount === 0) return;
    if (!hasNavigated) {
      setHasNavigated(true);
      triggerScrollToActive();
    } else {
      if (shift) {
        handlePrevMatch();
      } else {
        handleNextMatch();
      }
    }
  };

  const highlightedContent = useMemo(() => {
    if (!searchQuery.trim() || !escapedQuery || !rawText) {
      return rawText;
    }

    try {
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      const parts = rawText.split(regex);
      let matchCount = -1;

      return parts.map((part, i) => {
        if (part.toLowerCase() === searchQuery.trim().toLowerCase()) {
          matchCount++;
          const isCurrent = hasNavigated && matchCount === currentMatchIndex;
          return (
            <mark
              key={i}
              id={isCurrent ? 'active-response-match' : undefined}
              style={{
                backgroundColor: isCurrent ? '#ff922b' : 'rgba(255, 224, 102, 0.4)',
                color: isCurrent ? '#ffffff' : 'inherit',
                borderRadius: '3px',
                padding: '2px 4px',
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
      return rawText;
    }
  }, [rawText, searchQuery, escapedQuery, currentMatchIndex, hasNavigated]);

  const handleCopy = () => {
    if (!response) return;
    const content = rawText;
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
          {t(language, 'status')}: <span>{response.status} {response.statusText || getHttpStatusText(response.status)}</span>
        </div>
        <div className="meta-item">
          {t(language, 'time')}: <span>{response.time} ms</span>
        </div>
        <div className="meta-item">
          {t(language, 'size')}: <span>{response.size ? (response.size / 1024).toFixed(2) : 0} KB</span>
        </div>
      </div>
      
      <div className="section-tabs" style={{ display: 'flex', alignItems: 'center', paddingRight: '1rem', borderBottom: '1px solid var(--border-color)', minHeight: '38px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className={`section-tab ${activeTab === 'headers' ? 'active' : ''}`} onClick={() => setActiveTab('headers')}>{t(language, 'headersTab')}</div>
          <div className={`section-tab ${activeTab === 'body' ? 'active' : ''}`} onClick={() => setActiveTab('body')}>{t(language, 'bodyTab')}</div>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: 'inherit', color: 'var(--text-secondary)', marginLeft: '1rem' }}>
            <input 
              type="checkbox" 
              checked={isRaw}
              onChange={(e) => setIsRaw(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            {t(language, 'rawTab')}
          </label>
        </div>
      </div>
      
      <div className="section-content" style={{ padding: 0 }}>
        {activeTab === 'body' && (
          <div className="json-viewer" ref={jsonViewerRef} style={{ position: 'relative', maxHeight: '520px', overflow: 'auto' }}>
            {/* Floating Sticky Search Bar in Center of Response Block */}
            <div style={{
              position: 'sticky',
              top: '10px',
              zIndex: 30,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              pointerEvents: 'none',
              marginBottom: '-38px'
            }}>
              {/* Tombol Kiri: Melingkar Gulir ke Atas */}
              <button
                onClick={handleScrollToTop}
                style={{
                  pointerEvents: 'auto',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s, color 0.15s'
                }}
                title="Gulir ke paling atas"
              >
                <ArrowUp size={15} />
              </button>

              <div style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--bg-panel)',
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                maxWidth: '90%'
              }}>
                <Search size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                <input 
                  type="text"
                  placeholder="Cari objek / value..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (['{', '}', '[', ']', ':'].includes(e.key)) {
                      e.preventDefault();
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleEnterPress(e.shiftKey);
                    } else if (e.key === 'Escape') {
                      setSearchQuery('');
                      setHasNavigated(false);
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    width: '180px',
                    fontFamily: 'inherit'
                  }}
                />
                {searchQuery && (
                  <>
                    <span style={{ fontSize: '0.75rem', color: matchesCount > 0 ? 'var(--text-secondary)' : 'var(--error-color)', padding: '0 4px', whiteSpace: 'nowrap' }}>
                      {matchesCount > 0 ? (hasNavigated ? `${currentMatchIndex + 1}/${matchesCount}` : `${matchesCount} hasil`) : '0/0'}
                    </span>
                    <button 
                      onClick={() => {
                        handlePrevMatch();
                        setHasNavigated(true);
                      }}
                      disabled={matchesCount === 0}
                      style={{ background: 'none', border: 'none', padding: '2px', cursor: matchesCount > 0 ? 'pointer' : 'default', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                      title="Sebelumnya (Shift+Enter)"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        handleNextMatch();
                        setHasNavigated(true);
                      }}
                      disabled={matchesCount === 0}
                      style={{ background: 'none', border: 'none', padding: '2px', cursor: matchesCount > 0 ? 'pointer' : 'default', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                      title="Berikutnya (Enter)"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setHasNavigated(false);
                      }}
                      style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                      title="Hapus pencarian"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>

              {/* Tombol Kanan: Melingkar Cari Manual */}
              <button
                onClick={() => handleEnterPress(false)}
                style={{
                  pointerEvents: 'auto',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s, color 0.15s'
                }}
                title="Cari manual (Enter)"
              >
                <Search size={15} />
              </button>
            </div>

            {/* Copy Button */}
            <div 
              onClick={handleCopy}
              style={{
                position: 'sticky',
                top: '10px',
                float: 'right',
                zIndex: 25,
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
                padding: '2.8rem 1rem 1rem 1rem', 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-all', 
                fontFamily: 'inherit', 
                fontSize: 'inherit',
                color: isError ? 'var(--error-color)' : 'var(--success-color)',
                userSelect: 'text',
                WebkitUserSelect: 'text'
              }}>
                {highlightedContent}
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
          <div style={{ padding: '1rem', overflow: 'auto', backgroundColor: !isRaw ? 'var(--bg-input)' : 'transparent', height: '100%' }}>
            {!isRaw ? (
              <div style={{ fontFamily: 'inherit', fontSize: 'inherit', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-all', userSelect: 'text', WebkitUserSelect: 'text' }}>
                {Object.entries(response.headers).map(([k, v]) => (
                  <div key={k}>
                    <span style={{ color: 'var(--json-key)' }}>{k}</span>: <span style={{ color: 'var(--json-val-string)' }}>{v}</span>
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
