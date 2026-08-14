/*
SWS Document Portal API
=======================

Google Sheet may remain Restricted.

Deploy as Web App:
- Execute as: Me
- Who has access: Anyone

Browser pages (HQ / Worksite) DO NOT call this API directly anymore.
GitHub Actions calls:
    ?action=documents_json

and writes the result into documents.json on GitHub Pages.

This avoids Chrome ERR_BLOCKED_BY_ORB / multi-Google-account problems.
*/

const SPREADSHEET_ID =
  "1YIZprCXV76NSLh-9UM9iWyiDEOExSXv3ey_N8arXpXU";


function doGet(e) {
  const action = String(
    (e && e.parameter && e.parameter.action) || "documents"
  ).toLowerCase();

  const callback = String(
    (e && e.parameter && e.parameter.callback) || "handleSwsData"
  );

  // RAW JSON endpoint used by GitHub Actions.
  if (action === "documents_json") {
    return ContentService
      .createTextOutput(JSON.stringify(getDocuments()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  let data = {};

  if (action === "documents") {
    data = getDocuments();
  } else if (action === "campaign") {
    data = getCampaign();
  } else if (action === "latest") {
    data = getLatestUpdates();
  } else if (action === "quick") {
    data = getQuickAccess();
  } else if (action === "ticker") {
    data = getTicker();
  } else {
    data = {
      success: false,
      error: "Unknown action"
    };
  }

  // Legacy JSONP output retained for any old page still using it.
  return ContentService
    .createTextOutput(
      callback + "(" + JSON.stringify(data) + ");"
    )
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}


function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}


function getSetting(settingName) {
  const sh = getSpreadsheet_().getSheetByName("Settings");

  if (!sh) return "";

  const values = sh.getDataRange().getDisplayValues();

  for (let i = 1; i < values.length; i++) {
    if (
      clean(values[i][0]).toLowerCase() ===
      clean(settingName).toLowerCase()
    ) {
      return clean(values[i][1]).toUpperCase();
    }
  }

  return "";
}


function getSheetByPossibleNames(names) {
  const ss = getSpreadsheet_();

  for (let i = 0; i < names.length; i++) {
    const sh = ss.getSheetByName(names[i]);

    if (sh) return sh;
  }

  throw new Error(
    "Sheet not found: " + names.join(" / ")
  );
}


function getRows(sheetNames) {
  const sh = getSheetByPossibleNames(sheetNames);
  const values = sh.getDataRange().getDisplayValues();

  if (values.length < 2) return [];

  return values
    .slice(1)
    .filter(r => r.join("").trim() !== "");
}


function normalizeHeader_(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}


function findHeaderIndex_(headers, possibleNames, fallbackIndex) {
  const normalizedHeaders =
    headers.map(normalizeHeader_);

  for (let i = 0; i < possibleNames.length; i++) {
    const wanted = normalizeHeader_(possibleNames[i]);
    const found = normalizedHeaders.indexOf(wanted);

    if (found !== -1) {
      return found;
    }
  }

  return fallbackIndex;
}


function valueAt_(row, index) {
  if (index < 0 || index >= row.length) {
    return "";
  }

  return clean(row[index]);
}


function getDocuments() {
  const sh = getSheetByPossibleNames([
    "Documents",
    "MDR",
    "SWS MDR",
    "Sheet1"
  ]);

  const values = sh.getDataRange().getDisplayValues();

  if (values.length < 2) {
    return {
      success: true,
      documents: []
    };
  }

  const headers = values[0];

  /*
  Header mapping allows the Storage column to exist OR be removed.

  Supported intended structure:
  Department | Doc No | Title | Type | Rev No | Rev Date |
  Applicable to Worksite | Status | [Storage optional] |
  Link | Video Link
  */

  const iDepartment = findHeaderIndex_(
    headers,
    ["Department"],
    0
  );

  const iDocNo = findHeaderIndex_(
    headers,
    ["Doc No", "Document No", "Document Number"],
    1
  );

  const iTitle = findHeaderIndex_(
    headers,
    ["Title", "Document Title"],
    2
  );

  const iType = findHeaderIndex_(
    headers,
    ["Type", "Document Type"],
    3
  );

  const iRevNo = findHeaderIndex_(
    headers,
    ["Rev No", "Revision", "Revision No"],
    4
  );

  const iRevDate = findHeaderIndex_(
    headers,
    ["Rev Date", "Revision Date"],
    5
  );

  const iWorksite = findHeaderIndex_(
    headers,
    [
      "Applicable to Worksite",
      "Applicable To Work Site",
      "Worksite"
    ],
    6
  );

  const iStatus = findHeaderIndex_(
    headers,
    ["Status"],
    7
  );

  const iStorage = findHeaderIndex_(
    headers,
    ["Storage"],
    -1
  );

  let iLink = findHeaderIndex_(
    headers,
    ["Link", "Document Link", "URL"],
    -1
  );

  let iVideo = findHeaderIndex_(
    headers,
    ["Video Link", "Guide", "Guide Link", "Video"],
    -1
  );

  // Fallback supports the old layout if headers are not recognised.
  if (iLink === -1) {
    iLink = iStorage === -1 ? 8 : 9;
  }

  if (iVideo === -1) {
    iVideo = iStorage === -1 ? 9 : 10;
  }

  const showOthers =
    getSetting("ShowOthers") === "ON";

  const documents = values
    .slice(1)
    .filter(r => r.join("").trim() !== "")
    .map(r => ({
      department: valueAt_(r, iDepartment),
      docNo: valueAt_(r, iDocNo),
      title: valueAt_(r, iTitle),
      type: valueAt_(r, iType),
      revNo: valueAt_(r, iRevNo),
      revDate: valueAt_(r, iRevDate),
      applicableToWorksite: valueAt_(r, iWorksite),
      status: valueAt_(r, iStatus),

      // Kept only for backward compatibility.
      // Safe to delete the Storage column from the Sheet.
      storage:
        iStorage === -1 ? "" : valueAt_(r, iStorage),

      link: valueAt_(r, iLink),
      videoLink: valueAt_(r, iVideo)
    }))
    .filter(
      d => d.status.toLowerCase() === "active"
    )
    .filter(d => {
      if (showOthers) return true;

      return d.type.toLowerCase() !== "others";
    });

  return {
    success: true,
    documents: documents
  };
}


function getCampaign() {
  const rows = getRows(["Campaign"]);

  const campaign = rows
    .map(r => ({
      active: clean(r[0]),
      title: clean(r[1]),
      description: clean(r[2]),
      imageUrl: clean(r[3])
    }))
    .filter(
      x =>
        x.active.toLowerCase() === "yes"
    );

  return {
    success: true,
    campaign: campaign
  };
}


function getLatestUpdates() {
  const rows = getRows([
    "LatestUpdates",
    "Latest Updates"
  ]);

  const latest = rows
    .map(r => ({
      active: clean(r[0]),
      icon: clean(r[1]) || "📄",
      text: clean(r[2])
    }))
    .filter(
      x =>
        x.active.toLowerCase() === "yes" &&
        x.text
    );

  return {
    success: true,
    latest: latest
  };
}


function getQuickAccess() {
  const rows = getRows(["QuickAccess"]);

  const quick = rows.map(r => ({
    title: clean(r[0]),
    imageUrl: clean(r[1]),
    link: clean(r[2]),
    description: clean(r[3]),
    applicability: clean(r[4]),
    owner: clean(r[5])
  }));

  return {
    success: true,
    quick: quick
  };
}


function getTicker() {
  const rows = getRows(["Ticker"]);

  const ticker = rows
    .map(r => ({
      active: clean(r[0]),
      sort: Number(clean(r[1])) || 9999,
      icon: clean(r[2]),
      message: clean(r[3])
    }))
    .filter(
      x =>
        x.active.toLowerCase() === "yes" &&
        x.message
    )
    .sort(
      (a, b) => a.sort - b.sort
    );

  return {
    success: true,
    ticker: ticker
  };
}


function clean(value) {
  return value
    ? String(value).trim()
    : "";
}
