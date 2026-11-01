import { v4 as uuidv4 } from 'uuid';
import type { RequestConfig, KeyValuePair, ResponseDetails } from './types';

export const createEmptyRequest = (): RequestConfig => ({
  id: uuidv4(),
  method: 'GET',
  url: '',
  queryParams: [],
  headers: [],
  body: '',
  authType: 'none',
  authConfig: {},
});

export const createEmptyKV = (): KeyValuePair => ({
  id: uuidv4(),
  key: '',
  value: '',
  active: true,
});

export const parseUrlAndParams = (url: string, queryParams: KeyValuePair[]) => {
  try {
    const urlObj = new URL(url.includes('://') ? url : `http://${url}`);
    
    // Add params from KV
    const activeParams = queryParams.filter(p => p.active && p.key);
    activeParams.forEach(p => {
      urlObj.searchParams.append(p.key, p.value);
    });
    
    return urlObj.toString();
  } catch (e) {
    // Fallback if invalid URL
    if (queryParams.filter(p => p.active && p.key).length > 0) {
      const qs = queryParams.filter(p => p.active && p.key).map(p => `${p.key}=${p.value}`).join('&');
      return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
    }
  }
};

export const t = (lang: string, key: string): string => {
  const translations: Record<string, Record<string, string>> = {
    en: {
      history: 'History',
      collections: 'Collections',
      saved: 'Saved',
      noHistory: 'No history yet',
      noSaved: 'No saved requests yet',
      untitledReq: 'Untitled Request',
      enterUrl: 'Enter request URL',
      send: 'Send',
      sending: 'Sending...',
      saveReq: 'Save Request',
      delReq: 'Delete Request',
      cancel: 'Cancel',
      save: 'Save',
      del: 'Delete',
      status: 'Status',
      time: 'Time',
      size: 'Size',
      type: 'Type',
      token: 'Token',
      username: 'Username',
      password: 'Password',
      key: 'Key',
      value: 'Value',
      addTo: 'Add to',
      paste: 'Paste',
      pretty: 'Pretty',
      invalidJson: 'Invalid JSON',
      settings: 'Settings',
      themeColor: 'Theme Color',
      language: 'Language',
      fontStyle: 'Font Style',
      delConfirmPrefix: 'Are you sure you want to delete the request',
      delConfirmSuffix: 'from the folder',
      saveErrorPrefix: 'Failed: A request named',
      saveErrorSuffix: 'already exists in folder',
      folderCol: 'Folder / Collection',
      reqName: 'Request Name',
      headersTab: 'Headers',
      bodyTab: 'Body',
      authTab: 'Authorization',
      paramsTab: 'Params',
      rawTab: 'Raw',
      cleanupHistoryTitle: 'Clean up history',
      cleanupHistoryDesc: 'Deleting old history entries can make the Addon faster and free up some space.',
      deleteLargeEntries: 'Delete large entries',
      entriesOver1KB: 'entries over 1KB',
      deleteOldestEntries: 'Delete oldest entries:',
      entry: 'entry',
      entries: 'entries',
      deleteEntriesBtn: 'Delete Entries',
      searchHistoryPlaceholder: 'Search history by URL, name, or folder...',
      noHistoryFound: 'No history entries found',
      loadAllBtn: 'LOAD ALL (THIS MAY TAKE A WHILE)',
      deleteEntryTitle: 'Delete entry',
      viewAllHistoryIconTitle: 'View all history',
      copyCurl: 'Copy cURL & Response',
      copied: 'Copied!'
    },
    id: {
      history: 'Riwayat',
      collections: 'Koleksi',
      saved: 'Tersimpan',
      noHistory: 'Belum ada riwayat',
      noSaved: 'Belum ada request tersimpan',
      untitledReq: 'Request Tanpa Nama',
      enterUrl: 'Masukkan URL request',
      send: 'Kirim',
      sending: 'Mengirim...',
      saveReq: 'Simpan Request',
      delReq: 'Hapus Request',
      cancel: 'Batal',
      save: 'Simpan',
      del: 'Hapus',
      status: 'Status',
      time: 'Waktu',
      size: 'Ukuran',
      type: 'Tipe',
      token: 'Token',
      username: 'Username',
      password: 'Password',
      key: 'Kunci (Key)',
      value: 'Nilai (Value)',
      addTo: 'Tambahkan ke',
      paste: 'Tempel',
      pretty: 'Rapihkan',
      invalidJson: 'JSON Tidak Valid',
      settings: 'Pengaturan',
      themeColor: 'Tema Warna',
      language: 'Bahasa',
      fontStyle: 'Gaya Font (Tipografi)',
      delConfirmPrefix: 'Apakah kamu yakin ingin menghapus request',
      delConfirmSuffix: 'dari folder',
      saveErrorPrefix: 'Gagal: Request bernama',
      saveErrorSuffix: 'sudah ada di folder',
      folderCol: 'Folder / Koleksi',
      reqName: 'Nama Request',
      headersTab: 'Header',
      bodyTab: 'Isi (Body)',
      authTab: 'Otorisasi',
      paramsTab: 'Parameter',
      rawTab: 'Mentah (Raw)',
      cleanupHistoryTitle: 'Bersihkan riwayat',
      cleanupHistoryDesc: 'Menghapus riwayat lama bisa membuat Addon lebih cepat dan menghemat ruang penyimpanan.',
      deleteLargeEntries: 'Hapus entri berukuran besar',
      entriesOver1KB: 'entri di atas 1KB',
      deleteOldestEntries: 'Hapus entri terlama:',
      entry: 'entri',
      entries: 'entri',
      deleteEntriesBtn: 'Hapus Entri',
      searchHistoryPlaceholder: 'Cari riwayat berdasarkan URL, nama, atau folder...',
      noHistoryFound: 'Tidak ada entri riwayat yang ditemukan',
      loadAllBtn: 'MUAT SEMUA (MUNGKIN MEMBUTUHKAN WAKTU LAMA)',
      deleteEntryTitle: 'Hapus entri',
      viewAllHistoryIconTitle: 'Lihat semua riwayat',
      copyCurl: 'Salin cURL & Response',
      copied: 'Tersalin!'
    }
  };

  return translations[lang]?.[key] || translations['en'][key] || key;
};

