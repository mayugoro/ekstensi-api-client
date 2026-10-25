import React, { useState } from 'react';
import type { KeyValuePair, UserVaultKey } from '../types';
import { createEmptyKV } from '../utils';
import { Trash2, Save, Check, X, Lock, Search } from 'lucide-react';

const ALL_HEADER_KEYS = [
  'Accept', 'Accept-Charset', 'Accept-Encoding', 'Accept-Language',
  'Access-Control-Request-Headers', 'Access-Control-Request-Method',
  'Authorization', 'Cache-Control', 'Connection', 'Content-Length',
  'Content-Type', 'Cookie', 'Date', 'Expect', 'Forwarded', 'From',
  'Host', 'If-Match', 'If-Modified-Since', 'If-None-Match', 'If-Range',
  'If-Unmodified-Since', 'Max-Forwards', 'Origin', 'Pragma',
  'Proxy-Authorization', 'Range', 'Referer', 'TE', 'User-Agent',
  'Upgrade', 'Via', 'Warning', 'X-Api-Key', 'X-Client', 'X-Requested-With', 'X-Forwarded-For'
];

interface Props {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  type?: 'params' | 'headers';
  onSaveToVault?: (field: string, value: string, note: string) => void;
  vaultKeys?: UserVaultKey[];
  language?: string;
}

