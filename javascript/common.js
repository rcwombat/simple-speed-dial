// Shared runtime cache populated during initialization
var commonSettingsCache = {};

// Generates a list of all folders under chrome bookmarks
function generateFolderList() {
  if (String(commonSettingsCache["show_folder_list"]) === "true" || window.location.pathname === "/options.html") {

    chrome.bookmarks.getTree(function(rootNode) {
      var folderList = [], openList = [], node, child;
      // Never more than 2 root nodes, push both Bookmarks Bar & Other Bookmarks into array
      openList.push(rootNode[0].children[0]);
      openList.push(rootNode[0].children[1]);

      while ((node = openList.pop()) !== undefined) {
        if (node.children !== undefined) {
          if (node.parentId === "0") {
            node.path = ""; // Root elements have no parent so shouldn't show their path
          }
          node.path += node.title;
          while ((child = node.children.pop()) !== undefined) {
            if (child.children !== undefined) {
              child.path = node.path + "/";
              openList.push(child);
            }
          }
          folderList.push(node);
        }
      }

      folderList.sort(function(a, b) {
        return a.path.localeCompare(b.path);
      });

      var folderListHtml = $('<select id="folder_list"></select>');
      folderList.forEach(function(item) {
        folderListHtml.append(new Option(item.path, item.id));
      });
      $("#folder").html(folderListHtml);
      $("#folder_list").prop("value", getStartingFolder())
          .on("change", function() {
            window.location.hash = $("#folder_list").prop("value");
      });
    });
  }
}

function getStartingFolder() {
  var folderId = commonSettingsCache["default_folder_id"] || "1";
  // Allow the url to specify the folder as well
  if (window.location.hash !== "") {
    folderId = window.location.hash.substring(1);
  }
  return folderId;
}

// Create default chrome.storage.local values if they don't already exist
function ensureDefaultsAndInit(callback) {
  var default_values = {
    background_color: "#cccccc",
    custom_icon_data: "{}",
    center_vertically: "true",
    default_folder_id: "1",
    dial_columns: "6",
    dial_width: "70",
    drag_and_drop: "true",
    enable_sync: "false",
    folder_color: "#888888",
    show_advanced: "false",
    show_folder_list: "true",
    show_new_entry: "true",
    show_options_gear: "true",
    show_subfolder_icons: "true"
  };

  chrome.storage.local.get(null, function(items) {
    var updatesNeeded = false;
    var currentSettings = items || {};

    Object.keys(default_values).forEach(function(name) {
      if (currentSettings[name] === undefined || currentSettings[name] === null) {
        currentSettings[name] = default_values[name];
        updatesNeeded = true;
      }
    });

    if (updatesNeeded) {
      chrome.storage.local.set(currentSettings, function() {
        commonSettingsCache = currentSettings;
        callback();
      });
    } else {
      commonSettingsCache = currentSettings;
      callback();
    }
  });
}

// Initialization routines wrapped cleanly for modern async invocation
function initialize() {
  // Sets standard body styling backgrounds dynamically from runtime state cache
  document.body.style.backgroundColor = commonSettingsCache["background_color"] || "#cccccc";
  generateFolderList();
}