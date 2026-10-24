/**
 * Tableau de bord de suivi de projet : source de données.
 *
 * Ce script est attaché au tableur, qui reste privé. Déployé en
 * « Application Web », il publie en JSON uniquement les champs utiles
 * au tableau de bord, après application des remplacements de mots
 * définis dans l'onglet « Tableau de bord ».
 *
 * Déploiement : Déployer > Nouveau déploiement > Application Web,
 * « Exécuter en tant que : moi », « Qui a accès : tout le monde ».
 */

const CONFIG_SHEET = 'Tableau de bord';
const DEFAULT_TASK_SHEET = 'BackLog';
const CACHE_KEY = 'dashboard-data';
const CACHE_SECONDS = 60;

// En-têtes reconnus (casse et accents ignorés). La première colonne trouvée l'emporte.
const COLUMNS = {
  id: ['id'],
  category: ['categorie'],
  name: ['nom', 'tache'],
  description: ['description'],
  weight: ['poids'],
  due: ['echeance'],
  deps: ['dependances', 'depend de'],
  done: ['date de realisation', 'realisee le', 'terminee le'],
};

/* ---------- Menu et déclencheurs ---------- */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Tableau de bord')
    .addItem('Vérifier les données', 'verifier')
    .addItem('Créer l’onglet de configuration', 'creerConfiguration')
    .addToUi();
}

/** Toute modification du tableur est visible au prochain chargement de la page. */
function onEdit() {
  CacheService.getScriptCache().remove(CACHE_KEY);
}

/* ---------- Application Web ---------- */