export const getHttpStatusText = (status?: number): string => {
  if (!status) return '';
  const statusCodes: Record<number, string> = {
    100: 'Continue',
    101: 'Switching Protocols',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests (Rate Limit)',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  return statusCodes[status] || 'Unknown Status';
};

export const generateCurlWithResponse = (request: RequestConfig, response?: ResponseDetails): string => {
  // 1. URL & Query Params
  let finalUrl = parseUrlAndParams(request.url, request.queryParams) || request.url || '';

  // Auth: apikey with 'query'
  if (request.authType === 'apikey' && request.authConfig?.in === 'query' && request.authConfig?.key) {
    const separator = finalUrl.includes('?') ? '&' : '?';
    finalUrl += `${separator}${encodeURIComponent(request.authConfig.key)}=${encodeURIComponent(request.authConfig.value || '')}`;
  }

  const lines: string[] = [];
  const method = request.method || 'GET';
  lines.push(`curl --location --request ${method} '${finalUrl.replace(/'/g, "'\\''")}'`);

  // 2. Headers
  const activeHeaders = (request.headers || []).filter(h => h.active && h.key && h.key.trim() !== '');
  activeHeaders.forEach(h => {
    lines.push(`  --header '${h.key.replace(/'/g, "'\\''")}: ${h.value.replace(/'/g, "'\\''")}'`);
  });

  // Auth: Bearer, Basic, apikey in header
  if (request.authType === 'bearer' && request.authConfig?.token) {
    lines.push(`  --header 'Authorization: Bearer ${request.authConfig.token.replace(/'/g, "'\\''")}'`);
  } else if (request.authType === 'basic' && request.authConfig?.username) {
    const credentials = btoa(`${request.authConfig.username}:${request.authConfig.password || ''}`);
    lines.push(`  --header 'Authorization: Basic ${credentials}'`);
  } else if (request.authType === 'apikey' && request.authConfig?.in !== 'query' && request.authConfig?.key) {
    lines.push(`  --header '${request.authConfig.key.replace(/'/g, "'\\''")}: ${(request.authConfig.value || '').replace(/'/g, "'\\''")}'`);
  }

  // 3. Body
  if (request.method !== 'GET' && request.body && request.body.trim() !== '') {
    lines.push(`  --data-raw '${request.body.replace(/'/g, "'\\''")}'`);
  }

  const curlCommand = lines.join(' \\\n');

  // 4. Response Snippet
  let responsePart = '';
  if (!response) {
    responsePart = '\n\n# Response: (Belum ada response / request belum dikirim)';
  } else {
    const statusText = response.status 
      ? `${response.status} ${response.statusText || getHttpStatusText(response.status)}`
      : (response.success ? 'Success' : 'Error');
    const timeText = response.time !== undefined ? ` - ${response.time}ms` : '';
    const sizeText = response.size ? ` - ${(response.size / 1024).toFixed(2)} KB` : '';
    
    responsePart = `\n\n# Response (${statusText}${timeText}${sizeText}):\n`;

    let bodyStr = '';
    if (response.body !== undefined && response.body !== null) {
      if (typeof response.body === 'object') {
        try {
          bodyStr = JSON.stringify(response.body, null, 2);
        } catch {
          bodyStr = String(response.body);
        }
      } else if (typeof response.body === 'string') {
        const trimmed = response.body.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            bodyStr = JSON.stringify(JSON.parse(response.body), null, 2);
          } catch {
            bodyStr = response.body;
          }
        } else {
          bodyStr = response.body;
        }
      } else {
        bodyStr = String(response.body);
      }
    }

    if (response.error) {
      bodyStr = bodyStr ? `Error: ${response.error}\n${bodyStr}` : `Error: ${response.error}`;
    }

    if (bodyStr.trim() !== '') {
      const splitLines = bodyStr.split(/\r?\n/);
      const maxLines = 15;
      const previewLines = splitLines.slice(0, maxLines);
      const isTruncated = splitLines.length > maxLines;

      const commented = previewLines.map(line => `# ${line}`).join('\n');
      responsePart += commented;
      if (isTruncated) {
        responsePart += `\n# ... [sisa ${splitLines.length - maxLines} baris dipotong]`;
      }
    } else {
      responsePart += '# (Empty response body)';
    }
  }

  return curlCommand + responsePart;
};
