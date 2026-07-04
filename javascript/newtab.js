// Global cache for extension settings to keep layout rendering fast and synchronous
var settingsCache = {};

function addNewEntryButton(entryArray) {
  var newEntry = $('<div class="entry" id="new_entry" title="Add New"><div><span class="foundicon-plus"></span></div></div>');
  newEntry.on("click", function() {
    showBookmarkEntryForm("New Bookmark or Folder", "", "", "new_entry");
  });
  entryArray.push(newEntry);
}

function addSpeedDialBookmark(bookmark, entryArray) {
  var entry = $('<div id="' + bookmark.id + '" class="entry">' +
          '<a class="bookmark" href="' + bookmark.url + '" title="' + bookmark.title + '">' +
            '<div class="image"></div>' +
            '<table class="details"><tbody><tr>' +
              '<td class="edit" title="Edit"><span class="foundicon-edit"></span></td>' +
              '<td class="title">' + bookmark.title + '</td>' +
              '<td class="remove" title="Remove"><span class="foundicon-remove"></span></td></tr></tbody>' +
            '</table>' +
          '</a>' +
        '</div>');

  entry.find(".image").css("background-image", "url(" + getThumbnailUrl(bookmark) + ")");
  entry.find(".edit").on("click", function(event) {
    event.preventDefault();
    showBookmarkEntryForm("Edit Bookmark: " + bookmark.title, bookmark.title, bookmark.url, bookmark.id);
  });
  entry.find(".remove").on("click", function(event) {
    event.preventDefault();
    if (confirm("Are you sure you want to remove this bookmark?")) {
      removeBookmark(bookmark);
    }
  });

  // Safely grab icon from parsed custom icon object inside settings cache
  var customIconData = safeParseJson(settingsCache["custom_icon_data"]);
  if (customIconData && customIconData[bookmark.url]) {
    entry.find(".image").addClass("custom-icon");
  }

  entryArray.push(entry);
}

function addSpeedDialFolder(bookmark, entryArray) {
  var entry = $('<div class="entry" id="' + bookmark.id + '">' +
          '<a class="bookmark" href="newtab.html#' + bookmark.id + '" title="' + bookmark.title + '" >' +
            '<div class="image"><span class="foundicon-folder"></span></div>' +
            '<table class="details"><tbody><tr>' +
              '<td class="edit" title="Edit"><span class="foundicon-edit"></span></td>' +
              '<td class="title"><div>' + bookmark.title + '</div></td>' +
              '<td class="remove" title="Remove"><span class="foundicon-remove"></span></td></tr></tbody>' +
            '</table>' +
          '</a>' +
        '</div>');

  entry.find(".edit").on("click", function(event) {
    event.preventDefault();
    showBookmarkEntryForm("Edit Folder: " + bookmark.title, bookmark.title, bookmark.url, bookmark.id);
  });
  entry.find(".remove").on("click", function(event) {
    event.preventDefault();
    if (confirm("Are you sure you want to remove this folder including all of it's bookmarks?")) {
      removeFolder(bookmark.id);
    }
  });

  entryArray.push(entry);
}

function setDialStyles() {
  var dialColumns = settingsCache["dial_columns"] || 4;
  var dialWidth = settingsCache["dial_width"] || 80;
  var folderColor = settingsCache["folder_color"] || "#333";
  var adjustedDialWidth = window.innerWidth * (dialWidth / 100);
  var borderWidth = 14;
  var minEntryWidth = 120 - borderWidth;
  var entryWidth = (adjustedDialWidth / dialColumns) - borderWidth;

  if (entryWidth < minEntryWidth) {
    entryWidth = minEntryWidth;
  }

  $("#styles").html(
    "#dial { width:" + (adjustedDialWidth | 0) + "px; } " +
    ".entry { height:" + (entryWidth * 0.75 | 0) + "px; width:" + (entryWidth | 0) + "px; } " +
    "td.title { max-width:" + (entryWidth - 50 | 0) + "px; } " +
    ".image { height:" + ((entryWidth * 0.75) - 20 | 0) + "px; } " +
    ".foundicon-folder { font-size:" + (entryWidth * 0.5 | 0) + "px; top:" + (entryWidth * 0.05 | 0) + "px; color:" + folderColor + " } " +
    ".foundicon-plus { font-size:" + (entryWidth * 0.3 | 0) + "px; top:" + (entryWidth * 0.18 | 0) + "px; } "
  );
}

function createSpeedDial(folderId) {
  setDialStyles();

  chrome.bookmarks.getSubTree(folderId, function(node) {
    var entryArray = [];
    (node[0].children).forEach(function(bookmark) {
      if (bookmark.url !== undefined) {
        addSpeedDialBookmark(bookmark, entryArray);
      }
      if (bookmark.children !== undefined && String(settingsCache["show_subfolder_icons"]) === "true") {
        addSpeedDialFolder(bookmark, entryArray);
      }
    });

    if (String(settingsCache["show_new_entry"]) === "true") {
      addNewEntryButton(entryArray);
    }

    $("#dial").html(entryArray).prop("folderId", folderId);
    alignVertical();

    if (String(settingsCache["show_options_gear"]) === "true" && $("#options").children().length === 0) {
      $("#options").append($('<a class="foundicon-settings" href="options.html" title="Options"></a>'));
    }

    if (String(settingsCache["drag_and_drop"]) === "true") {
      $("#dial").sortable({
        items: ".entry:not(#new_entry)"
      }).on("sortupdate", function() {
        updateBookmarksOrder();
      });
    }
  });
}

