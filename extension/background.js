// Background Service Worker
// Listen for specific messages if needed, e.g., for cross-origin fetches or complex downloads
// Currently standard chrome.downloads API in content script might need permission adjustment or messaging

chrome.runtime.onInstalled.addListener(() => {
    console.log("XDrive Helper Installed");
});