export const KeyValueEditor: React.FC<Props> = ({ items, onChange, type = 'params', onSaveToVault, vaultKeys = [], language = 'en' }) => {
  const [pendingSaveItem, setPendingSaveItem] = useState<KeyValuePair | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  
  // State untuk modal gembok (picker value dari vault)
  const [activePickerRowId, setActivePickerRowId] = useState<string | null>(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');

  const handleItemChange = (id: string, field: keyof KeyValuePair, value: any) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange(newItems);
  };

  const handleRemove = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const handleAdd = () => {
    onChange([...items, createEmptyKV()]);
  };

  const handleInitiateSave = (item: KeyValuePair) => {
    if (!item.key.trim() && !item.value.trim()) return;
    setPendingSaveItem(item);
    setNoteInput('');
  };

  const handleConfirmSave = () => {
    if (!pendingSaveItem || !onSaveToVault) return;
    onSaveToVault(pendingSaveItem.key, pendingSaveItem.value, noteInput.trim());
    setSavedItemId(pendingSaveItem.id);
    setPendingSaveItem(null);
    setTimeout(() => {
      setSavedItemId(null);
    }, 2000);
  };

  const handleSelectVaultKey = (vaultItem: UserVaultKey) => {
    if (!activePickerRowId) return;
    const newItems = items.map(item => {
      if (item.id === activePickerRowId) {
        return {
          ...item,
          value: vaultItem.value,
          key: item.key.trim() ? item.key : vaultItem.field
        };
      }
      return item;
    });
    onChange(newItems);
    setActivePickerRowId(null);
  };

  const getHeaderValueSuggestions = (key: string): string[] => {
    const k = key.toLowerCase();
    if (k === 'authorization') return ['Bearer ', 'Basic ', 'Digest ', 'OAuth ', 'AWS4-HMAC-SHA256 '];
    if (k === 'content-type' || k === 'accept') return ['application/json', 'application/xml', 'application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain', 'text/html'];
    if (k === 'cache-control') return ['no-cache', 'no-store', 'max-age=0', 'must-revalidate'];
    if (k === 'connection') return ['keep-alive', 'close'];
    return [];
  };

  return (
    <div>
      <table className="kv-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}></th>
            <th style={{ width: '30%' }}>Key</th>
            <th>Value</th>
            <th style={{ width: onSaveToVault ? '96px' : '40px' }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td className="kv-action">
                <input 
                  type="checkbox" 
                  checked={item.active} 
                  onChange={(e) => handleItemChange(item.id, 'active', e.target.checked)}
                />
              </td>
              <td>
                {type === 'headers' && (
                  <datalist id={`header-keys-${item.id}`}>
                    {ALL_HEADER_KEYS
                      .filter(k => k.toLowerCase().startsWith((item.key || '').toLowerCase()))
                      .map(k => <option key={k} value={k} />)}
                  </datalist>
                )}
                <input
                  type="search"
                  className="kv-input"
                  placeholder="Key"
                  list={type === 'headers' ? `header-keys-${item.id}` : undefined}
                  value={item.key}
                  onChange={(e) => handleItemChange(item.id, 'key', e.target.value)}
                />
              </td>
              <td>
                {type === 'headers' && getHeaderValueSuggestions(item.key).length > 0 && (
                  <datalist id={`val-suggestions-${item.id}`}>
                    {getHeaderValueSuggestions(item.key).map(s => <option key={s} value={s} />)}
                  </datalist>
                )}
                <input
                  type="search"
                  className="kv-input"
                  placeholder="Value"
                  list={type === 'headers' && getHeaderValueSuggestions(item.key).length > 0 ? `val-suggestions-${item.id}` : undefined}
                  value={item.value}
                  onChange={(e) => handleItemChange(item.id, 'value', e.target.value)}
                />
              </td>
              <td className="kv-action" style={{ width: onSaveToVault ? '96px' : '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  {onSaveToVault && (
                    <button
                      className="btn-secondary"
                      style={{
                        padding: '0.25rem',
                        border: 'none',
                        cursor: (!item.key.trim() && !item.value.trim()) ? 'not-allowed' : 'pointer',
                        color: savedItemId === item.id ? '#10b981' : 'var(--text-secondary)',
                        background: 'transparent',
                        display: 'inline-flex',
                        alignItems: 'center',
                        opacity: (!item.key.trim() && !item.value.trim()) ? 0.3 : 1
                      }}
                      title={savedItemId === item.id ? (language === 'id' ? 'Tersimpan di Key Vault!' : 'Saved to Key Vault!') : (language === 'id' ? 'Simpan ke Key Vault' : 'Save to Key Vault')}
                      onClick={() => handleInitiateSave(item)}
                      disabled={!item.key.trim() && !item.value.trim()}
                      onMouseEnter={(e) => {
                        if (savedItemId !== item.id && (item.key.trim() || item.value.trim())) {
                          e.currentTarget.style.color = '#ffd700';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (savedItemId !== item.id) {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      {savedItemId === item.id ? <Check size={16} strokeWidth={2.5} /> : <Save size={16} />}
                    </button>
                  )}
                  {onSaveToVault && (
                    <button
                      className="btn-secondary"
                      style={{
                        padding: '0.25rem',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ffd700',
                        background: 'transparent',
                        display: 'inline-flex',
                        alignItems: 'center',
                        transition: 'transform 0.15s, color 0.15s'
                      }}
                      title={language === 'id' ? 'Ambil value dari Key Vault (Gembok)' : 'Pick value from Key Vault (Lock)'}
                      onClick={() => {
                        setActivePickerRowId(item.id);
                        setPickerSearchQuery('');
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.2)';
                        e.currentTarget.style.color = '#ffe57f';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.color = '#ffd700';
                      }}
                    >
                      <Lock size={15} strokeWidth={2.4} />
                    </button>
                  )}
                  <button 
                    className="btn-secondary" 
                    style={{ 
                      padding: '0.25rem', 
                      border: 'none', 
                      cursor: 'pointer',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }} 
                    title={language === 'id' ? 'Hapus baris' : 'Remove row'}
                    onClick={() => handleRemove(item.id)}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error-color)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn-secondary" style={{ marginTop: '0.5rem' }} onClick={handleAdd}>+ Add New</button>

      {/* Modal Konfirmasi Simpan ke Key Vault */}
      {pendingSaveItem && (
        <div className="modal-overlay" onClick={() => setPendingSaveItem(null)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ width: '480px', maxWidth: '92vw', display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffae00 100%)',
                  boxShadow: '0 0 8px rgba(255, 215, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1a1a1a'
                }}>
                  <Save size={14} strokeWidth={2.5} />
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {language === 'id' ? 'Simpan ke Key Vault' : 'Save to Key Vault'}
                </div>
              </div>
              <X 
                size={18} 
                style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} 
                onClick={() => setPendingSaveItem(null)} 
              />
            </div>

            {/* Pertanyaan Konfirmasi & Preview Key & Value */}
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.8rem', lineHeight: '1.4' }}>
                {language === 'id' 
                  ? 'Apakah Anda yakin ingin menyimpan key & value ini ke Key & Token Vault?' 
                  : 'Are you sure you want to save this key & value to Key & Token Vault?'}
              </p>
              
              <div style={{ 
                backgroundColor: 'var(--bg-input)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '6px', 
                padding: '0.75rem',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                  <span style={{ color: 'var(--text-secondary)', width: '45px', fontWeight: 'bold' }}>Field:</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--accent-color)', fontWeight: 'bold' }}>
                    {pendingSaveItem.key || '(kosong)'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                  <span style={{ color: 'var(--text-secondary)', width: '45px', fontWeight: 'bold' }}>Value:</span>
                  <span style={{ 
                    fontFamily: 'monospace', 
                    color: 'var(--text-primary)',
                    maxWidth: '360px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }} title={pendingSaveItem.value}>
                    {pendingSaveItem.value || '(kosong)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Input Note (Opsional) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                {language === 'id' ? 'Note / Catatan' : 'Note'} <span style={{ fontWeight: 'normal', opacity: 0.7 }}>({language === 'id' ? 'opsional' : 'optional'})</span>
              </label>
              <input
                type="text"
                className="modal-input"
                placeholder={language === 'id' ? 'Contoh: milik user, token staging, production...' : 'e.g. user token, staging API...'}
                value={noteInput}
                autoFocus
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmSave();
                  }
                }}
                style={{ fontSize: '0.9rem', width: '100%' }}
              />
            </div>

            {/* Tombol Aksi */}
            <div className="modal-actions" style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setPendingSaveItem(null)}
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                {language === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button 
                className="btn-primary" 
                onClick={handleConfirmSave}
                style={{ padding: '0.45rem 1.2rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={14} />
                <span>{language === 'id' ? 'Ya, Simpan' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Picker Gembok: Ambil Value dari Key Vault */}
      {activePickerRowId && (
        <div className="modal-overlay" onClick={() => setActivePickerRowId(null)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ width: '560px', maxWidth: '92vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
          >
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <Lock size={15} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {language === 'id' ? 'Pilih Value dari Key Vault' : 'Select Value from Key Vault'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {language === 'id' 
                      ? 'Pilih salah satu item di bawah untuk mengisi otomatis value pada baris ini.' 
                      : 'Choose an item below to automatically fill the value in this row.'}
                  </div>
                </div>
              </div>
              <X 
                size={18} 
                style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} 
                onClick={() => setActivePickerRowId(null)} 
              />
            </div>

            {/* Filter Search jika > 2 items */}
            {vaultKeys && vaultKeys.length > 2 && (
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="modal-input"
                  placeholder={language === 'id' ? 'Cari field, value, atau note...' : 'Filter field, value, or note...'}
                  value={pickerSearchQuery}
                  autoFocus
                  onChange={(e) => setPickerSearchQuery(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                />
              </div>
            )}

            {/* Daftar Pilihan Key / Value */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px',
              maxHeight: '350px' 
            }}>
              {(!vaultKeys || vaultKeys.length === 0) ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {language === 'id' 
                    ? 'Belum ada key yang disimpan di Key Vault.' 
                    : 'No saved keys found in Key Vault.'}
                </div>
              ) : (() => {
                const query = pickerSearchQuery.trim().toLowerCase();
                const filtered = query 
                  ? vaultKeys.filter(k => 
                      k.field.toLowerCase().includes(query) || 
                      k.value.toLowerCase().includes(query) || 
                      k.note.toLowerCase().includes(query)
                    )
                  : vaultKeys;

                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {language === 'id' ? 'Tidak ada hasil yang cocok.' : 'No matching items found.'}
                    </div>
                  );
                }

                return filtered.map(vk => (
                  <div
                    key={vk.id}
                    onClick={() => handleSelectVaultKey(vk)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-input)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#ffd700';
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-input)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        fontFamily: 'monospace', 
                        color: 'var(--accent-color)', 
                        fontSize: '0.85rem' 
                      }}>
                        {vk.field}
                      </span>
                      {vk.note && (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: 'var(--text-secondary)',
                          fontStyle: 'italic',
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {vk.note}
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.78rem', 
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {vk.value}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Footer Modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setActivePickerRowId(null)}
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                {language === 'id' ? 'Batal' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
