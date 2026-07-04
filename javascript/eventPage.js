// Restore settings from chrome.storage.sync to chrome.storage.local
function restoreFromSync() {
  chrome.storage.sync.get(null, function (sync_object) {
    if (chrome.runtime.lastError) return;

    // Save everything directly into local extension storage instead of localStorage
    chrome.storage.local.set(sync_object, function() {
      // Notify all open extension tabs (like New Tab page) to update their UI
      chrome.runtime.sendMessage({ action: "reload_settings" });
    });
  });
}

// Sync settings from chrome.storage.local to chrome.storage.sync
function syncToStorage() {
  chrome.storage.local.get(null, function(local_object) {
    if (chrome.runtime.lastError) return;
    chrome.storage.sync.set(local_object);
  });
}

// Listen for sync changes from other signed-in devices
chrome.storage.onChanged.addListener(function (changes, areaName) {
  // Only react if the change happened in 'sync' and sync is globally enabled
  if (areaName === "sync") {
    chrome.storage.local.get("enable_sync", function(data) {
      if (data.enable_sync === "true" || data.enable_sync === true) {
        restoreFromSync();
      }
    });
  }
});