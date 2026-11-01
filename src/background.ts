/// <reference types="chrome" />

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});

const activeFetches = new Map<string, AbortController>();

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'FETCH_API') {
    handleFetch(request.payload).then(sendResponse);
    return true; // Indicates asynchronous response
  }
  if (request.type === 'CANCEL_FETCH') {
    const { requestId } = request;
    if (requestId && activeFetches.has(requestId)) {
      activeFetches.get(requestId)?.abort();
      activeFetches.delete(requestId);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
    return true;
  }
});

async function handleFetch(payload: any) {
  const { requestId, url, method, headers, body } = payload;
  const startTime = Date.now();
  
  const controller = new AbortController();
  if (requestId) {
    activeFetches.set(requestId, controller);
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: new Headers(headers),
      signal: controller.signal
    };
    
    if (method !== 'GET' && method !== 'HEAD' && body) {
      fetchOptions.body = body;
    }
    
    const response = await fetch(url, fetchOptions);
    const time = Date.now() - startTime;
    
    let resBody = await response.text();
    let size = resBody.length; // Approximate size in bytes
    
    const resHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      resHeaders[key] = value;
    });
    
    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      time,
      size,
      headers: resHeaders,
      body: resBody
    };
  } catch (error: any) {
    const isAborted = error.name === 'AbortError' || controller.signal.aborted;
    return {
      success: false,
      error: isAborted ? 'Request cancelled' : (error.message || 'Network error occurred'),
      time: Date.now() - startTime,
    };
  } finally {
    if (requestId) {
      activeFetches.delete(requestId);
    }
  }
}
