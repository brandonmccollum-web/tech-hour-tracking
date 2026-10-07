(function () {
  var SHORT = 0.10;
  var KEY = "tht.daily.v1";
  var state = load();
  var selected = todayISO();
  var view = new Date(selected + "T12:00:00");

  var setup = document.getElementById("setup");
  var app = document.getElementById("app");
  var settings = document.getElementById("settings");

  document.getElementById("openTracker").addEventListener("click", function () {
    var form = document.getElementById("setupForm");
    var note = document.getElementById("setupNote");
    var profile = readForm(form);
    profile.periodStart = parseDate(form.periodStart.value);
    profile.periodEnd = parseDate(form.periodEnd.value);
    profile.period2Start = parseDate(form.period2Start.value);
    profile.period2End = parseDate(form.period2End.value);
    if (!profile.name || !profile.techNumber || !profile.periodStart || !profile.periodEnd) {
      note.textContent = "Enter name, tech number, and both dates as MM/DD/YYYY.";
      return;
    }
    state.profile = profile;
    save();
    try {
      showApp();
      note.textContent = "";
    } catch (err) {
      setup.style.display = "";
      app.style.display = "none";
      note.textContent = err.message || "The tracker could not open.";
    }
  });
  document.getElementById("openSettings").addEventListener("click", openSettings);
  document.getElementById("closeSettings").addEventListener("click", function () { settings.close(); });
  document.getElementById("settingsForm").addEventListener("submit", function (event) {
    event.preventDefault();
    state.profile = readForm(event.target);
    save();
    settings.close();
    render();
  });
  document.getElementById("prevMonth").addEventListener("click", function () {
    view.setMonth(view.getMonth() - 1);
    render();
  });
  document.getElementById("nextMonth").addEventListener("click", function () {
    view.setMonth(view.getMonth() + 1);
    render();
  });
  document.getElementById("uploadBtn").addEventListener("click", function () {
    document.getElementById("file").click();
  });
  document.getElementById("loadSample").addEventListener("click", loadSample);
  document.getElementById("file").addEventListener("change", onFile);
  document.getElementById("newPeriod").addEventListener("click", newPeriod);
  document.getElementById("clearData").addEventListener("click", clearData);
  document.getElementById("saveBackup").addEventListener("click", downloadBackup);
  document.getElementById("restoreBackup").addEventListener("click", function () { document.getElementById("backupFile").click(); });
  document.getElementById("backupFile").addEventListener("change", restoreBackup);
  document.getElementById("googleSave").addEventListener("click", saveToGoogle);
  document.getElementById("googleRestore").addEventListener("click", function () { googleAuth("restore"); });
  document.getElementById("sendReport").addEventListener("click", askReport);
  document.getElementById("cancelReport").addEventListener("click", function () { document.getElementById("reportAsk").close(); });
  document.getElementById("reportForm").addEventListener("submit", function (event) {
    event.preventDefault();
    document.getElementById("reportAsk").close();
    sendReport(document.getElementById("reportTarget").value);
  });

  if (state.profile) fillForm(document.getElementById("setupForm"), state.profile);
  document.getElementById("cadence").addEventListener("change", toggleSecondPeriod);
  document.getElementById("notToggle").addEventListener("click", function () {
    document.getElementById("notBody").classList.toggle("hidden");
  });
  toggleSecondPeriod();
  Array.prototype.forEach.call(document.querySelectorAll("[data-cal]"), function (button) {
    button.addEventListener("click", function () { openPicker(button); });
  });
  document.getElementById("addLine").addEventListener("click", function () {
    addTyped(document.getElementById("dayEntry"));
  });
  document.getElementById("dayEntry").ro.addEventListener("input", showPrior);
  document.getElementById("dayEntry").line.addEventListener("input", function (event) {
    event.target.value = event.target.value.toUpperCase();
    showPrior();
  });
  fillAdvisors();
  if (state.profile) showApp();

  function showApp() {
    setup.style.display = "none";
    app.style.display = "grid";
    app.classList.remove("hidden");
    document.getElementById("openSettings").textContent = "Advisors / manager";
    fillAdvisors();
    render();
  }

  function openSettings() {
    if (!state.profile) return;
    fillForm(document.getElementById("settingsForm"), state.profile);
    settings.showModal();
  }

  function render() {
    var profile = state.profile;
    document.getElementById("who").textContent = profile.name + " · #" + profile.techNumber;
    document.getElementById("monthLabel").textContent = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    drawCalendar();
    drawDay();
    drawCheck();
    var end = profile.periodEnd;
    var last = end === todayISO();
    document.getElementById("lastBanner").classList.toggle("hidden", !last);
    var lastNote = document.getElementById("lastDayNote");
    if (lastNote) {
      lastNote.textContent = last
        ? "Today is the last day. The button opens the manager's mail from this computer."
        : "Period ends " + showDate(end) + ". The report can be sent any day.";
    }
  }

  function drawCalendar() {
    var grid = document.getElementById("calendar");
    grid.innerHTML = "";
    var year = view.getFullYear();
    var month = view.getMonth();
    var first = new Date(year, month, 1);
    var start = first.getDay();
    var days = new Date(year, month + 1, 0).getDate();
    var logged = {};
    periodEntries().forEach(function (entry) { logged[entry.iso] = true; });
    for (var i = 0; i < start; i++) grid.appendChild(blank());
    for (var day = 1; day <= days; day++) {
      var iso = year + "-" + pad(month + 1) + "-" + pad(day);
      var button = document.createElement("button");
      button.type = "button";
      button.className = "day" + (iso === selected ? " on" : "") + (logged[iso] ? " has" : "");
      button.textContent = String(day);
      button.addEventListener("click", function (iso) {
        return function () { selected = iso; render(); };
      }(iso));
      grid.appendChild(button);
    }
  }

  function drawDay() {
    var date = new Date(selected + "T12:00:00");
    document.getElementById("weekday").textContent = date.toLocaleDateString(undefined, { weekday: "long" });
    document.getElementById("dayTitle").textContent = date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
    var all = Object.keys(state.entries).map(function (id) { return state.entries[id]; });
    var entries = all.filter(function (entry) { return entry.iso === selected && !entry.carryIn; });
    var work = groupByRo(entries);
    var carry = all.filter(function (entry) { return entry.carryIn && inViewedPeriod(entry); });
    var chips = document.getElementById("dayChips");
    chips.innerHTML = "";
    chip(chips, "Clock " + money(sum(entries.filter(function (entry) { return entry.iso === selected && !entry.carryIn; }), "clock")));
    chip(chips, "Flagged " + money(sum(entries.filter(function (entry) { return entry.iso === selected && !entry.carryIn; }), "flagged")));
    chip(chips, "Paid " + money(sum(entries.filter(function (entry) { return entry.iso === selected && !entry.carryIn; }), "paid")));
    var shorts = entries.filter(function (entry) { return entry.iso === selected && !entry.carryIn && isShort(entry); }).length;
    if (shorts) chip(chips, shorts + " short", "short");
    if (carry.length) chip(chips, "Carry-in " + money(sum(carry, "paid")), "carry");
    var lines = document.getElementById("lines");
    lines.innerHTML = "";
    if (!work.length) {
      var empty = document.createElement("div");
      empty.className = "card empty";
      empty.textContent = "No lines saved for this day yet.";
      lines.appendChild(empty);
    }
    work.forEach(function (group) { lines.appendChild(roCard(group)); });
    var carryBox = document.getElementById("carry");
    carryBox.innerHTML = "";
    if (!carry.length) {
      var none = document.createElement("div");
      none.className = "card empty";
      none.textContent = "No carry-in on this check.";
      carryBox.appendChild(none);
    }
    groupByRo(carry).forEach(function (group) { carryBox.appendChild(roCard(group)); });
    drawNotOn();
  }

  function entryRow() {
    var box = document.createElement("form");
    box.className = "card entry";
    box.onsubmit = function () { return false; };
    box.innerHTML =
      '<div class="entry-grid">' +
      field("RO", "<input name='ro' required placeholder='348366 or 348077S'>") +
      field("Job", "<input name='job' placeholder='20k service'>") +
      field("Line", "<input name='line' required placeholder='A'>") +
      field("W/C/I", "<select name='wci'><option>C</option><option>W</option><option>I</option></select>") +
      field("Flagged", "<input name='flagged' type='number' step='0.01' value='0.00'>") +
      field("Advisor", advisorSelect()) +
      field("Note", "<input name='note' placeholder='WIP, advisor miss'>") +
      '<button class="solid" type="button" data-add>Add</button></div>' +
      '<div class="prior" data-prior></div>';
    var prior = box.querySelector("[data-prior]");
    function look() {
      var hit = priorHit(box.ro.value, box.line.value);
      prior.textContent = hit
        ? "Prior period: " + hit.ro + " line " + hit.line + " flagged " + money(hit.flagged) + " on " + showDate(hit.iso) + ". If this check pays it, it stays carry-in."
        : "";
    }
    box.ro.addEventListener("input", look);
    box.line.addEventListener("input", look);
    box.querySelector("[data-add]").addEventListener("click", function () {
      if (!box.reportValidity()) return;
      addTyped(box);
    });
    return box;
  }

  function paintWci() {
    var pick = document.getElementById("wciPick");
    if (!pick) return;
    pick.className = "wci-" + String(pick.value || "C").toLowerCase();
  }

  function fillAdvisors() {
    var pick = document.getElementById("advisorPick");
    if (!pick || !state.profile) return;
    pick.innerHTML = "<option value=''></option>";
    (state.profile.advisors || []).forEach(function (name) {
      var option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      pick.appendChild(option);
    });
  }

  function showPrior() {
    var form = document.getElementById("dayEntry");
    var hit = priorHit(form.ro.value, form.line.value);
    document.getElementById("priorNote").textContent = hit
      ? "Prior period: " + hit.ro + " line " + hit.line + " flagged " + money(hit.flagged) + " on " + showDate(hit.iso) + "."
      : "";
  }

  function addTyped(form) {
    var ro = String(form.ro.value || "").trim().toUpperCase();
    var line = String(form.line.value || "").trim().toUpperCase();
    if (!ro || !line) {
      document.getElementById("priorNote").textContent = "RO and line are required before the line can be saved.";
      form.ro.focus();
      return;
    }
    var id = state.editingId || (selected + "|" + ro + "|" + line);
    if (state.editingId && state.editingId !== id) delete state.entries[state.editingId];
    var prior = priorHit(ro, line);
    var existing = state.entries[id] || {};
    var report = reportHit(ro, line);
    var editing = !!state.editingId;
    var jobs = editing ? [] : (existing.jobs || []).slice();
    if (!editing && !jobs.length && existing.job) jobs.push({ job: existing.job, flagged: existing.flagged, note: existing.note || "", advisor: existing.advisor || "", wci: existing.wci || "" });
    jobs.push({
      job: String(form.job.value || "").trim(),
      flagged: Number(form.flagged.value || 0),
      note: String(form.note.value || "").trim(),
      advisor: form.advisor.value,
      wci: form.wci.value
    });
    state.entries[id] = {
      id: id,
      iso: existing.iso || selected,
      ro: ro,
      line: line,
      split: /S$/.test(ro),
      job: editing ? String(form.job.value || "").trim() : jobs.map(function (item) { return item.job; }).filter(Boolean).join("; "),
      jobs: jobs,
      wci: form.wci.value,
      advisor: form.advisor.value,
      note: String(form.note.value || "").trim(),
      flagged: editing ? Number(form.flagged.value || 0) : round(jobs.reduce(function (total, item) { return total + Number(item.flagged || 0); }, 0)),
      typed: true,
      clock: report ? report.clock : (existing.clock || 0),
      paid: report ? report.paid : (existing.paid || 0),
      paidDate: report ? report.paidDate : (existing.paidDate || ""),
      adjusted: !!existing.adjusted,
      ops: existing.ops || [],
      carryIn: !!existing.carryIn,
      priorIso: prior ? prior.iso : "",
      priorFlagged: prior ? prior.flagged : 0
    };
    state.editingId = "";
    document.getElementById("addLine").textContent = "Add this line";
    form.ro.value = "";
    form.job.value = "";
    form.line.value = "";
    form.wci.value = "C";
    form.flagged.value = "0.00";
    form.advisor.value = "";
    form.note.value = "";
    document.getElementById("priorNote").textContent = "";
    save();
    render();
  }

  function priorHit(ro, line) {
    var key = String(ro || "").trim().toUpperCase() + "|" + String(line || "").trim().toUpperCase();
    if (key === "|") return null;
    var start = state.profile.periodStart;
    var hits = Object.keys(state.entries).map(function (id) { return state.entries[id]; }).filter(function (entry) {
      return entry.iso < start && (entry.ro + "|" + entry.line) === key;
    });
    hits.sort(function (a, b) { return a.iso < b.iso ? 1 : -1; });
    return hits[0] || null;
  }

  function downloadBackup() {
    download("tech-hour-backup.json", JSON.stringify(state));
    document.getElementById("backupNote").textContent = "Backup downloaded. Keep that file. Restore backup brings it back after a cache clear.";
  }

  function restoreBackup(event) {
    var file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    file.text().then(function (text) {
      var saved = JSON.parse(text);
      if (!saved.profile) throw new Error("That file is not a Tech Hour backup.");
      state.profile = saved.profile;
      state.entries = saved.entries || {};
      state.rths = saved.rths || [];
      state.history = saved.history || [];
      state.placed = saved.placed || {};
      save();
      showApp();
      document.getElementById("backupNote").textContent = "Backup restored in this browser.";
    }).catch(function (err) {
      document.getElementById("backupNote").textContent = err.message || "Could not read that backup.";
    });
  }

  function saveToGoogle() {
    googleAuth("save");
  }

  function googleAuth(action) {
    var note = document.getElementById("backupNote");
    if (!window.GOOGLE_CLIENT_ID) {
      note.textContent = "The hosted page is up, but Google sign-in still needs the client ID in google-client.js. Until that is pasted, Download backup is the copy that survives a cache clear.";
      return;
    }
    if (!window.google || !google.accounts || !google.accounts.oauth2) {
      note.textContent = "Google sign-in did not load. Open the hosted link, not the downloaded folder.";
      return;
    }
    var client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: function (token) {
        if (!token || !token.access_token) {
          note.textContent = "Google did not grant access.";
          return;
        }
        if (action === "save") uploadDrive(token.access_token);
        else restoreDrive(token.access_token);
      }
    });
    client.requestAccessToken();
  }

  function uploadDrive(token) {
    var note = document.getElementById("backupNote");
    note.textContent = "Saving to this Google account…";
    findDriveFile(token).then(function (fileId) {
      var body = JSON.stringify(state);
      var url = fileId
        ? "https://www.googleapis.com/upload/drive/v3/files/" + fileId + "?uploadType=media"
        : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      var init = { method: fileId ? "PATCH" : "POST", headers: { Authorization: "Bearer " + token } };
      if (fileId) {
        init.headers["Content-Type"] = "application/json";
        init.body = body;
      } else {
        var boundary = "tht";
        init.headers["Content-Type"] = "multipart/related; boundary=" + boundary;
        init.body = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
          JSON.stringify({ name: "Tech Hour Tracking backup.json", mimeType: "application/json" }) +
          "\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n" + body + "\r\n--" + boundary + "--";
      }
      return fetch(url, init);
    }).then(function (response) {
      if (!response.ok) throw new Error("Google did not save the file.");
      note.textContent = "Saved in this Google account. Tech Hour Tracking does not keep a copy.";
    }).catch(function (err) {
      note.textContent = err.message || "Could not save to Google.";
    });
  }

  function restoreDrive(token) {
    var note = document.getElementById("backupNote");
    findDriveFile(token).then(function (fileId) {
      if (!fileId) throw new Error("No backup in this Google account yet.");
      return fetch("https://www.googleapis.com/drive/v3/files/" + fileId + "?alt=media", { headers: { Authorization: "Bearer " + token } });
    }).then(function (response) { return response.json(); }).then(function (saved) {
      if (!saved.profile) throw new Error("That Google file is not a Tech Hour backup.");
      state.profile = saved.profile;
      state.entries = saved.entries || {};
      state.rths = saved.rths || [];
      state.history = saved.history || [];
      state.placed = saved.placed || {};
      save();
      showApp();
      note.textContent = "Restored from this Google account.";
    }).catch(function (err) {
      note.textContent = err.message || "Could not restore from Google.";
    });
  }

  function findDriveFile(token) {
    var query = encodeURIComponent("name = 'Tech Hour Tracking backup.json' and trashed = false");
    return fetch("https://www.googleapis.com/drive/v3/files?q=" + query + "&fields=files(id)&pageSize=1", {
      headers: { Authorization: "Bearer " + token }
    }).then(function (response) { return response.json(); }).then(function (data) {
      return data.files && data.files[0] ? data.files[0].id : "";
    });
  }

  function clearData() {
    var ok = window.confirm("Clear every logged line and the RTHS in this browser? Setup name and dates stay. This is not a new pay period.");
    if (!ok) return;
    state.entries = {};
    state.rths = [];
    state.history = [];
    state.placed = {};
    state.lastReport = null;
    state.notOnNew = 0;
    state.editingId = "";
    save();
    render();
  }

  function newPeriod() {
    var profile = state.profile;
    var end = new Date(profile.periodEnd + "T12:00:00");
    end.setDate(end.getDate() + 1);
    var day = end.getDate();
    var start;
    var finish;
    if (day >= 6 && day <= 20) {
      start = new Date(end.getFullYear(), end.getMonth(), 6);
      finish = new Date(end.getFullYear(), end.getMonth(), 20);
    } else if (day >= 21) {
      start = new Date(end.getFullYear(), end.getMonth(), 21);
      finish = new Date(end.getFullYear(), end.getMonth() + 1, 5);
    } else {
      start = new Date(end.getFullYear(), end.getMonth(), 6);
      finish = new Date(end.getFullYear(), end.getMonth(), 20);
    }
    var ok = window.confirm("Start " + isoOf(start) + " to " + isoOf(finish) + "? This period stays in the ledger so a later RO can be recognized. Nothing is deleted.");
    if (!ok) return;
    profile.periodStart = isoOf(start);
    profile.periodEnd = isoOf(finish);
    selected = profile.periodStart;
    view = new Date(selected + "T12:00:00");
    save();
    render();
  }
    function groupByRo(list) {
    var map = {};
    list.forEach(function (entry) {
      if (!map[entry.ro]) map[entry.ro] = { ro: entry.ro, split: entry.split, lines: [] };
      map[entry.ro].lines.push(entry);
    });
    return Object.keys(map).sort().map(function (ro) {
      map[ro].lines.sort(function (a, b) { return a.line < b.line ? -1 : 1; });
      return map[ro];
    });
  }

  function roCard(group) {
    var el = document.createElement("article");
    el.className = "card line";
    var head = document.createElement("div");
    head.className = "head";
    var title = document.createElement("h3");
    title.className = "ro" + (group.split ? " split-ro" : "");
    title.textContent = group.ro;
    head.appendChild(title);
    el.appendChild(head);
    group.lines.forEach(function (entry) {
      var block = document.createElement("div");
      block.style.marginTop = "10px";
      block.style.padding = "8px";
      block.style.borderRadius = "8px";
      if (entry.carryIn) block.className = "gold-line";
      else if (isShort(entry)) block.className = "short-line";
      var label = document.createElement("div");
      label.innerHTML = "<b>Line " + escapeHtml(entry.line) + "</b>";
      if (entry.wci) {
        var badge = document.createElement("span");
        badge.className = "letter letter-" + entry.wci.toLowerCase();
        badge.textContent = entry.wci;
        label.appendChild(badge);
      }
      var tools = document.createElement("span");
      tools.className = "line-tools";
      var edit = document.createElement("button");
      edit.type = "button";
      edit.className = "mini";
      edit.textContent = "Edit";
      edit.addEventListener("click", function () { startEdit(entry); });
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "mini";
      remove.textContent = "Delete";
      remove.addEventListener("click", function () { deleteEntry(entry); });
      tools.appendChild(edit);
      tools.appendChild(remove);
      label.appendChild(tools);
      block.appendChild(label);
      var jobs = entry.jobs && entry.jobs.length ? entry.jobs : [{ job: entry.job, flagged: entry.flagged, note: entry.note, advisor: entry.advisor }];
      jobs.forEach(function (job) {
        var row = document.createElement("div");
        row.className = "ops";
        row.textContent = (job.job || "Job") + " · flagged " + money(job.flagged) + (job.advisor ? " · " + job.advisor : "") + (job.note ? " · " + job.note : "");
        block.appendChild(row);
      });
      var math = document.createElement("div");
      math.className = "math";
      math.innerHTML = metric("Clock", money(entry.clock)) + metric("Flagged", money(entry.flagged)) + metric("Paid", money(entry.paid)) + metric("Gap", money(gap(entry)));
      block.appendChild(math);
      el.appendChild(block);
    });
    return el;
  }

  function openPicker(button) {
    var old = document.getElementById("datePicker");
    if (old) old.remove();
    var input = button.parentNode.querySelector("input");
    var view = new Date();
    var parsed = parseDate(input.value);
    if (parsed) view = new Date(parsed + "T12:00:00");
    var pop = document.createElement("div");
    pop.id = "datePicker";
    pop.className = "picker";
    function draw() {
      pop.innerHTML = "";
      var head = document.createElement("div");
      head.className = "cal-head";
      var prev = document.createElement("button");
      prev.type = "button";
      prev.textContent = "‹";
      var next = document.createElement("button");
      next.type = "button";
      next.textContent = "›";
      var label = document.createElement("div");
      label.textContent = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      head.appendChild(prev);
      head.appendChild(label);
      head.appendChild(next);
      pop.appendChild(head);
      var grid = document.createElement("div");
      grid.className = "grid";
      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var i = 0; i < first.getDay(); i++) grid.appendChild(document.createElement("span"));
      for (var day = 1; day <= days; day++) {
        var cell = document.createElement("button");
        cell.type = "button";
        cell.textContent = String(day);
        cell.addEventListener("click", function (day) {
          return function () {
            input.value = pad(view.getMonth() + 1) + "/" + pad(day) + "/" + view.getFullYear();
            pop.remove();
          };
        }(day));
        grid.appendChild(cell);
      }
      pop.appendChild(grid);
      prev.addEventListener("click", function () { view.setMonth(view.getMonth() - 1); draw(); });
      next.addEventListener("click", function () { view.setMonth(view.getMonth() + 1); draw(); });
    }
    draw();
    button.parentNode.appendChild(pop);
  }

  function toggleSecondPeriod() {
    var show = document.getElementById("cadence").value === "twice";
    document.getElementById("secondPeriod").classList.toggle("hidden", !show);
  }

  function drawCheck() {
    var entries = periodEntries();
    var work = entries.filter(function (entry) { return !entry.carryIn; });
    var carry = entries.filter(function (entry) { return entry.carryIn; });
    var shorts = work.filter(isShort);
    document.getElementById("checkPaid").textContent = money(sum(entries, "paid"));
    document.getElementById("checkFlagged").textContent = money(sum(work, "flagged"));
    document.getElementById("checkClock").textContent = money(sum(work, "clock"));
    document.getElementById("shortCount").textContent = String(shorts.length);
    document.getElementById("shortHours").textContent = money(shorts.reduce(function (total, entry) { return total + gap(entry); }, 0));
    document.getElementById("carryHours").textContent = money(sum(carry, "paid"));
    drawStats(work);
  }

  function drawStats(work) {
    var days = {};
    var ros = {};
    var labor = { C: 0, W: 0, I: 0 };
    work.forEach(function (entry) {
      days[entry.iso] = days[entry.iso] || {};
      days[entry.iso][entry.ro] = true;
      ros[entry.ro] = true;
      var kind = String(entry.wci || "").toUpperCase();
      if (labor[kind] !== undefined) labor[kind] += Number(entry.flagged || 0);
    });
    var dayCount = Object.keys(days).length;
    var roCount = Object.keys(ros).length;
    var flagged = sum(work, "flagged");
    var laborTotal = labor.C + labor.W + labor.I;
    var roPerDay = 0;
    Object.keys(days).forEach(function (iso) { roPerDay += Object.keys(days[iso]).length; });
    document.getElementById("statDays").textContent = String(dayCount);
    document.getElementById("statRos").textContent = dayCount ? money(roPerDay / dayCount) : "0.00";
    document.getElementById("statHours").textContent = dayCount ? money(flagged / dayCount) : "0.00";
    document.getElementById("statLines").textContent = roCount ? money(work.length / roCount) : "0.00";
    document.getElementById("statC").textContent = percent(labor.C, laborTotal);
    document.getElementById("statW").textContent = percent(labor.W, laborTotal);
    document.getElementById("statI").textContent = percent(labor.I, laborTotal);
  }

  function percent(part, total) {
    if (!total) return "0%";
    return Math.round((part / total) * 100) + "%";
  }

  function loadSample() {
    if (!state.profile) {
      document.getElementById("fileNote").textContent = "Open the tracker first, then load the sample.";
      return;
    }
    if (typeof THT_SAMPLE === "undefined") {
      document.getElementById("fileNote").textContent = "sample-data.js is missing from this folder.";
      return;
    }
    state.entries = {};
    state.rths = [];
    state.placed = {};
    state.profile.periodStart = "2026-09-22";
    state.profile.periodEnd = "2026-10-05";
    THT_SAMPLE.filled.forEach(function (row) {
      var id = row.iso + "|" + row.ro + "|" + row.line;
      state.entries[id] = {
        id: id, iso: row.iso, ro: row.ro, line: row.line, split: /S$/.test(row.ro),
        job: row.job, wci: "C", advisor: "", note: "", flagged: row.sold, typed: true,
        clock: row.clock, paid: row.sold, paidDate: row.iso, carryIn: false, fromSheet: false
      };
      state.placed[row.ro + "|" + row.line] = true;
    });
    THT_SAMPLE.open.forEach(function (row) {
      state.rths.push({ ro: row.ro, line: row.line, iso: row.iso, clock: row.clock, sold: row.sold, description: row.job, ops: [] });
    });
    selected = "2026-09-23";
    view = new Date(selected + "T12:00:00");
    save();
    document.getElementById("fileNote").textContent = THT_SAMPLE.filled.length + " lines filled. " + THT_SAMPLE.open.length + " left on Not Currently Tracked.";
    render();
  }

  function onFile(event) {
    var file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    var note = document.getElementById("fileNote");
    note.textContent = "Reading the report in this browser…";
    file.arrayBuffer().then(readRthsPdf).then(function (text) {
      return parseRTHSText(text);
    }).then(function (parsed) {
      if (!parsed.rows.length) throw new Error("No labor lines found. Use the CDK Technician Hours Summary PDF.");
      merge(parsed);
      state.notOnNew = unmatchedCount();
      selected = parsed.rows[parsed.rows.length - 1].iso;
      view = new Date(selected + "T12:00:00");
      save();
      note.textContent = parsed.techName + " · " + parsed.rows.length + " lines · clock " + money(parsed.clock) + " · flagged " + money(parsed.flagged);
      if (state.profile.techNumber && parsed.techNumber && state.profile.techNumber !== parsed.techNumber) {
        note.textContent += " · report tech #" + parsed.techNumber + " does not match this browser.";
      }
      render();
    }).catch(function (err) {
      note.textContent = err.message || "Could not read that PDF.";
    });
  }

  function readRthsPdf(buffer) {
    var bytes = new Uint8Array(buffer);
    var latin = Array.prototype.map.call(bytes, function (b) { return String.fromCharCode(b); }).join("");
    var streams = [];
    var re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    var match;
    while ((match = re.exec(latin))) {
      var raw = match[1];
      var chunk = new Uint8Array(raw.length);
      for (var i = 0; i < raw.length; i++) chunk[i] = raw.charCodeAt(i) & 255;
      streams.push(chunk);
    }
    return Promise.all(streams.map(inflatePdf)).then(function (parts) {
      return parts.filter(Boolean).join("\n");
    });
  }

  function inflatePdf(chunk) {
    if (typeof DecompressionStream !== "function") return Promise.resolve("");
    var stream = new Blob([chunk]).stream().pipeThrough(new DecompressionStream("deflate"));
    return new Response(stream).arrayBuffer().then(function (buf) {
      var text = new TextDecoder("latin1").decode(new Uint8Array(buf));
      var lines = [];
      var re = /\((?:\\.|[^\\)])*\)\s*(?:Tj|')/g;
      var match;
      while ((match = re.exec(text))) {
        var raw = match[0];
        raw = raw.slice(1, raw.lastIndexOf(")"));
        raw = raw.replace(/\\([()\\])/g, "$1");
        lines.push(raw);
      }
      return lines.join("\n");
    }).catch(function () { return ""; });
  }

  function merge(parsed) {
    state.rths = parsed.rows.map(function (row) {
      return {
        ro: row.ro,
        line: row.line,
        split: row.split,
        iso: row.iso,
        time: row.time,
        clock: row.clock,
        sold: row.flagged,
        labor: row.labor,
        opcode: row.opcode,
        description: row.description,
        adjusted: row.adjusted
      };
    });
    state.history = (state.history || []).concat(state.rths);
    var groups = groupRths();
    Object.keys(state.entries).forEach(function (id) {
      var entry = state.entries[id];
      if (entry.iso < state.profile.periodStart || entry.iso > state.profile.periodEnd) return;
      var hit = groups[entry.ro + "|" + entry.line];
      if (!hit) return;
      entry.clock = hit.clock;
      entry.paid = hit.sold;
      entry.paidDate = hit.iso;
      entry.ops = hit.ops;
      var older = priorHit(entry.ro, entry.line);
      if (older) {
        entry.carryIn = true;
        entry.priorIso = older.iso;
        entry.priorFlagged = older.flagged;
      }
    });
    state.lastReport = {
      techNumber: parsed.techNumber,
      techName: parsed.techName,
      asOf: parsed.asOf,
      clock: parsed.clock,
      flagged: parsed.flagged
    };
  }

  function groupRths() {
    var groups = {};
    (state.rths || []).forEach(function (row) {
      var key = row.ro + "|" + row.line;
      if (!groups[key]) groups[key] = { ro: row.ro, line: row.line, clock: 0, sold: 0, iso: row.iso, ops: [], description: row.description };
      groups[key].clock = round(groups[key].clock + row.clock);
      groups[key].sold = round(groups[key].sold + row.sold);
      if (row.iso > groups[key].iso) groups[key].iso = row.iso;
      groups[key].ops.push(row);
    });
    return groups;
  }

  function drawNotOn() {
    var box = document.getElementById("notOn");
    if (!box) return;
    var flagged = {};
    var placed = state.placed || {};
    Object.keys(state.entries).forEach(function (id) {
      var entry = state.entries[id];
      flagged[entry.ro + "|" + entry.line] = true;
    });
    var missing = [];
    var groups = groupRths();
    Object.keys(groups).forEach(function (key) {
      if (!flagged[key] && !placed[key]) missing.push(groups[key]);
    });
    box.innerHTML = "";
    var badge = document.getElementById("notBadge");
    if (badge) {
      var count = unmatchedCount();
      badge.textContent = String(count);
      badge.classList.toggle("hidden", count < 1);
    }
    if (!missing.length) {
      var none = document.createElement("div");
      none.className = "card empty";
      none.textContent = "Every report line is flagged, or no report has been read.";
      box.appendChild(none);
      return;
    }
    missing.forEach(function (row) {
      var el = document.createElement("div");
      el.className = "card not-row";
      el.innerHTML = "<div><b>" + escapeHtml(row.ro) + " · " + escapeHtml(row.line) + "</b><div class='ops'>Sold " + money(row.sold) + " · booked " + showDate(row.iso) + "</div></div>";
      var actions = document.createElement("div");
      var dayBtn = document.createElement("button");
      dayBtn.type = "button";
      dayBtn.className = "mini";
      dayBtn.textContent = "Put on booked day";
      dayBtn.addEventListener("click", function () { placeMissing(row, false); });
      var carryBtn = document.createElement("button");
      carryBtn.type = "button";
      carryBtn.className = "mini";
      carryBtn.textContent = "Carry-in";
      carryBtn.addEventListener("click", function () { placeMissing(row, true); });
      actions.appendChild(dayBtn);
      actions.appendChild(carryBtn);
      el.appendChild(actions);
      box.appendChild(el);
    });
  }

  function startEdit(entry) {
    var form = document.getElementById("dayEntry");
    state.editingId = entry.id;
    form.ro.value = entry.ro;
    form.job.value = entry.job || "";
    form.line.value = entry.line;
    form.wci.value = entry.wci || "C";
    form.flagged.value = money(entry.flagged);
    form.advisor.value = entry.advisor || "";
    form.note.value = entry.note || "";
    document.getElementById("addLine").textContent = "Save edit";
    paintWci();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function deleteEntry(entry) {
    if (entry.fromSheet) {
      state.placed = state.placed || {};
      delete state.placed[entry.ro + "|" + entry.line];
    }
    delete state.entries[entry.id];
    if (state.editingId === entry.id) state.editingId = "";
    save();
    render();
  }

  function placeMissing(row, carry) {
    var iso = row.iso;
    var id = iso + "|" + row.ro + "|" + row.line;
    state.entries[id] = {
      id: id,
      iso: iso,
      ro: row.ro,
      line: row.line,
      split: /S$/.test(row.ro),
      job: row.description || (carry ? "Carry-in from RTHS" : "From RTHS"),
      wci: "C",
      advisor: "",
      note: carry ? "Carry-in" : "Placed on booked day",
      flagged: row.sold,
      typed: true,
      clock: row.clock,
      paid: row.sold,
      paidDate: row.iso,
      ops: row.ops || [],
      carryIn: carry,
      fromSheet: true,
      periodStart: state.profile.periodStart,
      periodEnd: state.profile.periodEnd,
      priorIso: "",
      priorFlagged: 0
    };
    state.placed = state.placed || {};
    state.placed[row.ro + "|" + row.line] = true;
    if (!carry) {
      selected = iso;
      view = new Date(iso + "T12:00:00");
    }
    save();
    render();
  }

  function askReport() {
    var note = document.getElementById("reportAskNote");
    note.textContent = "Boss email, or type pdf to only rebuild the tab. Blank uses " + (state.profile.managerEmail || "the manager on file") + ".";
    document.getElementById("reportTarget").value = "";
    document.getElementById("reportAsk").showModal();
  }

  function sendReport(target) {
    var profile = state.profile;
    var typed = String(target || "").trim();
    var pdfOnly = typed.toLowerCase() === "pdf";
    var email = pdfOnly ? "" : (typed || profile.managerEmail);
    var shorts = periodEntries().filter(isShort);
    var notPaid = shorts.filter(function (entry) { return Number(entry.paid || 0) <= 0; });
    var shortPaid = shorts.filter(function (entry) { return Number(entry.paid || 0) > 0; });
    var notPaidHours = shorts.reduce(function (total, entry) { return entry.paid <= 0 ? total + gap(entry) : total; }, 0);
    var shortPaidHours = shorts.reduce(function (total, entry) { return entry.paid > 0 ? total + gap(entry) : total; }, 0);
    var net = notPaidHours + shortPaidHours;
    var html = reportHtml(profile, notPaid, shortPaid, notPaidHours, shortPaidHours, net);
    var win = window.open("", "shortpay");
    if (!win) {
      download("short-pay-" + profile.periodEnd + ".html", html);
      document.getElementById("lastDayNote").textContent = "Pop-up blocked. The report downloaded as HTML. Open it and print to PDF.";
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    download("short-pay-" + profile.periodEnd + ".html", html);
    if (!pdfOnly && email) {
      var mail = "mailto:" + encodeURIComponent(email) +
        "?subject=" + encodeURIComponent("Short Pay Report " + profile.name + " " + showDate(profile.periodEnd)) +
        "&body=" + encodeURIComponent("Short-pay report is attached from this computer. Not paid " + money(notPaidHours) + ". Short paid " + money(shortPaidHours) + ". Net " + money(net) + ".");
      window.location.href = mail;
    }
  }

  function reportHtml(profile, notPaid, shortPaid, notPaidHours, shortPaidHours, net) {
    var range = showDate(profile.periodStart).slice(0, 5) + "–" + showDate(profile.periodEnd).slice(0, 5);
    return "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Short Pay Report</title><style>" +
      "@page{size:letter portrait;margin:0.5in}body{font-family:Arial,sans-serif;margin:0;color:#222;width:7.5in}" +
      "h1{background:#1e4f86;color:#fff;margin:0;padding:8px 10px;font-size:16px}" +
      ".bar{display:flex;gap:14px;background:#1e4f86;color:#fff;padding:6px 10px;font-size:11px}.bar b{color:#ffd56a}" +
      "table{width:7.5in;border-collapse:collapse;font-size:10px}th{background:#1e4f86;color:#fff;text-align:left;padding:4px}" +
      ".band{background:#1e4f86;color:#fff;font-weight:700}.not{background:#8c1d1d;color:#fff}.short{background:#b86a12;color:#fff}" +
      "td{border-bottom:1px solid #e4e4e4;padding:4px;vertical-align:top}.owed{background:#f8d7d7;font-weight:700;color:#8c1d1d}" +
      ".day{background:#eef3f8;font-weight:700}button{margin:8px 0}" +
      "@media print{button{display:none}body{width:7.5in}}" +
      "</style></head><body><button onclick='print()'>Save as PDF</button>" +
      "<h1>Short Pay Report · " + range + "</h1><div class='bar'><span>NOT PAID <b>" + money(notPaidHours) + "</b></span>" +
      "<span>SHORT PAID <b>" + money(shortPaidHours) + "</b></span><span>TOTAL <b>" + money(net) + "</b></span>" +
      "<span>NET DISCREPANCY ON DAILY SHEET <b>" + money(net) + "</b></span></div>" +
      "<table><tr><th>Date</th><th>RO</th><th>Line</th><th>Advisor</th><th>Job</th><th>Flagged</th><th>Paid</th><th>Owed</th><th>Note</th></tr>" +
      sectionRows("NOT PAID " + money(notPaidHours) + " hours", "not", notPaid) +
      sectionRows("SHORT PAID " + money(shortPaidHours) + " hours", "short", shortPaid) +
      "</table></body></html>";
  }

  function sectionRows(title, kind, list) {
    var rows = "<tr><td class='" + kind + "' colspan='9'>" + title + "</td></tr>";
    if (!list.length) return rows + "<tr><td colspan='9'>None</td></tr>";
    var last = "";
    list.forEach(function (entry) {
      var day = new Date(entry.iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
      if (day !== last) {
        rows += "<tr><td class='day' colspan='9'>" + day + "</td></tr>";
        last = day;
      }
      var note = entry.note || (Number(entry.paid || 0) <= 0 ? "not on the RTHS. Flagged " + money(entry.flagged) + "." : "short " + money(gap(entry)) + ". Flagged " + money(entry.flagged) + ", paid " + money(entry.paid) + ".");
      rows += "<tr><td>" + showDate(entry.iso).slice(0, 5) + "</td><td>" + escapeHtml(entry.ro) + "</td><td>" + escapeHtml(entry.line) +
        "</td><td>" + escapeHtml(entry.advisor || "") + "</td><td>" + escapeHtml(entry.job || "") + "</td><td>" + money(entry.flagged) +
        "</td><td>" + money(entry.paid) + "</td><td class='owed'>" + money(gap(entry)) + "</td><td>" + escapeHtml(note) + "</td></tr>";
    });
    return rows;
  }

  function periodEntries() {
    var profile = state.profile;
    return Object.keys(state.entries).map(function (id) { return state.entries[id]; }).filter(function (entry) {
      return entry.iso >= profile.periodStart && entry.iso <= profile.periodEnd;
    }).sort(function (a, b) {
      return a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : a.ro < b.ro ? -1 : a.line < b.line ? -1 : 1;
    });
  }

  function inViewedPeriod(entry) {
    var start = entry.periodStart || state.profile.periodStart;
    var end = entry.periodEnd || state.profile.periodEnd;
    return selected >= start && selected <= end;
  }

  function unmatchedCount() {
    var flagged = {};
    var placed = state.placed || {};
    Object.keys(state.entries).forEach(function (id) {
      var entry = state.entries[id];
      flagged[entry.ro + "|" + entry.line] = true;
    });
    return Object.keys(groupRths()).filter(function (key) { return !flagged[key] && !placed[key]; }).length;
  }

  function reportHit(ro, line) {
    var key = String(ro || "").trim().toUpperCase() + "|" + String(line || "").trim().toUpperCase();
    var start = state.profile.periodStart;
    var end = state.profile.periodEnd;
    var hit = groupRths()[key];
    if (!hit) return null;
    return { clock: hit.clock, paid: hit.sold, paidDate: hit.iso };
  }

  function applyReportToFlags(reportLine) {
    var key = reportLine.ro + "|" + reportLine.line;
    Object.keys(state.entries).forEach(function (id) {
      var entry = state.entries[id];
      if (!entry.typed || entry.iso + "|" + entry.ro + "|" + entry.line === reportLine.id) return;
      if (entry.iso < state.profile.periodStart || entry.iso > state.profile.periodEnd) return;
      if ((entry.ro + "|" + entry.line) !== key) return;
      entry.clock = reportLine.clock;
      entry.paid = reportLine.paid;
      entry.paidDate = reportLine.paidDate;
      if (reportLine.carryIn) {
        entry.carryIn = true;
        entry.priorIso = reportLine.priorIso;
        entry.priorFlagged = reportLine.priorFlagged;
      }
    });
  }

  function isoOf(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }
  function gapClass(entry) {
    var n = gap(entry);
    if (entry.carryIn) return "";
    if (n > SHORT) return "gap-short";
    if (n < -SHORT) return "gap-over";
    return "";
  }
  function isShort(entry) { return !entry.carryIn && gap(entry) > SHORT; }
  function gap(entry) { return round(entry.flagged - entry.paid); }
  function sum(list, key) { return round(list.reduce(function (total, entry) { return total + Number(entry[key] || 0); }, 0)); }
  function round(n) { return Math.round(Number(n) * 100) / 100; }
  function money(n) { return round(n).toFixed(2); }
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function parseDate(value) {
    var raw = String(value || "").trim();
    var iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
    var md = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!md) return "";
    return md[3] + "-" + pad(Number(md[1])) + "-" + pad(Number(md[2]));
  }
  function showDate(iso) { return iso.slice(5, 7) + "/" + iso.slice(8, 10) + "/" + iso.slice(0, 4); }
  function cadenceLabel(value) { return value === "twice" ? "twice a month" : value; }
  function blank() { var s = document.createElement("span"); return s; }
  function chip(parent, text, kind) {
    var el = document.createElement("span");
    el.className = "chip" + (kind ? " " + kind : "");
    el.textContent = text;
    parent.appendChild(el);
  }
  function metric(label, value) {
    return "<div><label>" + label + "</label><b>" + value + "</b></div>";
  }
  function escapeHtml(value) {
    var amp = String.fromCharCode(38);
    var lt = String.fromCharCode(60);
    var gt = String.fromCharCode(62);
    var q = String.fromCharCode(34);
    return String(value)
      .split(amp).join(amp + "amp;")
      .split(lt).join(amp + "lt;")
      .split(gt).join(amp + "gt;")
      .split(q).join(amp + "quot;");
  }

  function download(name, text) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = name;
    a.click();
  }
  function readForm(form) {
    var data = new FormData(form);
    return {
      name: String(data.get("name") || "").trim(),
      techNumber: String(data.get("techNumber") || "").trim(),
      email: String(data.get("email") || "").trim(),
      managerName: String(data.get("managerName") || "").trim(),
      managerEmail: String(data.get("managerEmail") || "").trim(),
      cadence: String(data.get("cadence") || "weekly"),
      periodStart: String(data.get("periodStart") || ""),
      period2Start: String(data.get("period2Start") || ""),
      period2End: String(data.get("period2End") || ""),
      advisors: String(data.get("advisors") || "").split(",").map(function (name) { return name.trim(); }).filter(Boolean)
    };
  }
  function fillForm(form, profile) {
    form.name.value = profile.name;
    form.techNumber.value = profile.techNumber;
    form.email.value = profile.email;
    form.managerName.value = profile.managerName || "";
    form.managerEmail.value = profile.managerEmail;
    form.cadence.value = profile.cadence;
    form.periodStart.value = profile.periodStart || "";
    form.periodEnd.value = profile.periodEnd || "";
    if (form.period2Start) form.period2Start.value = profile.period2Start || "";
    if (form.period2End) form.period2End.value = profile.period2End || "";
    form.advisors.value = (profile.advisors || []).join(", ");
  }
  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || "");
      saved.entries = saved.entries || {};
      saved.rths = saved.rths || [];
      saved.history = saved.history || [];
      saved.placed = saved.placed || {};
      return saved;
    } catch (err) {
      return { profile: null, entries: {} };
    }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (err) { /* this browser may block storage; the page still opens */ }
  }
})();