function doGet() {
  let body;
  try {
    const cache = CacheService.getScriptCache();
    body = cache.get(CACHE_KEY);
    if (!body) {
      body = JSON.stringify(buildData_().data);
      if (body.length < 90000) cache.put(CACHE_KEY, body, CACHE_SECONDS);
    }
  } catch (err) {
    // Message volontairement générique : le détail est dans « Vérifier les données ».
    body = JSON.stringify({ error: 'Lecture du tableur impossible' });
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Vérification depuis le tableur ---------- */

function verifier() {
  const ui = SpreadsheetApp.getUi();
  let result;
  try {
    result = buildData_();
  } catch (err) {
    ui.alert('Tableau de bord', '✖ ' + err.message, ui.ButtonSet.OK);
    return;
  }
  const d = result.data;
  const unplanned = d.tasks.filter(function (t) { return !t.due || !t.weight; }).length;
  const done = d.tasks.filter(function (t) { return t.done; }).length;
  const links = d.tasks.reduce(function (s, t) { return s + t.parents.length; }, 0);
  const lines = [
    '✔ ' + d.tasks.length + ' tâches lues (' + done + ' terminées, ' + unplanned + ' non planifiées)',
    '✔ ' + links + ' dépendances, ' + d.milestones.length + ' jalons',
    '✔ Période : ' + d.project.start + ' → ' + d.project.end,
  ];
  if (result.warnings.length) lines.push('', 'À vérifier :', '• ' + result.warnings.join('\n• '));
  const url = ScriptApp.getService().getUrl();
  lines.push('', url ? 'Adresse de l’application Web :\n' + url : 'Application Web pas encore déployée.');
  ui.alert('Tableau de bord', lines.join('\n'), ui.ButtonSet.OK);
}

/* ---------- Lecture ---------- */

function buildData_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const warnings = [];
  const cfg = readConfig_(ss, tz, warnings);

  const sheet = ss.getSheetByName(cfg.taskSheet);
  if (!sheet) throw new Error('Onglet des tâches introuvable : « ' + cfg.taskSheet + ' »');
  const values = sheet.getDataRange().getValues();
  const headerRow = values.findIndex(function (r) {
    const n = r.map(norm_);
    return n.indexOf('id') >= 0 && (n.indexOf('nom') >= 0 || n.indexOf('tache') >= 0);
  });
  if (headerRow < 0) throw new Error('Ligne d’en-tête introuvable (colonnes « Id » et « Nom »)');

  const head = values[headerRow].map(norm_);
  const col = {};
  Object.keys(COLUMNS).forEach(function (key) {
    col[key] = head.findIndex(function (h) { return COLUMNS[key].indexOf(h) >= 0; });
  });
  ['category', 'weight', 'due', 'done'].forEach(function (k) {
    if (col[k] < 0) warnings.push('Colonne absente : « ' + COLUMNS[k][0] + ' »');
  });
  if (col.deps < 0) warnings.push('Colonne « Dépendances » absente : le graphe des dépendances sera vide');

  const clean = function (v) { return redact_(String(v).trim(), cfg.replacements); };
  const cell = function (row, key) { return col[key] >= 0 ? row[col[key]] : ''; };

  const tasks = [];
  const ids = {};
  for (let r = headerRow + 1; r < values.length; r++) {
    const row = values[r];
    const id = toInt_(cell(row, 'id'));
    const name = String(cell(row, 'name')).trim();
    if (!id || !name) continue;
    if (ids[id]) { warnings.push('Id en double : ' + id + ' (seule la première ligne est gardée)'); continue; }
    ids[id] = true;

    const due = toISO_(cell(row, 'due'), tz);
    const done = toISO_(cell(row, 'done'), tz);
    if (String(cell(row, 'due')).trim() && !due) warnings.push('#' + id + ' : échéance illisible');
    if (String(cell(row, 'done')).trim() && !done) warnings.push('#' + id + ' : date de réalisation illisible');

    const task = {
      id: id,
      category: String(cell(row, 'category')).trim() ? clean(cell(row, 'category')) : 'Autres',
      name: clean(name),
      weight: toNumber_(cell(row, 'weight')),
      due: due,
      parents: toIds_(cell(row, 'deps')),
      done: done,
    };
    if (cfg.showDescriptions && String(cell(row, 'description')).trim()) task.description = clean(cell(row, 'description'));
    tasks.push(task);
  }

  tasks.forEach(function (t) {
    t.parents = t.parents.filter(function (p) {
      if (p === t.id) return false;
      if (!ids[p]) { warnings.push('#' + t.id + ' dépend de #' + p + ', qui n’existe pas'); return false; }
      return true;
    });
  });

  const dues = tasks.map(function (t) { return t.due; }).filter(Boolean).sort();
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const start = cfg.start || dues[0] || today;
  const end = cfg.end || dues[dues.length - 1] || today;
  if (!cfg.start) warnings.push('Date de début absente : première échéance utilisée');
  if (!cfg.end) warnings.push('Date de fin absente : dernière échéance utilisée');

  return {
    data: {
      project: { title: cfg.title, subtitle: cfg.subtitle, code: cfg.code, start: start, end: end },
      milestones: cfg.milestones,
      tasks: tasks,
      generatedAt: new Date().toISOString(),
    },
    warnings: warnings,
  };
}

/** Lit l'onglet « Tableau de bord » : paramètres, puis jalons, puis remplacements. */
function readConfig_(ss, tz, warnings) {
  const cfg = {
    title: 'Suivi de projet',
    subtitle: '',
    code: '',
    start: null,
    end: null,
    taskSheet: DEFAULT_TASK_SHEET,
    showDescriptions: false,
    milestones: [],
    replacements: [],
  };
  const sheet = ss.getSheetByName(CONFIG_SHEET);
  if (!sheet) {
    warnings.push('Onglet « ' + CONFIG_SHEET + ' » absent : valeurs par défaut utilisées');
    return cfg;
  }
  let section = 'params';
  sheet.getDataRange().getValues().forEach(function (row) {
    const key = norm_(row[0]);
    const value = row[1];
    if (!key || key === 'parametre') return;
    if (key === 'jalon') { section = 'milestones'; return; }
    if (key === 'remplacer') { section = 'replacements'; return; }
    const text = String(value).trim();
    if (section === 'params') {
      if (key === 'titre') cfg.title = text;
      else if (key === 'sous-titre') cfg.subtitle = text;
      else if (key === 'bandeau') cfg.code = text;
      else if (key === 'debut') cfg.start = toISO_(value, tz);
      else if (key === 'fin') cfg.end = toISO_(value, tz);
      else if (key === 'onglet des taches') { if (text) cfg.taskSheet = text; }
      else if (key === 'afficher les descriptions') cfg.showDescriptions = /^(oui|vrai|true|1|x)$/.test(norm_(value));
    } else if (section === 'milestones') {
      const date = toISO_(value, tz);
      if (date) cfg.milestones.push({ label: String(row[0]).trim(), date: date });
      else warnings.push('Jalon sans date valide : « ' + String(row[0]).trim() + ' »');
    } else {
      cfg.replacements.push([String(row[0]).trim(), value === null || value === undefined ? '' : String(value)]);
    }
  });
  return cfg;
}

/* ---------- Onglet de configuration ---------- */

function creerConfiguration() {
  creerConfiguration_({
    titre: 'Titre du projet',
    sousTitre: 'Sous-titre du projet',
    bandeau: 'Suivi de projet',
    debut: null,
    fin: null,
    jalons: [['Premier jalon', null]],
    remplacements: [],
  });
}

/**
 * Crée (ou recrée, si `o.ecraser`) l'onglet de configuration.
 * Dates au format AAAA-MM-JJ ou null.
 */
function creerConfiguration_(o) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  let sheet = ss.getSheetByName(CONFIG_SHEET);
  if (sheet && !o.ecraser) {
    ui.alert('L’onglet « ' + CONFIG_SHEET + ' » existe déjà.');
    return;
  }
  if (sheet) sheet.clear();
  else sheet = ss.insertSheet(CONFIG_SHEET);

  const date = function (iso) {
    if (!iso) return '';
    const p = iso.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  };
  const rows = [
    ['Paramètre', 'Valeur', 'Aide'],
    ['Titre', o.titre, 'Grand titre du tableau de bord'],
    ['Sous-titre', o.sousTitre, 'Ligne sous le titre'],
    ['Bandeau', o.bandeau, 'Petit texte au-dessus du titre (peut rester vide)'],
    ['Début', date(o.debut), 'Début du projet (point de départ des courbes)'],
    ['Fin', date(o.fin), 'Fin du projet'],
    ['Onglet des tâches', DEFAULT_TASK_SHEET, 'Nom de l’onglet qui contient le backlog'],
    ['Afficher les descriptions', false, 'Cochez pour publier la colonne Description'],
    ['', '', ''],
    ['Jalon', 'Date', 'Un jalon par ligne'],
  ];
  o.jalons.forEach(function (j) { rows.push([j[0], date(j[1]), '']); });
  rows.push(['', '', ''], ['Remplacer', 'Par', 'Mots remplacés partout sur la page publiée (noms, lieux…)']);
  o.remplacements.forEach(function (r) { rows.push([r[0], r[1], '']); });

  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  sheet.getRange(8, 2).insertCheckboxes();
  if (o.descriptions) sheet.getRange(8, 2).check();
  sheet.getRange(5, 2, 2, 1).setNumberFormat('dd/mm/yyyy');
  sheet.getRange(11, 2, Math.max(1, o.jalons.length), 1).setNumberFormat('dd/mm/yyyy');
  [1, 10, 12 + o.jalons.length].forEach(function (r) {
    sheet.getRange(r, 1, 1, 3).setFontWeight('bold').setBackground('#eef2f7');
  });
  sheet.getRange(1, 3, rows.length, 1).setFontColor('#80868b');
  sheet.setColumnWidth(1, 240);
  sheet.setColumnWidth(2, 320);
  sheet.setColumnWidth(3, 420);
  sheet.setFrozenRows(1);
  ss.setActiveSheet(sheet);
}

/* ---------- Utilitaires ---------- */

function norm_(v) {
  return String(v === null || v === undefined ? '' : v)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '\'')
    .replace(/\s+/g, ' ')
    .trim();
}

function toISO_(v, tz) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return isNaN(v.getTime()) ? null : Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  const s = String(v === null || v === undefined ? '' : v).trim();
  let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1] + '-' + m[2] + '-' + m[3] : null;
}

function toNumber_(v) {
  if (typeof v === 'number') return isFinite(v) && v > 0 ? v : null;
  const n = parseFloat(String(v).replace(',', '.'));
  return isFinite(n) && n > 0 ? n : null;
}

function toInt_(v) {
  const n = Number(v);
  return isFinite(n) && n > 0 ? Math.round(n) : null;
}

function toIds_(v) {
  return String(v === null || v === undefined ? '' : v)
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(Number);
}

/** Remplace des mots entiers, sans tenir compte de la casse. */
function redact_(text, replacements) {
  return replacements.reduce(function (s, r) {
    if (!r[0]) return s;
    const escaped = r[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return s.replace(new RegExp('(^|[^\\p{L}\\p{N}])' + escaped + '(?=$|[^\\p{L}\\p{N}])', 'giu'), '$1' + r[1]);
  }, text);
}
