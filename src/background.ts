/// <reference types="chrome" />

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'FETCH_API') {
    handleFetch(request.payload).then(sendResponse);
    return true; // Indicates asynchronous response
  }
});

async function handleFetch(payload: any) {
  const { url, method, headers, body } = payload;
  const startTime = Date.now();
  
  try {
    const fetchOptions: RequestInit = {
      method,
      headers: new Headers(headers),
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
    return {
      success: false,
      error: error.message || 'Network error occurred',
      time: Date.now() - startTime,
    };
  }
}