// Rewritten to completely drop third-party rendering services 
// and only resolve clean URLs supplied by the user.
function getThumbnailUrl(bookmark) {
  var customIconData = safeParseJson(settingsCache["custom_icon_data"]);
  if (customIconData && customIconData[bookmark.url]) {
    return customIconData[bookmark.url];
  }
  // Fallback placeholder transparent pixel if no custom image link is explicitly set
  return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
}

function showBookmarkEntryForm(heading, title, url, target) {
  var form = $("#bookmark_form");
  var customIconData = safeParseJson(settingsCache["custom_icon_data"]) || {};

  form.find("h1").html(heading);
  form.find(".title").prop("value", title);
  form.find(".url").prop("value", url || "");
  form.find(".icon").prop("value", customIconData[url] || "");
  form.prop("target", target);

  if (form.find("h1").text().indexOf("Edit Folder") > -1) {
    form.find("p").eq(1).hide();
    form.find("p").eq(2).hide();
  }
  if (form.find("h1").text().indexOf("New") > -1) {
    form.find("p").eq(2).hide();
  }

  form.reveal();
  form.find(".title").focus();
  form.on("reveal:close", function() {
    form.find("p").show();
  });
}

function updateCustomIcon(url, old_url) {
  var icon_object = safeParseJson(settingsCache["custom_icon_data"]) || {};
  var icon_url = $("#bookmark_form .icon").prop("value").trim();

  icon_object[url] = icon_url;

  if (url !== old_url) {
    delete icon_object[old_url];
  }

  if (icon_url.length === 0 || url.trim().length === 0) {
    delete icon_object[url];
    delete icon_object[old_url];
  }

  // Update both cache and storage
  settingsCache["custom_icon_data"] = JSON.stringify(icon_object);
  chrome.storage.local.set({ "custom_icon_data": JSON.stringify(icon_object) }, function() {
    if (String(settingsCache["enable_sync"]) === "true") {
      syncToStorage();
    }
    createSpeedDial(getStartingFolder());
  });
}

function alignVertical() {
  if (String(settingsCache["center_vertically"]) === "true") {
    var dial = $("#dial");
    if (String(settingsCache["show_folder_list"]) === "true") {
      dial.css("padding-top", ((window.innerHeight - dial.height()) / 2) - 50 | 0);
    } else {
      dial.css("padding-top", (window.innerHeight - dial.height()) / 2 | 0);
    }
  }
}

// Quick helper to avoid JSON string parse exceptions
function safeParseJson(str) {
  try {
    return str ? JSON.parse(str) : {};
  } catch (e) {
    return {};
  }
}

// Entry Point loaded asynchronously via chrome.storage.local
document.addEventListener("DOMContentLoaded", function() {
  
  // First, verify and fetch everything from storage to hydrate the cache safely
  ensureDefaultsAndInit(function() {
    // Sync the local file cache with the global common settings layout
    if (typeof commonSettingsCache !== 'undefined') {
      settingsCache = commonSettingsCache;
    } else {
      settingsCache = {};
    }
    
    // Now that variables are safe to read, execute native setup
    initialize(); 
    createSpeedDial(getStartingFolder());

    $("#bookmark_form .title, #bookmark_form .url, #bookmark_form .icon").on("keydown", function(e) {
      if (e.which === 13) {
        $("#bookmark_form button").trigger("click");
      }
    });

    $("#bookmark_form button").on("click", function() {
      var target = $("#bookmark_form").prop("target");
      var title = $("#bookmark_form .title").prop("value").trim();
      var url = $("#bookmark_form .url").prop("value").trim();

      if (target === "new_entry") {
        addBookmark(title, url);
      } else {
        updateBookmark(target, title, url);
      }
    });

    $(document.body).on("keypress", function(e) {
      if (document.activeElement.type !== "text") {
        var key = String.fromCharCode(e.which);
        if (key >= 1 && key <= 9) {
          if ($(".bookmark").eq(key - 1).length !== 0) {
            window.location = $(".bookmark").get(key - 1).href;
          }
        }
        if (key === "o" || key === "s") {
          window.location = "options.html";
        }
      }
    });

    $(window).on("resize", function() {
      setDialStyles();
      alignVertical();
    });

    $(window).on("hashchange", function() {
      createSpeedDial(getStartingFolder());
    });

    $.get().done(function() {
      $("#foundicons").prop("href", "css/general_foundicons.css");
    });
  });
});

// Listener tracking configurations broadcasted from your background service worker
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "reload_settings") {
    chrome.storage.local.get(null, function(items) {
      settingsCache = items || {};
      createSpeedDial(getStartingFolder());
    });
  }
});