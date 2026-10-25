import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { RequestConfig, TabData, HistoryItem, HttpMethod, AppTheme, SavedRequest, UserVaultKey } from './types';
import { createEmptyRequest, parseUrlAndParams, t } from './utils';
import { RequestEditor } from './components/RequestEditor';
import { ResponseEditor } from './components/ResponseEditor';
import { Clock, Plus, X, Trash2, Settings, Save, Folder, Menu, Search, Key, Copy, Check, Download, Upload } from 'lucide-react';

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
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveFolderName, setSaveFolderName] = useState('');
  const [saveRequestName, setSaveRequestName] = useState('');
  const [saveError, setSaveError] = useState('');
  const saveRequestInputRef = useRef<HTMLInputElement>(null);
  const saveFolderInputRef = useRef<HTMLInputElement>(null);
  const tabsHeaderRef = useRef<HTMLDivElement>(null);
  
  // Key / Token Vault state
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultKeys, setVaultKeys] = useState<UserVaultKey[]>([]);
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [newVaultField, setNewVaultField] = useState('');
  const [newVaultValue, setNewVaultValue] = useState('');
  const [newVaultNote, setNewVaultNote] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [copiedVaultId, setCopiedVaultId] = useState<string | null>(null);
  const isLoadedRef = useRef(false);

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<SavedRequest | null>(null);
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [cleanupDeleteLarge, setCleanupDeleteLarge] = useState(false);
  const [cleanupDeleteCount, setCleanupDeleteCount] = useState(0);
  const [isHistoryFullscreenOpen, setIsHistoryFullscreenOpen] = useState(false);
  const [historyDisplayLimit, setHistoryDisplayLimit] = useState(15);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [sidebarHistorySearch, setSidebarHistorySearch] = useState('');

  const filteredVaultKeys = useMemo(() => {
    if (!vaultSearchQuery.trim()) return vaultKeys;
    const query = vaultSearchQuery.trim().toLowerCase();
    return vaultKeys.filter(item => {
      const fieldMatch = (item.field || '').toLowerCase().includes(query);
      const valueMatch = (item.value || '').toLowerCase().includes(query);
      const noteMatch = (item.note || '').toLowerCase().includes(query);
      return fieldMatch || valueMatch || noteMatch;
    });
  }, [vaultKeys, vaultSearchQuery]);

  const filteredHistory = useMemo(() => {
    if (!sidebarHistorySearch.trim()) return history;
    const query = sidebarHistorySearch.trim().toLowerCase();
    return history.filter(item => {
      const url = (item.request.url || '').toLowerCase();
      const name = (item.folderName && item.request.name ? `${item.folderName}-${item.request.name}` : '').toLowerCase();
      return url.includes(query) || name.includes(query);
    });
  }, [history, sidebarHistorySearch]);

  // Settings temporary state
  const [tempTheme, setTempTheme] = useState<AppTheme>('dark');
  const [tempFontFamily, setTempFontFamily] = useState('monospace');
  const [tempFontSize, setTempFontSize] = useState('50%');
  const [tempLanguage, setTempLanguage] = useState('en');
  const [backupStatusMsg, setBackupStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const openSettings = () => {
    setTempTheme(theme);
    setTempFontFamily(fontFamily);
    setTempFontSize(fontSize);
    setTempLanguage(language);
    setBackupStatusMsg(null);
    setIsSettingsOpen(true);
  };

  const saveSettings = () => {
    setTheme(tempTheme);
    setFontFamily(tempFontFamily);
    setFontSize(tempFontSize);
    setLanguage(tempLanguage);
    setBackupStatusMsg(null);
    setIsSettingsOpen(false);
  };

  const handleExportData = () => {
    try {
      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        appName: 'API Client',
        savedRequests: savedRequests || [],
        vaultKeys: vaultKeys || [],
        history: history || [],
        settings: {
          theme,
          fontFamily,
          fontSize,
          language
        },
        tabs: tabs || [],
        activeTabId: activeTabId || ''
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
      a.href = url;
      a.download = `api-client-backup-${dateStr}_${timeStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupStatusMsg({
        text: language === 'id' 
          ? `Data berhasil diexport (${savedRequests.length} koleksi, ${vaultKeys.length} key vault, ${history.length} riwayat)` 
          : `Data successfully exported (${savedRequests.length} collections, ${vaultKeys.length} vault keys, ${history.length} history)`
      });
      setTimeout(() => setBackupStatusMsg(null), 4000);
    } catch (e: any) {
      setBackupStatusMsg({
        text: language === 'id' ? `Gagal mengexport data: ${e?.message || 'Error tidak diketahui'}` : `Export failed: ${e?.message || 'Unknown error'}`,
        isError: true
      });
      setTimeout(() => setBackupStatusMsg(null), 4000);
    }
  };

  const handleTriggerImport = () => {
    if (importFileInputRef.current) {
      importFileInputRef.current.value = '';
      importFileInputRef.current.click();
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (!data || typeof data !== 'object') {
          setBackupStatusMsg({
            text: language === 'id' ? 'File backup tidak valid: format bukan objek JSON' : 'Invalid backup file: not a JSON object',
            isError: true
          });
          setTimeout(() => setBackupStatusMsg(null), 4000);
          return;
        }

        let importedRequests = 0;
        let importedVault = 0;
        let importedHistory = 0;

        // 1. Merge savedRequests
        if (Array.isArray(data.savedRequests)) {
          setSavedRequests((prev) => {
            const map = new Map(prev.map(item => [item.id, item]));
            for (const item of data.savedRequests) {
              if (item && item.id) {
                map.set(item.id, item);
                importedRequests++;
              }
            }
            return Array.from(map.values());
          });
        }

        // 2. Merge vaultKeys
        if (Array.isArray(data.vaultKeys)) {
          setVaultKeys((prev) => {
            const map = new Map(prev.map(k => [k.id, k]));
            for (const k of data.vaultKeys) {
              if (k && k.id) {
                map.set(k.id, k);
                importedVault++;
              }
            }
            return Array.from(map.values());
          });
        }

        // 3. Merge history
        if (Array.isArray(data.history)) {
          setHistory((prev) => {
            const map = new Map(prev.map(h => [h.id, h]));
            for (const h of data.history) {
              if (h && h.id) {
                map.set(h.id, h);
                importedHistory++;
              }
            }
            return Array.from(map.values());
          });
        }

        // 4. Restore settings if present
        if (data.settings && typeof data.settings === 'object') {
          if (data.settings.theme) {
            setTheme(data.settings.theme);
            setTempTheme(data.settings.theme);
          }
          if (data.settings.fontFamily) {
            setFontFamily(data.settings.fontFamily);
            setTempFontFamily(data.settings.fontFamily);
          }
          if (data.settings.fontSize) {
            setFontSize(data.settings.fontSize);
            setTempFontSize(data.settings.fontSize);
          }
          if (data.settings.language) {
            setLanguage(data.settings.language);
            setTempLanguage(data.settings.language);
          }
        }

        // 5. Restore tabs if current tabs are empty or fresh
        if (Array.isArray(data.tabs) && data.tabs.length > 0) {
          setTabs((prev) => {
            if (prev.length <= 1 && (!prev[0] || !prev[0].request.url)) {
              if (data.activeTabId) setActiveTabId(data.activeTabId);
              return data.tabs;
            }
            return prev;
          });
        }

        setBackupStatusMsg({
          text: language === 'id' 
            ? `Berhasil mengimport data (${importedRequests} koleksi, ${importedVault} key vault, ${importedHistory} riwayat)!`
            : `Successfully imported data (${importedRequests} collections, ${importedVault} vault keys, ${importedHistory} history)!`
        });
        setTimeout(() => setBackupStatusMsg(null), 5000);
      } catch (err: any) {
        setBackupStatusMsg({
          text: language === 'id' ? `Gagal membaca file: ${err?.message || 'Format JSON rusak'}` : `Failed to read file: ${err?.message || 'Corrupted JSON'}`,
          isError: true
        });
        setTimeout(() => setBackupStatusMsg(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    // Load from storage
    chrome.storage?.local.get(['tabs', 'activeTabId', 'history', 'theme', 'savedRequests', 'fontFamily', 'fontSize', 'language', 'vaultKeys'], (result: any) => {
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
      if (result.vaultKeys && Array.isArray(result.vaultKeys)) {
        setVaultKeys(result.vaultKeys);
      } else {
        // Default example from user: Authorization | Bearer akjshdakhsdadaj | milik user
        setVaultKeys([
          {
            id: uuidv4(),
            field: 'Authorization',
            value: 'Bearer akjshdakhsdadaj',
            note: 'milik user'
          }
        ]);
      }
      isLoadedRef.current = true;
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
    const el = tabsHeaderRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    // Save to storage
    if (isLoadedRef.current && tabs.length > 0) {
      chrome.storage?.local.set({ tabs, activeTabId, history, theme, savedRequests, fontFamily, fontSize, language, vaultKeys });
    }
  }, [tabs, activeTabId, history, theme, savedRequests, fontFamily, fontSize, language, vaultKeys]);

  const addNewTab = (request?: RequestConfig) => {
    const newTab: TabData = {
      id: uuidv4(),
      request: request || createEmptyRequest(),
      loading: false
    };
    setTabs([newTab, ...tabs]);
    setActiveTabId(newTab.id);
    if (tabsHeaderRef.current) {
      tabsHeaderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
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
      setHistory([historyItem, ...history].slice(0, 500)); // Keep last 500
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

  const openCleanupModal = () => {
    setCleanupDeleteLarge(false);
    setCleanupDeleteCount(0);
    setIsCleanupOpen(true);
  };

  const executeCleanup = () => {
    let remaining = [...history];

    if (cleanupDeleteLarge) {
      // Remove entries whose request body exceeds 1KB
      remaining = remaining.filter(item => {
        const size = JSON.stringify(item.request).length;
        return size <= 1024;
      });
    }

    if (cleanupDeleteCount > 0) {
      // Sort by timestamp oldest first, remove oldest N
      const sorted = [...remaining].sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = new Set(sorted.slice(0, cleanupDeleteCount).map(i => i.id));
      remaining = remaining.filter(item => !toRemove.has(item.id));
    }

    setHistory(remaining);
    setIsCleanupOpen(false);
  };

  const deleteSingleHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(history.filter(item => item.id !== id));
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

  const handleAddVaultKey = () => {
    if (!newVaultField.trim()) {
      setVaultError('Kolom Field harus diisi (contoh: Authorization)');
      return;
    }
    if (!newVaultValue.trim()) {
      setVaultError('Kolom Value harus diisi (contoh: Bearer ... )');
      return;
    }
    const newItem: UserVaultKey = {
      id: uuidv4(),
      field: newVaultField.trim(),
      value: newVaultValue.trim(),
      note: newVaultNote.trim()
    };
    setVaultKeys([newItem, ...vaultKeys]);
    setNewVaultField('');
    setNewVaultValue('');
    setNewVaultNote('');
    setVaultError('');
  };

  const handleDeleteVaultKey = (id: string) => {
    setVaultKeys(vaultKeys.filter(k => k.id !== id));
  };

  const handleCopyVaultValue = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedVaultId(id);
    setTimeout(() => setCopiedVaultId(null), 1500);
  };

  const handleSaveToVault = (field: string, value: string, note: string = '') => {
    const newItem: UserVaultKey = {
      id: uuidv4(),
      field: field.trim(),
      value: value.trim(),
      note: note.trim()
    };
    setVaultKeys(prev => {
      const updated = [newItem, ...prev];
      chrome.storage?.local.set({ vaultKeys: updated });
      return updated;
    });
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              className="key-auth-btn"
              title="Key & Token Vault" 
              onClick={() => {
                setIsVaultModalOpen(true);
                setVaultError('');
              }}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffd700 0%, #ffae00 100%)',
                boxShadow: '0 0 8px rgba(255, 215, 0, 0.4)',
                border: '1px solid #ffe57f',
                color: '#1a1a1a',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 215, 0, 0.4)';
              }}
            >
              <Key size={13} strokeWidth={2.5} />
            </div>
            <div className="settings-menu" title={t(language, 'settings')}>
              <Settings 
                size={16} 
                style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} 
                onClick={openSettings} 
              />
            </div>
          </div>
        </div>
        {sidebarTab === 'history' && history.length > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            padding: '0.4rem 0.8rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-panel)',
            gap: '8px'
          }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-input)',
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)'
            }}>
              <Search size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <input 
                type="text"
                placeholder="Cari path / base URL..."
                value={sidebarHistorySearch}
                onChange={(e) => setSidebarHistorySearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  width: '100%',
                  fontFamily: 'inherit'
                }}
              />
              {sidebarHistorySearch && (
                <X 
                  size={13} 
                  style={{ color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }} 
                  onClick={() => setSidebarHistorySearch('')} 
                />
              )}
            </div>
            <div onClick={openCleanupModal} title={t(language, 'cleanupHistoryTitle')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <Trash2 size={16} />
            </div>
            <div onClick={() => { setIsHistoryFullscreenOpen(true); setHistoryDisplayLimit(15); setHistorySearchQuery(''); }} title={t(language, 'viewAllHistoryIconTitle')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <Menu size={16} />
            </div>
          </div>
        )}
        <div className="sidebar-content">
          {sidebarTab === 'history' && filteredHistory.map(item => (
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
          {sidebarTab === 'history' && history.length > 0 && filteredHistory.length === 0 && (
            <div style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.85rem' }}>
              Tidak ada hasil yang cocok dengan "{sidebarHistorySearch}"
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
        <div className="tabs-bar-container">
          <button className="new-tab-btn" onClick={() => addNewTab()} title={t(language, 'newTab')}>
            <Plus size={18} />
          </button>
          <div className="tabs-header" ref={tabsHeaderRef}>
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
          </div>
        </div>

        {activeTab && (
          <>
            <div className="request-bar">
              <div style={{ position: 'relative' }}>
                <div 
                  className={`request-method-select ${activeTab.request.method}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minWidth: '95px', userSelect: 'none' }}
                  onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
                >
                  {activeTab.request.method}
                </div>
                
                {isMethodDropdownOpen && (
                  <>
                    <div 
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                      onClick={() => setIsMethodDropdownOpen(false)}
                    />
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        marginTop: '4px', 
                        zIndex: 100, 
                        display: 'flex', 
                        flexDirection: 'column',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        border: '1px solid var(--border-color)',
                        width: '100%'
                      }}
                    >
                      {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'QUERY'].map(method => (
                        <div 
                          key={method}
                          className={`custom-method-option ${method}`}
                          onClick={() => {
                            updateActiveTabRequest({ ...activeTab.request, method: method as HttpMethod });
                            setIsMethodDropdownOpen(false);
                          }}
                        >
                          {method}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <textarea 
                className={`request-url-input ${isBlurred ? 'blur-effect' : ''}`}
                placeholder={t(language, 'enterUrl')}
                value={activeTab.request.url}
                onChange={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                  updateActiveTabRequest({ ...activeTab.request, url: e.target.value.replace(/\r?\n/g, '') });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                style={{ resize: 'none', overflow: 'hidden', minHeight: '38px', boxSizing: 'border-box' }}
              />
              <button className="btn-primary" onClick={handleSend} disabled={activeTab.loading}>
                {activeTab.loading ? t(language, 'sending') : t(language, 'send')}
              </button>
              <button className="btn-secondary" onClick={() => { setIsSaveModalOpen(true); setSaveError(''); }} title={t(language, 'saveReq')}>
                <Save size={18} />
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
                onSaveToVault={handleSaveToVault}
                vaultKeys={vaultKeys}
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
                ref={saveRequestInputRef}
                type="text" 
                className="modal-input" 
                autoFocus
                style={{ textTransform: 'uppercase' }}
                placeholder="e.g., Get User Profile" 
                value={saveRequestName}
                onChange={(e) => setSaveRequestName(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (saveRequestName.trim() && saveFolderName.trim()) {
                      handleSaveRequest();
                    } else if (saveRequestName.trim()) {
                      saveFolderInputRef.current?.focus();
                    }
                  }
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t(language, 'folderCol')}</label>
              <input 
                ref={saveFolderInputRef}
                type="text" 
                className="modal-input" 
                style={{ textTransform: 'uppercase' }}
                placeholder="e.g., Auth API" 
                value={saveFolderName}
                onChange={(e) => setSaveFolderName(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (saveRequestName.trim() && saveFolderName.trim()) {
                      handleSaveRequest();
                    } else if (!saveRequestName.trim()) {
                      saveRequestInputRef.current?.focus();
                    }
                  }
                }}
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
                    { id: 'termius', label: 'Termius', color: '#141820' },
                    { id: 'dracula', label: 'Dracula', color: '#282a36' },
                    { id: 'nord', label: 'Nord', color: '#2e3440' },
                    { id: 'monokai', label: 'Monokai', color: '#272822' },
                    { id: 'solarized', label: 'Solarized', color: '#002b36' },
                    { id: 'vercel', label: 'Vercel', color: '#000000' }
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
            
            {backupStatusMsg && (
              <div style={{
                backgroundColor: backupStatusMsg.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                border: `1px solid ${backupStatusMsg.isError ? 'var(--error-color)' : 'var(--success-color)'}`,
                color: backupStatusMsg.isError ? 'var(--error-color)' : 'var(--success-color)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '1.2rem'
              }}>
                {backupStatusMsg.isError ? <X size={16} /> : <Check size={16} />}
                <span>{backupStatusMsg.text}</span>
              </div>
            )}

            <div className="modal-actions" style={{ 
              marginTop: '1.5rem', 
              paddingTop: '1rem', 
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button"
                  className="btn-secondary" 
                  onClick={handleExportData} 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.45rem 0.85rem' }}
                  title="Export semua koleksi, riwayat, key vault, & pengaturan ke file JSON"
                >
                  <Download size={15} />
                  <span>Export</span>
                </button>
                <button 
                  type="button"
                  className="btn-secondary" 
                  onClick={handleTriggerImport} 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.45rem 0.85rem' }}
                  title="Import data dari file JSON backup"
                >
                  <Upload size={15} />
                  <span>Import</span>
                </button>
                <input 
                  type="file" 
                  ref={importFileInputRef} 
                  onChange={handleImportFile} 
                  accept=".json,application/json" 
                  style={{ display: 'none' }} 
                />
              </div>

              <button className="btn-primary" onClick={saveSettings}>{t(language, 'save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Key & Token Vault Modal */}
      {isVaultModalOpen && (
        <div className="modal-overlay" onClick={() => setIsVaultModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ width: '740px', maxWidth: '94vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffae00 100%)',
                  boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1a1a1a'
                }}>
                  <Key size={15} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Key & Token Vault</span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '2px 8px', 
                      borderRadius: '10px', 
                      backgroundColor: 'var(--bg-input)', 
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)'
                    }}>
                      {vaultKeys.length} {language === 'id' ? 'tersimpan' : 'saved'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {language === 'id' 
                      ? 'Daftar key dan value yang disimpan (field | value | note).' 
                      : 'Saved keys and values (field | value | note).'}
                  </div>
                </div>
              </div>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setIsVaultModalOpen(false)} />
            </div>

            {/* Form Input Tambah Baru */}
            <div style={{ 
              backgroundColor: 'var(--bg-input)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '6px', 
              padding: '0.8rem 1rem' 
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                {language === 'id' ? '+ Tambah Key / Value Baru' : '+ Add New Key / Value'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 1.2fr auto', gap: '8px', alignItems: 'center' }}>
                <div>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="field (misal: Authorization)"
                    value={newVaultField}
                    onChange={(e) => setNewVaultField(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddVaultKey(); }}
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.6rem' }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="value (misal: Bearer akjshd...)"
                    value={newVaultValue}
                    onChange={(e) => setNewVaultValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddVaultKey(); }}
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.6rem', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="note (misal: milik user)"
                    value={newVaultNote}
                    onChange={(e) => setNewVaultNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddVaultKey(); }}
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.6rem' }}
                  />
                </div>
                <div>
                  <button 
                    className="btn-primary" 
                    onClick={handleAddVaultKey}
                    style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                  >
                    <Plus size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                    {language === 'id' ? 'Simpan' : 'Save'}
                  </button>
                </div>
              </div>
              {vaultError && (
                <div style={{ color: 'var(--error-color)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
                  {vaultError}
                </div>
              )}
            </div>

            {/* Kolom Pencarian Partial */}
            {vaultKeys.length > 0 && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="modal-input"
                  placeholder={language === 'id' ? 'Cari partial (field, value, atau note)...' : 'Search (field, value, or note)...'}
                  value={vaultSearchQuery}
                  onChange={(e) => setVaultSearchQuery(e.target.value)}
                  style={{ paddingLeft: '32px', paddingRight: vaultSearchQuery ? '30px' : '10px', fontSize: '0.85rem' }}
                />
                {vaultSearchQuery && (
                  <div 
                    onClick={() => setVaultSearchQuery('')}
                    style={{ 
                      position: 'absolute', 
                      right: '8px', 
                      cursor: 'pointer', 
                      color: 'var(--text-secondary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '2px' 
                    }}
                    title={language === 'id' ? 'Hapus pencarian' : 'Clear search'}
                  >
                    <X size={13} />
                  </div>
                )}
              </div>
            )}

            {/* 3-Column Table: field | value | note */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              border: '1px solid var(--border-color)', 
              borderRadius: '6px',
              backgroundColor: 'var(--bg-main)',
              minHeight: '180px',
              maxHeight: '340px'
            }}>
              {filteredVaultKeys.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {language === 'id' ? 'Belum ada data key atau value yang tersimpan.' : 'No saved keys or values found.'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ 
                      backgroundColor: 'var(--bg-panel)', 
                      borderBottom: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2
                    }}>
                      <th style={{ padding: '0.6rem 0.8rem', width: '28%', fontWeight: '600' }}>field</th>
                      <th style={{ padding: '0.6rem 0.8rem', width: '46%', fontWeight: '600' }}>value</th>
                      <th style={{ padding: '0.6rem 0.8rem', width: '26%', fontWeight: '600' }}>note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVaultKeys.map((item) => {
                      const isCopied = copiedVaultId === item.id;
                      return (
                        <tr 
                          key={item.id} 
                          style={{ 
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {/* Column 1: Field */}
                          <td style={{ padding: '0.6rem 0.8rem', verticalAlign: 'middle' }}>
                            <span style={{ 
                              fontWeight: '600', 
                              fontFamily: 'monospace', 
                              color: 'var(--accent-color)',
                              backgroundColor: 'var(--bg-input)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              display: 'inline-block',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={item.field}>
                              {item.field}
                            </span>
                          </td>

                          {/* Column 2: Value */}
                          <td style={{ padding: '0.6rem 0.8rem', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span 
                                style={{ 
                                  fontFamily: 'monospace', 
                                  color: 'var(--text-primary)',
                                  backgroundColor: 'var(--bg-input)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem',
                                  maxWidth: '260px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  flex: 1
                                }}
                                title={item.value}
                              >
                                {item.value}
                              </span>
                              <button
                                onClick={() => handleCopyVaultValue(item.id, item.value)}
                                title={language === 'id' ? 'Salin value' : 'Copy value'}
                                style={{
                                  background: isCopied ? '#10b981' : 'var(--bg-panel)',
                                  border: `1px solid ${isCopied ? '#10b981' : 'var(--border-color)'}`,
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  padding: '3px 6px',
                                  color: isCopied ? '#ffffff' : 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.75rem',
                                  transition: 'all 0.15s'
                                }}
                              >
                                {isCopied ? (
                                  <>
                                    <Check size={12} strokeWidth={2.5} />
                                    <span>{language === 'id' ? 'Tersalin' : 'Copied'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    <span>{language === 'id' ? 'Salin' : 'Copy'}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Column 3: Note */}
                          <td style={{ padding: '0.6rem 0.8rem', verticalAlign: 'middle', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <span style={{ 
                                display: 'inline-block', 
                                maxWidth: '170px', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap' 
                              }} title={item.note || '-'}>
                                {item.note || <span style={{ opacity: 0.5 }}>-</span>}
                              </span>
                              <button
                                onClick={() => handleDeleteVaultKey(item.id)}
                                title={language === 'id' ? 'Hapus key ini' : 'Delete this key'}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '3px 5px',
                                  color: 'var(--text-secondary)',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  opacity: 0.6
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = 'var(--error-color)';
                                  e.currentTarget.style.opacity = '1';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = 'var(--text-secondary)';
                                  e.currentTarget.style.opacity = '0.6';
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setIsVaultModalOpen(false)}
                style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}
              >
                {t(language, 'cancel') || (language === 'id' ? 'Tutup' : 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup History Modal */}
      {isCleanupOpen && (
        <div className="modal-overlay" onClick={() => setIsCleanupOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '460px', maxWidth: '90vw' }}>
            <div className="modal-title" style={{ marginBottom: '0.5rem' }}>{t(language, 'cleanupHistoryTitle')}</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {t(language, 'cleanupHistoryDesc')}
            </p>

            {/* Delete large entries */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '1.25rem' }}>
              <input
                type="checkbox"
                checked={cleanupDeleteLarge}
                onChange={(e) => setCleanupDeleteLarge(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '0.95rem' }}>
                {t(language, 'deleteLargeEntries')} ({history.filter(i => JSON.stringify(i.request).length > 1024).length} {t(language, 'entriesOver1KB')})
              </span>
            </label>

            {/* Delete oldest entries slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{t(language, 'deleteOldestEntries')}</span>
              <input
                type="range"
                min={0}
                max={history.length}
                step={1}
                value={cleanupDeleteCount}
                onChange={(e) => setCleanupDeleteCount(Number(e.target.value))}
                style={{ flex: 1, cursor: 'pointer' }}
              />
              <span style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', minWidth: '60px', textAlign: 'right' }}>
                {cleanupDeleteCount} {cleanupDeleteCount === 1 ? t(language, 'entry') : t(language, 'entries')}
              </span>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setIsCleanupOpen(false)}>{t(language, 'cancel')}</button>
              <button
                className="btn-primary"
                onClick={executeCleanup}
                disabled={!cleanupDeleteLarge && cleanupDeleteCount === 0}
                style={{ opacity: (!cleanupDeleteLarge && cleanupDeleteCount === 0) ? 0.5 : 1 }}
              >
                {t(language, 'deleteEntriesBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen History Modal */}
      {isHistoryFullscreenOpen && (
        <div className="modal-overlay" style={{ alignItems: 'flex-start' }} onClick={() => setIsHistoryFullscreenOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '100%', height: '100%', margin: 0, borderRadius: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-dark)' }}>
            <div className="modal-title" style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t(language, 'history')}</span>
              <div 
                onClick={() => setIsHistoryFullscreenOpen(false)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: 'var(--error-color)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                <X size={16} strokeWidth={3} />
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder={t(language, 'searchHistoryPlaceholder')}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-panel)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>

                {(() => {
                  const query = historySearchQuery.toLowerCase();
                  const filteredHistory = query ? history.filter(item => {
                    const urlMatch = item.request.url.toLowerCase().includes(query);
                    const nameMatch = item.request.name?.toLowerCase().includes(query);
                    const folderMatch = item.folderName?.toLowerCase().includes(query);
                    return urlMatch || nameMatch || folderMatch;
                  }) : history;

                  if (filteredHistory.length === 0) {
                    return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>{t(language, 'noHistoryFound')}</div>;
                  }

                  return (
                    <>
                      {filteredHistory.slice(0, historyDisplayLimit).map(item => {
                        const date = new Date(item.timestamp);
                        const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}, ${String(date.getHours()).padStart(2, '0')}.${String(date.getMinutes()).padStart(2, '0')}.${String(date.getSeconds()).padStart(2, '0')}`;
                        
                        return (
                          <div key={item.id} style={{
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '1rem', 
                            backgroundColor: 'var(--bg-panel)', 
                            marginBottom: '4px',
                            cursor: 'pointer'
                          }} onClick={() => {
                            loadHistoryItem(item);
                            setIsHistoryFullscreenOpen(false);
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formattedDate}</span>
                              {item.folderName && item.request.name && (
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.folderName} / {item.request.name}</span>
                              )}
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {item.request.method} {item.request.url || t(language, 'untitledReq')}
                              </span>
                            </div>
                            
                            <div onClick={(e) => deleteSingleHistory(item.id, e)} title={t(language, 'deleteEntryTitle')} style={{ cursor: 'pointer', padding: '0.5rem', color: 'var(--text-secondary)' }}>
                              <Trash2 size={16} />
                            </div>
                          </div>
                        );
                      })}
                      {filteredHistory.length > historyDisplayLimit && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                          <button 
                            className="btn-primary" 
                            onClick={() => setHistoryDisplayLimit(filteredHistory.length)}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                          >
                            {t(language, 'loadAllBtn')}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
