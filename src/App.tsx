import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { RequestConfig, TabData, HistoryItem, HttpMethod, AppTheme, SavedRequest } from './types';
import { createEmptyRequest, parseUrlAndParams, t } from './utils';
import { RequestEditor } from './components/RequestEditor';
import { ResponseEditor } from './components/ResponseEditor';
import { Clock, Plus, X, Trash2, Settings, Save, Folder } from 'lucide-react';

function App() {
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'history'|'collections'>('history');
  const [theme, setTheme] = useState<AppTheme>('dark');
  const [fontFamily, setFontFamily] = useState('monospace');
  const [fontSize, setFontSize] = useState('50%');
  const [language, setLanguage] = useState('en');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveFolderName, setSaveFolderName] = useState('');
  const [saveRequestName, setSaveRequestName] = useState('');
  const [saveError, setSaveError] = useState('');
  
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<SavedRequest | null>(null);

  // Settings temporary state
  const [tempTheme, setTempTheme] = useState<AppTheme>('dark');
  const [tempFontFamily, setTempFontFamily] = useState('monospace');
  const [tempFontSize, setTempFontSize] = useState('50%');
  const [tempLanguage, setTempLanguage] = useState('en');

  const openSettings = () => {
    setTempTheme(theme);
    setTempFontFamily(fontFamily);
    setTempFontSize(fontSize);
    setTempLanguage(language);
    setIsSettingsOpen(true);
  };

  const saveSettings = () => {
    setTheme(tempTheme);
    setFontFamily(tempFontFamily);
    setFontSize(tempFontSize);
    setLanguage(tempLanguage);
    setIsSettingsOpen(false);
  };

  useEffect(() => {
    // Load from storage
    chrome.storage?.local.get(['tabs', 'activeTabId', 'history', 'theme', 'savedRequests', 'fontFamily', 'fontSize', 'language'], (result: any) => {
      if (result.tabs && result.tabs.length > 0) {
        setTabs(result.tabs);
        setActiveTabId(result.activeTabId || result.tabs[0].id);
      } else {
        addNewTab();
      }
      if (result.history) {
        setHistory(result.history);
      }
      if (result.savedRequests) {
        setSavedRequests(result.savedRequests);
      }
      if (result.theme) setTheme(result.theme);
      if (result.fontFamily) setFontFamily(result.fontFamily);
      if (result.fontSize) setFontSize(result.fontSize);
      if (result.language) setLanguage(result.language);
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (fontFamily === 'monospace') {
      document.body.style.fontFamily = 'Consolas, "Courier New", monospace';
    } else if (fontFamily === 'serif') {
      document.body.style.fontFamily = 'Georgia, "Times New Roman", serif';
    } else if (fontFamily === 'verdana') {
      document.body.style.fontFamily = 'Verdana, Tahoma, sans-serif';
    } else {
      document.body.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
  }, [fontFamily]);

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize;
    document.body.style.fontSize = fontSize;
  }, [fontSize]);

  useEffect(() => {
    // Save to storage
    if (tabs.length > 0) {
      chrome.storage?.local.set({ tabs, activeTabId, history, theme, savedRequests, fontFamily, fontSize, language });
    }
  }, [tabs, activeTabId, history, theme, savedRequests, fontFamily, fontSize, language]);

  const addNewTab = (request?: RequestConfig) => {
    const newTab: TabData = {
      id: uuidv4(),
      request: request || createEmptyRequest(),
      loading: false
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newTabs = tabs.filter(t => t.id !== id);
    
    if (newTabs.length === 0) {
      const newTab: TabData = {
        id: uuidv4(),
        request: createEmptyRequest(),
        loading: false
      };
      setTabs([newTab]);
      setActiveTabId(newTab.id);
    } else {
      setTabs(newTabs);
      if (activeTabId === id) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
    }
  };

  const updateActiveTabRequest = (req: RequestConfig) => {
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, request: req } : t));
  };

  const handleSend = async () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    const { request } = activeTab;
    
    // Prepare fetch payload
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, loading: true } : t));

    const finalUrl = parseUrlAndParams(request.url, request.queryParams);
    const headers: Record<string, string> = {};
    
    request.headers.forEach(h => {
      if (h.active && h.key) headers[h.key] = h.value;
    });

    if (request.authType === 'bearer' && request.authConfig.token) {
      headers['Authorization'] = `Bearer ${request.authConfig.token}`;
    } else if (request.authType === 'basic' && request.authConfig.username) {
      headers['Authorization'] = `Basic ${btoa(request.authConfig.username + ':' + (request.authConfig.password || ''))}`;
    }

    const payload = {
      url: finalUrl,
      method: request.method,
      headers,
      body: (request.method !== 'GET') ? request.body : undefined
    };

    try {
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ type: 'FETCH_API', payload }, resolve);
      });

      setTabs(tabs.map(t => t.id === activeTabId ? { 
        ...t, 
        loading: false,
        response: response
      } : t));

      // Add to history
      const historyItem: HistoryItem = {
        id: uuidv4(),
        timestamp: Date.now(),
        request: { ...request },
        folderName: activeTab.folderName
      };
      setHistory([historyItem, ...history].slice(0, 50)); // Keep last 50
    } catch (e) {
      setTabs(tabs.map(t => t.id === activeTabId ? { 
        ...t, 
        loading: false,
        response: { success: false, error: 'Extension context invalidated or error sending request' }
      } : t));
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    let existingTab;
    
    if (item.folderName && item.request.name) {
      // Saved request: find by name + folder
      existingTab = tabs.find(t =>
        t.request.name === item.request.name &&
        t.folderName === item.folderName
      );
    } else {
      // Regular request: find by URL + method
      existingTab = tabs.find(t =>
        t.request.url === item.request.url &&
        t.request.method === item.request.method &&
        !t.request.name
      );
    }

    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else if (item.folderName && item.request.name) {
      // Re-open as a saved request tab
      const newTab: TabData = {
        id: uuidv4(),
        request: { ...item.request, id: uuidv4() },
        loading: false,
        folderName: item.folderName
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    } else {
      addNewTab({ ...item.request, id: uuidv4() });
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const handleSaveRequest = () => {
    if (!saveFolderName.trim() || !saveRequestName.trim() || !activeTab) return;
    
    const folder = saveFolderName.trim();
    const name = saveRequestName.trim();
    
    // Check for duplicates (case-insensitive)
    const isDuplicate = savedRequests.some(req => 
      req.folderName.toLowerCase() === folder.toLowerCase() && 
      req.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      setSaveError(`${t(language, 'saveErrorPrefix')} "${name}" ${t(language, 'saveErrorSuffix')} "${folder}".`);
      return;
    }
    
    const newSaved: SavedRequest = {
      id: uuidv4(),
      name: name,
      folderName: folder,
      request: { ...activeTab.request, name: name }
    };
    
    setSavedRequests([...savedRequests, newSaved]);
    
    // Update the active tab's name as well so it doesn't spawn a new tab if clicked immediately
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, request: { ...t.request, name: name } } : t));
    
    setIsSaveModalOpen(false);
    setSaveFolderName('');
    setSaveRequestName('');
    setSaveError('');
  };

  const loadSavedRequest = (req: SavedRequest) => {
    const existingTab = tabs.find(t => t.request.name === req.name && t.folderName === req.folderName);
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      const newTab: TabData = {
        id: uuidv4(),
        request: { ...req.request, id: uuidv4() },
        loading: false,
        folderName: req.folderName
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const deleteSavedRequest = (e: React.MouseEvent, req: SavedRequest) => {
    e.stopPropagation();
    setDeleteTarget(req);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      setSavedRequests(savedRequests.filter(r => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Group collections by folder
  const collectionsByFolder = savedRequests.reduce((acc, req) => {
    if (!acc[req.folderName]) acc[req.folderName] = [];
    acc[req.folderName].push(req);
    return acc;
  }, {} as Record<string, SavedRequest[]>);

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-tabs">
          <div className={`sidebar-tab ${sidebarTab === 'history' ? 'active' : ''}`} onClick={() => setSidebarTab('history')}>
            {t(language, 'history')}
          </div>
          <div className={`sidebar-tab ${sidebarTab === 'collections' ? 'active' : ''}`} onClick={() => setSidebarTab('collections')}>
            {t(language, 'collections')}
          </div>
        </div>
        <div className="sidebar-header" style={{ borderTop: 'none' }}>
          <span>
            {sidebarTab === 'history' ? <Clock size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} /> : <Folder size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />}
            {sidebarTab === 'history' ? t(language, 'history') : t(language, 'saved')}
          </span>
          <div className="settings-menu" title={t(language, 'settings')}>
            <Settings 
              size={16} 
              style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} 
              onClick={openSettings} 
            />
          </div>
        </div>
        {sidebarTab === 'history' && history.length > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            padding: '0.4rem 1rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-panel)'
          }}>
            <div onClick={clearHistory} title="Clear all history" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <Trash2 size={16} />
            </div>
          </div>
        )}
        <div className="sidebar-content">
          {sidebarTab === 'history' && history.map(item => (
            <div key={item.id} className="sidebar-item" onClick={() => loadHistoryItem(item)}>
              <span className={`method-badge ${item.request.method}`}>{item.request.method}</span>
              <span style={{ wordBreak: 'break-all', fontSize: '0.85em' }}>
                {item.folderName && item.request.name
                  ? `${item.folderName}-${item.request.name}`
                  : (item.request.url || t(language, 'untitledReq'))}
              </span>
            </div>
          ))}
          {sidebarTab === 'history' && history.length === 0 && (
            <div style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem' }}>
              {t(language, 'noHistory')}
            </div>
          )}

          {sidebarTab === 'collections' && Object.entries(collectionsByFolder).map(([folder, reqs]) => (
            <div key={folder}>
              <div className="collection-folder" onClick={() => toggleFolder(folder)} style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '6px', fontSize: '0.8rem', display: 'inline-block', width: '12px', textAlign: 'center' }}>
                  {expandedFolders[folder] ? '▼' : '▶'}
                </span>
                <Folder size={14} style={{ marginRight: '6px' }} />
                {folder}
              </div>
              {expandedFolders[folder] && reqs.map(req => (
                <div key={req.id} className="collection-item" onClick={() => loadSavedRequest(req)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                    <span className={`method-badge ${req.request.method}`}>{req.request.method}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {req.name}
                    </span>
                  </div>
                  <div 
                    title={t(language, 'delReq')} 
                    onClick={(e) => deleteSavedRequest(e, req)}
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Trash2 
                      size={14} 
                      style={{ color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0, marginLeft: '8px' }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
          {sidebarTab === 'collections' && savedRequests.length === 0 && (
            <div style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem' }}>
              {t(language, 'noSaved')}
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="workspace">
        <div className="tabs-header">
          {tabs.map(tab => (
            <div 
              key={tab.id} 
              className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className={`method-badge ${tab.request.method}`} style={{ minWidth: '35px' }}>
                {tab.request.method}
              </span>
              <span style={tab.folderName && tab.request.name
                  ? { whiteSpace: 'nowrap' }
                  : { maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tab.folderName && tab.request.name
                  ? `${tab.folderName}-${tab.request.name}`
                  : (tab.request.url || t(language, 'untitledReq'))}
              </span>
              <button className="close-btn" onClick={(e) => closeTab(e, tab.id)}>
                <X size={14} />
              </button>
            </div>
          ))}
          <button className="new-tab-btn" onClick={() => addNewTab()}>
            <Plus size={18} />
          </button>
        </div>

        {activeTab && (
          <>
            <div className="request-bar">
              <select 
                className="request-method-select"
                value={activeTab.request.method}
                onChange={(e) => updateActiveTabRequest({ ...activeTab.request, method: e.target.value as HttpMethod })}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
              <input 
                type="text" 
                className={`request-url-input ${isBlurred ? 'blur-effect' : ''}`}
                placeholder={t(language, 'enterUrl')}
                value={activeTab.request.url}
                onChange={(e) => updateActiveTabRequest({ ...activeTab.request, url: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button className="btn-secondary" onClick={() => { setIsSaveModalOpen(true); setSaveError(''); }} title={t(language, 'saveReq')}>
                <Save size={18} />
              </button>
              <button className="btn-primary" onClick={handleSend} disabled={activeTab.loading}>
                {activeTab.loading ? t(language, 'sending') : t(language, 'send')}
              </button>
            </div>

            <div className="workspace-content">
              <RequestEditor 
                request={activeTab.request} 
                onChange={updateActiveTabRequest} 
                language={language} 
                theme={theme} 
                isBlurred={isBlurred}
                setIsBlurred={setIsBlurred}
              />
              <ResponseEditor response={activeTab.response} loading={activeTab.loading} language={language} theme={theme} />
            </div>
          </>
        )}
      </div>

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSaveModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{t(language, 'saveReq')}</div>
            <div>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t(language, 'reqName')}</label>
              <input 
                type="text" 
                className="modal-input" 
                placeholder="e.g., Get User Profile" 
                value={saveRequestName}
                onChange={(e) => setSaveRequestName(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t(language, 'folderCol')}</label>
              <input 
                type="text" 
                className="modal-input" 
                placeholder="e.g., Auth API" 
                value={saveFolderName}
                onChange={(e) => setSaveFolderName(e.target.value)}
                list="folder-suggestions"
              />
              <datalist id="folder-suggestions">
                {Object.keys(collectionsByFolder).map(f => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
            {saveError && (
              <div style={{ color: 'var(--error-color)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                {saveError}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsSaveModalOpen(false)}>{t(language, 'cancel')}</button>
              <button className="btn-primary" onClick={handleSaveRequest}>{t(language, 'save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-title">{t(language, 'delReq')}</div>
            <div style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              {t(language, 'delConfirmPrefix')} <strong style={{ color: 'var(--text-primary)' }}>"{deleteTarget.name}"</strong> {t(language, 'delConfirmSuffix')} <strong style={{ color: 'var(--text-primary)' }}>"{deleteTarget.folderName}"</strong>?
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>{t(language, 'cancel')}</button>
              <button className="btn-primary" onClick={confirmDelete} style={{ backgroundColor: 'var(--error-color)', borderColor: 'var(--error-color)' }}>{t(language, 'del')}</button>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div className="modal-title">{t(language, 'settings')}</div>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setIsSettingsOpen(false)} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Theme */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: 'bold' }}>{t(language, 'themeColor')}</label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'dark', label: 'Dark', color: '#121212' },
                    { id: 'gray', label: 'Abu', color: '#202124' },
                    { id: 'light', label: 'Putih', color: '#ffffff' },
                    { id: 'termius', label: 'Termius', color: '#141820' }
                  ].map(t => (
                    <div 
                      key={t.id}
                      onClick={() => setTempTheme(t.id as AppTheme)}
                      style={{
                        padding: '0.5rem 1rem', 
                        border: `2px solid ${tempTheme === t.id ? 'var(--accent-color)' : 'var(--border-color)'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: 'var(--bg-input)'
                      }}
                    >
                      <div className="theme-circle" style={{ backgroundColor: t.color }}></div>
                      {t.label}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Language */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: 'bold' }}>{t(language, 'language')}</label>
                <select 
                  className="modal-input" 
                  value={tempLanguage}
                  onChange={(e) => setTempLanguage(e.target.value)}
                >
                  <option value="en">English (Inggris)</option>
                  <option value="id">Bahasa Indonesia</option>
                </select>
              </div>

              {/* Font Family */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: 'bold' }}>{t(language, 'fontStyle')}</label>
                <select 
                  className="modal-input" 
                  value={tempFontFamily}
                  onChange={(e) => setTempFontFamily(e.target.value)}
                >
                  <option value="system">System Default</option>
                  <option value="serif">Serif</option>
                  <option value="verdana">Verdana</option>
                  <option value="monospace">Monospace</option>
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: 'bold' }}>Ukuran Font (Font Size)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input 
                    type="range" 
                    min="20" 
                    max="120" 
                    step="5"
                    className="modal-slider"
                    value={parseInt(tempFontSize) || 50}
                    onChange={(e) => setTempFontSize(`${e.target.value}%`)}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 'bold', width: '45px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {tempFontSize}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="modal-actions" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn-primary" onClick={saveSettings}>{t(language, 'save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
