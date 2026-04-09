(function () {
  "use strict";

  const DB_IDB_KEY = "nimbus-guide-comments-db";
  const IDB_NAME = "nimbus-guide-db-store";
  const IDB_STORE = "databases";
  const STATUS_OPTIONS = ["Not Started", "In Progress", "Completed", "Blocked"];
  const STATUS_COLORS = {
    "Not Started": "#787774",
    "In Progress": "#d9730d",
    Completed: "#0f7b0f",
    Blocked: "#e03e3e",
  };

  function injectStyles() {
    if (document.getElementById("comments-js-styles")) return;
    const style = document.createElement("style");
    style.id = "comments-js-styles";
    style.textContent = `
      .cmt-widget { font-family: 'Inter', sans-serif; color: #37352f; max-width: 820px; margin: 2rem auto; }
      .cmt-section { background: #fff; border: 1px solid #e3e2de; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
      .cmt-section-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
      .cmt-section-header h3 { margin: 0; font-size: 1.1rem; font-weight: 600; }
      .cmt-count { background: #f7f6f3; color: #787774; font-size: 0.75rem; font-weight: 500; padding: 2px 8px; border-radius: 10px; }
      .cmt-input-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
      .cmt-input, .cmt-textarea { font-family: inherit; font-size: 0.9rem; padding: 8px 12px; border: 1px solid #e3e2de; border-radius: 6px; background: #fff; color: #37352f; outline: none; transition: border-color 0.15s; }
      .cmt-input:focus, .cmt-textarea:focus { border-color: #a8a7a3; }
      .cmt-textarea { resize: vertical; min-height: 60px; }
      .cmt-row { display: flex; gap: 0.5rem; }
      .cmt-row .cmt-input { flex: 1; }
      .cmt-btn { font-family: inherit; font-size: 0.85rem; font-weight: 500; padding: 6px 14px; border: none; border-radius: 6px; cursor: pointer; transition: background 0.15s, opacity 0.15s; }
      .cmt-btn-primary { background: #37352f; color: #fff; }
      .cmt-btn-primary:hover { opacity: 0.85; }
      .cmt-btn-secondary { background: #f7f6f3; color: #37352f; border: 1px solid #e3e2de; }
      .cmt-btn-secondary:hover { background: #eeedea; }
      .cmt-btn-danger { background: none; color: #787774; font-size: 0.8rem; padding: 2px 6px; }
      .cmt-btn-danger:hover { color: #e03e3e; }
      .cmt-list { list-style: none; padding: 0; margin: 0; }
      .cmt-item { padding: 0.75rem 0; border-bottom: 1px solid #f0efec; display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; }
      .cmt-item:last-child { border-bottom: none; }
      .cmt-item-body { flex: 1; min-width: 0; }
      .cmt-meta { font-size: 0.78rem; color: #787774; margin-bottom: 2px; }
      .cmt-meta strong { color: #37352f; font-weight: 600; }
      .cmt-text { font-size: 0.9rem; white-space: pre-wrap; word-break: break-word; }
      .cmt-empty { color: #787774; font-size: 0.85rem; font-style: italic; padding: 0.5rem 0; }

      /* Action Items */
      .ai-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
      .ai-table th { text-align: left; padding: 6px 8px; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #787774; border-bottom: 1px solid #e3e2de; }
      .ai-table td { padding: 8px; border-bottom: 1px solid #f0efec; vertical-align: top; }
      .ai-table tr:last-child td { border-bottom: none; }
      .ai-badge { display: inline-block; font-size: 0.75rem; font-weight: 500; padding: 2px 8px; border-radius: 4px; color: #fff; cursor: pointer; user-select: none; white-space: nowrap; transition: opacity 0.15s; }
      .ai-badge:hover { opacity: 0.8; }
      .ai-editable { cursor: text; border-radius: 3px; padding: 1px 3px; min-height: 1.2em; }
      .ai-editable:hover { background: #f7f6f3; }
      .ai-editable:focus { background: #f7f6f3; outline: 1px solid #e3e2de; }
      .ai-notes { max-width: 200px; white-space: pre-wrap; word-break: break-word; }
      .ai-form { background: #f7f6f3; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
      .ai-form-row { display: flex; gap: 0.5rem; }
      .ai-form-row .cmt-input, .ai-form-row select { flex: 1; }
      .ai-form select { font-family: inherit; font-size: 0.9rem; padding: 8px 12px; border: 1px solid #e3e2de; border-radius: 6px; background: #fff; color: #37352f; outline: none; }
      .ai-form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
      .cmt-error { background: #fdf0ef; color: #e03e3e; padding: 0.75rem 1rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 1rem; }
    `;
    document.head.appendChild(style);
  }

  /* ---- IndexedDB helpers ---- */

  function idbOpen() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function idbLoad() {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, "readonly");
        var store = tx.objectStore(IDB_STORE);
        var req = store.get(DB_IDB_KEY);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbSave(data) {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, "readwrite");
        var store = tx.objectStore(IDB_STORE);
        var req = store.put(data, DB_IDB_KEY);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  /* ---- Database layer ---- */

  var _db = null;

  function saveDb() {
    if (!_db) return Promise.resolve();
    var data = _db.export();
    var buf = new Uint8Array(data);
    return idbSave(buf).catch(function (e) {
      console.error("Failed to persist DB to IndexedDB:", e);
    });
  }

  function initDb(SQL) {
    return idbLoad()
      .catch(function () { return null; })
      .then(function (saved) {
        if (saved) {
          _db = new SQL.Database(new Uint8Array(saved));
        } else {
          _db = new SQL.Database();
        }
        _db.run(
          "CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, page TEXT NOT NULL, author TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)"
        );
        _db.run(
          "CREATE TABLE IF NOT EXISTS action_items (id INTEGER PRIMARY KEY AUTOINCREMENT, page TEXT NOT NULL, title TEXT NOT NULL, owner TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Not Started', timeline TEXT DEFAULT '', notes TEXT DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
        );
        return saveDb();
      });
  }

  function getPage() {
    return window.location.pathname;
  }

  function now() {
    return new Date().toISOString();
  }

  function query(sql, params) {
    var stmt = _db.prepare(sql);
    if (params) stmt.bind(params);
    var rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  function run(sql, params) {
    _db.run(sql, params);
    return saveDb();
  }

  /* ---- Rendering ---- */

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "className") e.className = attrs[k];
      else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    if (children != null) {
      if (Array.isArray(children)) children.forEach(function (c) {
        if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
      else if (typeof children === "string") e.textContent = children;
      else e.appendChild(children);
    }
    return e;
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
        " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch (_) { return iso; }
  }

  /* ---- Comments ---- */

  function getComments() {
    return query("SELECT * FROM comments WHERE page = ? ORDER BY created_at DESC", [getPage()]);
  }

  function addComment(author, body) {
    return run("INSERT INTO comments (page, author, body, created_at) VALUES (?, ?, ?, ?)", [getPage(), author, body, now()]);
  }

  function deleteComment(id) {
    return run("DELETE FROM comments WHERE id = ?", [id]);
  }

  function renderComments(container) {
    var comments = getComments();
    container.innerHTML = "";

    var header = el("div", { className: "cmt-section-header" }, [
      el("h3", null, "Comments"),
      el("span", { className: "cmt-count" }, String(comments.length)),
    ]);
    container.appendChild(header);

    var authorInput = el("input", { className: "cmt-input", placeholder: "Your name", type: "text" });
    var bodyInput = el("textarea", { className: "cmt-textarea", placeholder: "Write a comment\u2026" });

    var saved = localStorage.getItem("cmt-author");
    if (saved) authorInput.value = saved;

    var addBtn = el("button", {
      className: "cmt-btn cmt-btn-primary",
      onClick: function () {
        var a = authorInput.value.trim();
        var b = bodyInput.value.trim();
        if (!a || !b) return;
        localStorage.setItem("cmt-author", a);
        addComment(a, b).then(function () {
          bodyInput.value = "";
          renderComments(container);
        });
      },
    }, "Add Comment");

    container.appendChild(el("div", { className: "cmt-input-group" }, [
      el("div", { className: "cmt-row" }, [authorInput]),
      bodyInput,
      el("div", { className: "cmt-row" }, [addBtn]),
    ]));

    if (comments.length === 0) {
      container.appendChild(el("p", { className: "cmt-empty" }, "No comments yet."));
      return;
    }

    var list = el("ul", { className: "cmt-list" });
    comments.forEach(function (c) {
      var delBtn = el("button", {
        className: "cmt-btn cmt-btn-danger",
        title: "Delete comment",
        onClick: function () {
          deleteComment(c.id).then(function () { renderComments(container); });
        },
      }, "\u00d7");

      var item = el("li", { className: "cmt-item" }, [
        el("div", { className: "cmt-item-body" }, [
          el("div", { className: "cmt-meta" }, [
            el("strong", null, c.author),
            document.createTextNode(" \u00b7 " + formatDate(c.created_at)),
          ]),
          el("div", { className: "cmt-text" }, c.body),
        ]),
        delBtn,
      ]);
      list.appendChild(item);
    });
    container.appendChild(list);
  }

  /* ---- Action Items ---- */

  function getActionItems() {
    return query("SELECT * FROM action_items WHERE page = ? ORDER BY created_at DESC", [getPage()]);
  }

  function addActionItem(title, owner, status, timeline, notes) {
    var t = now();
    return run(
      "INSERT INTO action_items (page, title, owner, status, timeline, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [getPage(), title, owner, status, timeline, notes, t, t]
    );
  }

  function updateActionItemField(id, field, value) {
    var allowed = ["title", "owner", "status", "timeline", "notes"];
    if (allowed.indexOf(field) === -1) return Promise.resolve();
    return run(
      "UPDATE action_items SET " + field + " = ?, updated_at = ? WHERE id = ?",
      [value, now(), id]
    );
  }

  function deleteActionItem(id) {
    return run("DELETE FROM action_items WHERE id = ?", [id]);
  }

  function cycleStatus(current) {
    var idx = STATUS_OPTIONS.indexOf(current);
    return STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length];
  }

  function renderActionItems(container) {
    var items = getActionItems();
    container.innerHTML = "";

    var formVisible = false;

    var header = el("div", { className: "cmt-section-header" }, [
      el("h3", null, "Action Items"),
      el("span", { className: "cmt-count" }, String(items.length)),
    ]);
    container.appendChild(header);

    var formWrapper = el("div");
    container.appendChild(formWrapper);

    var addBtn = el("button", {
      className: "cmt-btn cmt-btn-secondary",
      style: "margin-bottom: 1rem",
      onClick: function () {
        formVisible = !formVisible;
        renderForm();
      },
    }, "+ Add Action Item");
    container.appendChild(addBtn);

    function renderForm() {
      formWrapper.innerHTML = "";
      if (!formVisible) return;

      var titleIn = el("input", { className: "cmt-input", placeholder: "Title", type: "text" });
      var ownerIn = el("input", { className: "cmt-input", placeholder: "Owner", type: "text" });
      var statusSel = el("select");
      STATUS_OPTIONS.forEach(function (s) {
        var opt = el("option", { value: s }, s);
        statusSel.appendChild(opt);
      });
      var timelineIn = el("input", { className: "cmt-input", placeholder: "Timeline / Deadline", type: "text" });
      var notesIn = el("textarea", { className: "cmt-textarea", placeholder: "Notes" });

      var saveBtn = el("button", {
        className: "cmt-btn cmt-btn-primary",
        onClick: function () {
          var t = titleIn.value.trim();
          if (!t) return;
          addActionItem(t, ownerIn.value.trim(), statusSel.value, timelineIn.value.trim(), notesIn.value.trim())
            .then(function () { renderActionItems(container); });
        },
      }, "Save");

      var cancelBtn = el("button", {
        className: "cmt-btn cmt-btn-secondary",
        onClick: function () { formVisible = false; renderForm(); },
      }, "Cancel");

      formWrapper.appendChild(el("div", { className: "ai-form" }, [
        el("div", { className: "ai-form-row" }, [titleIn, ownerIn]),
        el("div", { className: "ai-form-row" }, [statusSel, timelineIn]),
        notesIn,
        el("div", { className: "ai-form-actions" }, [cancelBtn, saveBtn]),
      ]));
    }

    if (items.length === 0) {
      container.appendChild(el("p", { className: "cmt-empty" }, "No action items yet."));
      return;
    }

    var table = el("table", { className: "ai-table" });
    var thead = el("thead");
    var headRow = el("tr");
    ["Title", "Owner", "Status", "Timeline", "Notes", ""].forEach(function (h) {
      headRow.appendChild(el("th", null, h));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el("tbody");
    items.forEach(function (item) {
      var tr = el("tr");

      function editableCell(field, value, extraClass) {
        var td = el("td");
        var span = el("span", {
          className: "ai-editable" + (extraClass ? " " + extraClass : ""),
          contenteditable: "true",
          onBlur: function () {
            var newVal = span.textContent.trim();
            if (newVal !== value) {
              updateActionItemField(item.id, field, newVal);
              value = newVal;
            }
          },
          onKeydown: function (e) {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); span.blur(); }
          },
        }, value || "\u00a0");
        td.appendChild(span);
        return td;
      }

      tr.appendChild(editableCell("title", item.title));
      tr.appendChild(editableCell("owner", item.owner));

      var statusTd = el("td");
      var badge = el("span", {
        className: "ai-badge",
        style: "background:" + (STATUS_COLORS[item.status] || "#787774"),
        onClick: function () {
          var next = cycleStatus(item.status);
          updateActionItemField(item.id, "status", next).then(function () {
            renderActionItems(container);
          });
        },
      }, item.status);
      statusTd.appendChild(badge);
      tr.appendChild(statusTd);

      tr.appendChild(editableCell("timeline", item.timeline));
      tr.appendChild(editableCell("notes", item.notes, "ai-notes"));

      var delTd = el("td");
      delTd.appendChild(el("button", {
        className: "cmt-btn cmt-btn-danger",
        title: "Delete action item",
        onClick: function () {
          deleteActionItem(item.id).then(function () { renderActionItems(container); });
        },
      }, "\u00d7"));
      tr.appendChild(delTd);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  /* ---- Main init ---- */

  function initComments(containerId) {
    injectStyles();

    var root = document.getElementById(containerId);
    if (!root) {
      console.error("comments.js: container #" + containerId + " not found");
      return;
    }

    root.innerHTML = "";
    var widget = el("div", { className: "cmt-widget" });
    root.appendChild(widget);

    var loading = el("p", { className: "cmt-empty" }, "Loading comments\u2026");
    widget.appendChild(loading);

    var script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js";
    script.onload = function () {
      window
        .initSqlJs({ locateFile: function (f) { return "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/" + f; } })
        .then(function (SQL) { return initDb(SQL); })
        .then(function () {
          widget.innerHTML = "";
          var commentsContainer = el("div", { className: "cmt-section" });
          var aiContainer = el("div", { className: "cmt-section" });
          widget.appendChild(commentsContainer);
          widget.appendChild(aiContainer);
          renderComments(commentsContainer);
          renderActionItems(aiContainer);
        })
        .catch(function (err) {
          widget.innerHTML = "";
          widget.appendChild(el("div", { className: "cmt-error" }, "Failed to initialize database: " + err.message));
          console.error("comments.js init error:", err);
        });
    };
    script.onerror = function () {
      widget.innerHTML = "";
      widget.appendChild(el("div", { className: "cmt-error" }, "Failed to load sql.js from CDN. Check your network connection."));
    };

    if (window.initSqlJs) {
      script.onload();
    } else {
      document.head.appendChild(script);
    }
  }

  window.initComments = initComments;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { initComments("comments-section"); });
  } else {
    initComments("comments-section");
  }
})();
