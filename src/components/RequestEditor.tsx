import React, { useState } from 'react';
import type { RequestConfig } from '../types';
import { KeyValueEditor } from './KeyValueEditor';
import { Eye, EyeOff, ClipboardPaste, Wand2, Filter } from 'lucide-react';
import { useEffect } from 'react';
import { t } from '../utils';
import EditorModule from 'react-simple-code-editor';
const Editor = (EditorModule as any).default || EditorModule;
import Prism from 'prismjs';
import 'prismjs/components/prism-json';

interface Props {
  request: RequestConfig;
  onChange: (req: RequestConfig) => void;
  language: string;
  theme: string;
  isBlurred: boolean;
  setIsBlurred: (v: boolean) => void;
}

export const RequestEditor: React.FC<Props> = ({ request, onChange, language, isBlurred, setIsBlurred }) => {
  const [activeTab, setActiveTab] = useState<'params'|'headers'|'body'|'auth'>('headers');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [showParams, setShowParams] = useState(true);
  const [showAuth, setShowAuth] = useState(true);

  // If a hidden tab was active, switch to headers
  useEffect(() => {
    if (!showParams && activeTab === 'params') setActiveTab('headers');
    if (!showAuth && activeTab === 'auth') setActiveTab('headers');
  }, [showParams, showAuth, activeTab]);

  useEffect(() => {
    // Monaco editor handles its own height based on the container
  }, [request.body, activeTab]);

  useEffect(() => {
    const bodyStr = request.body || '';
    if (!bodyStr.trim()) {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(request.body);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message);
    }
  }, [request.body]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange({ ...request, body: text });
    } catch (err) {
      console.error('Failed to read clipboard');
    }
  };

  const handlePretty = () => {
    try {
      const parsed = JSON.parse(request.body || '');
      onChange({ ...request, body: JSON.stringify(parsed, null, 2) });
    } catch (e) {
      // Ignored, handled by validation
    }
  };

  return (
    <div className="request-section">
      <div className="section-tabs">
        <div className={`section-tab ${activeTab === 'headers' ? 'active' : ''}`} onClick={() => setActiveTab('headers')}>{t(language, 'headersTab')}</div>
        <div className={`section-tab ${activeTab === 'body' ? 'active' : ''}`} onClick={() => setActiveTab('body')}>{t(language, 'bodyTab')}</div>
        {showAuth && <div className={`section-tab ${activeTab === 'auth' ? 'active' : ''}`} onClick={() => setActiveTab('auth')}>{t(language, 'authTab')}</div>}
        {showParams && <div className={`section-tab ${activeTab === 'params' ? 'active' : ''}`} onClick={() => setActiveTab('params')}>{t(language, 'paramsTab')}</div>}
        
        {/* Blur icon – placed right after the last visible tab */}
        <div 
          onClick={() => setIsBlurred(!isBlurred)}
          title={isBlurred ? "Unblur contents" : "Blur contents"}
          style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.75rem', cursor: 'pointer', color: isBlurred ? 'var(--accent-color)' : 'var(--text-secondary)' }}
        >
          {isBlurred ? <EyeOff size={16} /> : <Eye size={16} />}
        </div>
        
        <div style={{ marginLeft: 'auto' }}>
          <div style={{ position: 'relative' }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', cursor: 'pointer', color: showFilter ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              onClick={() => setShowFilter(!showFilter)}
              title="Filter tabs"
            >
              <Filter size={18} />
            </div>
            
            {showFilter && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} onClick={() => setShowFilter(false)} />
                <div className="settings-dropdown" style={{ padding: '0.5rem', minWidth: '200px' }}>
                  <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    Visible Tabs
                  </div>
                  <label className="settings-item" style={{ cursor: 'not-allowed', opacity: 0.7 }}>
                    <input type="checkbox" checked disabled />
                    <span>{t(language, 'headersTab')}</span>
                  </label>
                  <label className="settings-item" style={{ cursor: 'not-allowed', opacity: 0.7 }}>
                    <input type="checkbox" checked disabled />
                    <span>{t(language, 'bodyTab')}</span>
                  </label>
                  <label className="settings-item">
                    <input type="checkbox" checked={showAuth} onChange={(e) => setShowAuth(e.target.checked)} />
                    <span>{t(language, 'authTab')}</span>
                  </label>
                  <label className="settings-item">
                    <input type="checkbox" checked={showParams} onChange={(e) => setShowParams(e.target.checked)} />
                    <span>{t(language, 'paramsTab')}</span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className={`section-content ${isBlurred ? 'blur-effect' : ''}`}>
        {activeTab === 'params' && (
          <KeyValueEditor 
            items={request.queryParams} 
            onChange={(items) => onChange({ ...request, queryParams: items })} 
          />
        )}
        
        {activeTab === 'headers' && (
          <KeyValueEditor 
            items={request.headers} 
            onChange={(items) => onChange({ ...request, headers: items })} 
            type="headers"
          />
        )}
        
        {activeTab === 'body' && (
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={handlePaste} style={{ padding: '4px 8px', fontSize: '0.8rem' }} title="Paste from clipboard">
                <ClipboardPaste size={14} style={{ marginRight: '4px' }} /> {t(language, 'paste')}
              </button>
              <button className="btn-secondary" onClick={handlePretty} style={{ padding: '4px 8px', fontSize: '0.8rem' }} title="Format JSON" disabled={!!jsonError && !!(request.body || '').trim()}>
                <Wand2 size={14} style={{ marginRight: '4px' }} /> {t(language, 'pretty')}
              </button>
            </div>
            <div className={`editor-wrapper ${jsonError ? 'invalid' : ''}`} style={{ border: jsonError ? '1px solid var(--error-color)' : '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'var(--bg-input)' }}>
              <Editor
                value={request.body || ''}
                onValueChange={(code: string) => onChange({ ...request, body: code })}
                highlight={(code: string) => {
                  try {
                    return Prism.highlight(code, Prism.languages.json, 'json');
                  } catch(e) {
                    return code;
                  }
                }}
                padding={15}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 14,
                  minHeight: '200px'
                }}
              />
            </div>
            {jsonError && (
              <div style={{ color: 'var(--error-color)', fontSize: '0.8rem', marginTop: '4px' }}>
                {t(language, 'invalidJson')}: {jsonError}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'auth' && (
          <div className="auth-form">
            <div className="auth-input-group">
              <label>{t(language, 'type')}</label>
              <select 
                value={request.authType}
                onChange={(e) => onChange({ ...request, authType: e.target.value as any, authConfig: {} })}
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="apikey">API Key</option>
              </select>
            </div>
            
            {request.authType === 'bearer' && (
              <div className="auth-input-group">
                <label>{t(language, 'token')}</label>
                <input 
                  type="text" 
                  value={request.authConfig.token || ''}
                  onChange={(e) => onChange({ ...request, authConfig: { ...request.authConfig, token: e.target.value } })}
                />
              </div>
            )}
            
            {request.authType === 'basic' && (
              <>
                <div className="auth-input-group">
                  <label>{t(language, 'username')}</label>
                  <input 
                    type="text" 
                    value={request.authConfig.username || ''}
                    onChange={(e) => onChange({ ...request, authConfig: { ...request.authConfig, username: e.target.value } })}
                  />
                </div>
                <div className="auth-input-group">
                  <label>{t(language, 'password')}</label>
                  <input 
                    type="password" 
                    value={request.authConfig.password || ''}
                    onChange={(e) => onChange({ ...request, authConfig: { ...request.authConfig, password: e.target.value } })}
                  />
                </div>
              </>
            )}
            
            {request.authType === 'apikey' && (
              <>
                <div className="auth-input-group">
                  <label>{t(language, 'key')}</label>
                  <input 
                    type="text" 
                    value={request.authConfig.key || ''}
                    onChange={(e) => onChange({ ...request, authConfig: { ...request.authConfig, key: e.target.value } })}
                  />
                </div>
                <div className="auth-input-group">
                  <label>{t(language, 'value')}</label>
                  <input 
                    type="text" 
                    value={request.authConfig.value || ''}
                    onChange={(e) => onChange({ ...request, authConfig: { ...request.authConfig, value: e.target.value } })}
                  />
                </div>
                <div className="auth-input-group">
                  <label>{t(language, 'addTo')}</label>
                  <select 
                    value={request.authConfig.in || 'header'}
                    onChange={(e) => onChange({ ...request, authConfig: { ...request.authConfig, in: e.target.value } })}
                  >
                    <option value="header">Header</option>
                    <option value="query">Query Params</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
