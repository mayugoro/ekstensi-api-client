import React from 'react';
import type { KeyValuePair } from '../types';
import { createEmptyKV } from '../utils';
import { Trash2 } from 'lucide-react';

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
}

export const KeyValueEditor: React.FC<Props> = ({ items, onChange, type = 'params' }) => {
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
            <th style={{ width: '40px' }}></th>
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
              <td className="kv-action">
                <button className="btn-secondary" style={{ padding: '0.25rem', border: 'none' }} onClick={() => handleRemove(item.id)}>
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn-secondary" style={{ marginTop: '0.5rem' }} onClick={handleAdd}>+ Add New</button>
    </div>
  );
};
