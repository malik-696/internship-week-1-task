/* ==========================================================================
   Student Performance Analytics Portal — app.js
   Front-end only prototype. "Backend" behaviour (auth, roles, password
   reset, notifications, preferences) is simulated with localStorage.

   PERFORMANCE NOTES (see task: "optimize JavaScript for better performance"):
   - DOM lookups for elements that are queried often are cached once in
     the `dom` object below instead of re-running getElementById per call.
   - Table rows (report + teacher table) use ONE delegated click listener
     on the tbody instead of attaching a listener per <tr>, so redraws
     stay cheap even as row counts grow.
   - Search inputs are debounced so filtering doesn't run on every
     keystroke while typing fast.
   - Row/element HTML is built as a single string and assigned once via
     innerHTML (one reflow) rather than many incremental DOM writes.
   ========================================================================== */

/* ---------------------------------------------------------------------- */
/* Demo data                                                               */
/* ---------------------------------------------------------------------- */
const SUBJECTS = ["Mathematics", "Science", "English", "History", "Computer Science"];

const STUDENTS = [
  { id: 1, name: "Aisha Khan", className: "Grade 10 - A", attendance: 96, scores: { Mathematics: 92, Science: 88, English: 85, History: 79, "Computer Science": 95 }, trend: [78,82,85,88,90,92] },
  { id: 2, name: "Bilal Ahmed", className: "Grade 10 - A", attendance: 88, scores: { Mathematics: 74, Science: 70, English: 68, History: 72, "Computer Science": 80 }, trend: [70,68,72,71,74,74] },
  { id: 3, name: "Sara Malik", className: "Grade 10 - B", attendance: 92, scores: { Mathematics: 65, Science: 60, English: 72, History: 58, "Computer Science": 66 }, trend: [55,58,60,62,64,64] },
  { id: 4, name: "Usman Tariq", className: "Grade 9 - A", attendance: 79, scores: { Mathematics: 48, Science: 52, English: 55, History: 50, "Computer Science": 45 }, trend: [60,55,52,50,49,48] },
  { id: 5, name: "Fatima Noor", className: "Grade 9 - B", attendance: 98, scores: { Mathematics: 97, Science: 95, English: 91, History: 93, "Computer Science": 96 }, trend: [90,92,93,95,96,97] },
  { id: 6, name: "Hamza Riaz", className: "Grade 10 - B", attendance: 84, scores: { Mathematics: 61, Science: 66, English: 64, History: 69, "Computer Science": 60 }, trend: [66,64,63,62,61,61] },
  { id: 7, name: "Zainab Idrees", className: "Grade 9 - A", attendance: 90, scores: { Mathematics: 83, Science: 81, English: 87, History: 84, "Computer Science": 79 }, trend: [76,78,80,81,82,83] },
  { id: 8, name: "Ali Raza", className: "Grade 10 - A", attendance: 71, scores: { Mathematics: 39, Science: 44, English: 41, History: 47, "Computer Science": 38 }, trend: [50,47,45,42,40,39] },
  { id: 9, name: "Mahnoor Iqbal", className: "Grade 9 - B", attendance: 94, scores: { Mathematics: 88, Science: 90, English: 86, History: 82, "Computer Science": 91 }, trend: [80,82,84,86,87,88] },
  { id: 10, name: "Danish Farooq", className: "Grade 10 - B", attendance: 86, scores: { Mathematics: 70, Science: 73, English: 68, History: 71, "Computer Science": 75 }, trend: [65,67,68,69,70,70] },
];

function avgScore(student){
  const vals = Object.values(student.scores);
  return Math.round(vals.reduce((a,b)=>a+b,0) / vals.length);
}
function letterGrade(avg){
  if(avg >= 90) return "A+";
  if(avg >= 80) return "A";
  if(avg >= 70) return "B";
  if(avg >= 60) return "C";
  if(avg >= 50) return "D";
  return "F";
}
function gradeClass(letter){
  if(letter === "A+" || letter === "A") return "grade-A";
  if(letter === "B") return "grade-B";
  if(letter === "C") return "grade-C";
  return "grade-D";
}
function pillClass(avg){
  if(avg >= 75) return "pill-good";
  if(avg >= 55) return "pill-warn";
  return "pill-bad";
}
function gpaOf(avg){ return (avg/100*4).toFixed(2); }
function initialsOf(name){
  return name.split(" ").map(p=>p[0]).slice(0,2).join("").toUpperCase();
}
STUDENTS.forEach(s => { s.avg = avgScore(s); s.gpa = gpaOf(s.avg); s.grade = letterGrade(s.avg); });
STUDENTS.sort((a,b)=>b.avg-a.avg).forEach((s,i)=> s.rank = i+1);

const ALL_CLASSES = [...new Set(STUDENTS.map(s => s.className))].sort();

/* ---------------------------------------------------------------------- */
/* Storage helpers (simulated backend)                                     */
/* ---------------------------------------------------------------------- */
const STORE_USERS   = "spap_users";
const STORE_SESSION = "spap_session";
const STORE_RESET   = "spap_reset_token";
const STORE_THEME   = "spap_theme";
const STORE_NOTIFS  = "spap_notif_reads"; // { [email]: [notifId, ...] }

function getUsers(){
  try { return JSON.parse(localStorage.getItem(STORE_USERS)) || []; }
  catch(e){ return []; }
}
function saveUsers(list){ localStorage.setItem(STORE_USERS, JSON.stringify(list)); }

function seedDemoUsers(){
  const users = getUsers();
  const seed = [
    { name:"Demo User",      email:"demo@spap.edu",    password:"Demo1234",  role:"student", studentId:1, classes:[] },
    { name:"Ayesha Farooqi", email:"teacher@spap.edu",  password:"Teacher123",role:"teacher", studentId:null, classes:["Grade 10 - A","Grade 9 - A"] },
    { name:"Imran Sheikh",   email:"admin@spap.edu",    password:"Admin123",  role:"admin",   studentId:null, classes:[] },
  ];
  let changed = false;
  seed.forEach(u => {
    if(!users.find(x => x.email === u.email)){ users.push(u); changed = true; }
  });
  if(changed) saveUsers(users);
}
seedDemoUsers();

function getSession(){
  try { return JSON.parse(localStorage.getItem(STORE_SESSION)); }
  catch(e){ return null; }
}
function setSession(user){
  localStorage.setItem(STORE_SESSION, JSON.stringify({
    name: user.name, email: user.email, role: user.role || "student",
    studentId: user.studentId || null, classes: user.classes || []
  }));
}
function clearSession(){ localStorage.removeItem(STORE_SESSION); }
function currentRole(){ return (getSession() && getSession().role) || "guest"; }

/* ---------------------------------------------------------------------- */
/* Toasts                                                                  */
/* ---------------------------------------------------------------------- */
function showToast(message, type="info"){
  const region = dom.toastRegion;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.setAttribute("role", "status");
  el.textContent = message;
  region.appendChild(el);
  setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateY(8px)"; setTimeout(()=>el.remove(), 250); }, 3200);
}

/* ---------------------------------------------------------------------- */
/* Cached DOM references (performance: avoid repeated getElementById)      */
/* ---------------------------------------------------------------------- */
const dom = {};
function cacheDom(){
  [
    "toast-region","nav-links","hamburger-btn","nav-user","nav-guest",
    "nav-avatar-initials","logout-btn","theme-toggle-btn",
    "notif-btn","notif-panel","notif-list","notif-count","notif-mark-all",
    "account-btn","account-panel","account-panel-initials","account-panel-name","account-panel-role",
    "year",
  ].forEach(id => { dom[toCamel(id)] = document.getElementById(id); });
  dom.toastRegion = document.getElementById("toast-region");
}
function toCamel(id){ return id.replace(/-([a-z0-9])/g, (_,c)=>c.toUpperCase()); }

/* ---------------------------------------------------------------------- */
/* Debounce utility (performance: avoid re-filtering on every keystroke)   */
/* ---------------------------------------------------------------------- */
function debounce(fn, wait=150){
  let t;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(()=> fn.apply(this, args), wait);
  };
}

/* ---------------------------------------------------------------------- */
/* Theme (dark / light mode)                                               */
/* ---------------------------------------------------------------------- */
function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORE_THEME, theme);
  if(dom.themeToggleBtn) dom.themeToggleBtn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  const radios = document.querySelectorAll('input[name="theme-pref"]');
  radios.forEach(r => { r.checked = (r.value === theme); });
}
function currentTheme(){ return document.documentElement.getAttribute("data-theme") || "light"; }
function toggleTheme(){ applyTheme(currentTheme() === "dark" ? "light" : "dark"); }
function initThemeControls(){
  dom.themeToggleBtn.addEventListener("click", toggleTheme);
  document.querySelectorAll('input[name="theme-pref"]').forEach(radio => {
    radio.addEventListener("change", () => {
      if(radio.value === "system"){
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        applyTheme(prefersDark ? "dark" : "light");
        localStorage.removeItem(STORE_THEME);
      } else {
        applyTheme(radio.value);
      }
    });
  });
  const radios = document.querySelectorAll('input[name="theme-pref"]');
  if(!localStorage.getItem(STORE_THEME) && radios.length){
    radios.forEach(r => r.checked = r.value === "system");
  }
}

/* ---------------------------------------------------------------------- */
/* Notifications                                                           */
/* ---------------------------------------------------------------------- */
const NOTIF_TEMPLATES = {
  student: [
    { id:"s1", title:"New Mathematics score posted", when:"2h ago" },
    { id:"s2", title:"Attendance updated for this week", when:"1d ago" },
    { id:"s3", title:"English essay feedback is ready", when:"3d ago" },
  ],
  teacher: [
    { id:"t1", title:"3 assignments awaiting grading", when:"1h ago" },
    { id:"t2", title:"Usman Tariq's attendance dropped below 80%", when:"5h ago" },
    { id:"t3", title:"New student added to Grade 9 - A", when:"2d ago" },
  ],
  admin: [
    { id:"a1", title:"2 new accounts registered today", when:"30m ago" },
    { id:"a2", title:"Grade 10 - B average dropped this term", when:"6h ago" },
    { id:"a3", title:"Monthly performance export is ready", when:"1d ago" },
  ],
};
function getReadIds(email){
  try { return (JSON.parse(localStorage.getItem(STORE_NOTIFS)) || {})[email] || []; }
  catch(e){ return []; }
}
function setReadIds(email, ids){
  let store = {};
  try { store = JSON.parse(localStorage.getItem(STORE_NOTIFS)) || {}; } catch(e){ store = {}; }
  store[email] = ids;
  localStorage.setItem(STORE_NOTIFS, JSON.stringify(store));
}
function renderNotifications(){
  const session = getSession();
  if(!session) return;
  const items = NOTIF_TEMPLATES[session.role] || [];
  const readIds = getReadIds(session.email);
  const unread = items.filter(i => !readIds.includes(i.id)).length;

  dom.notifCount.textContent = String(unread);
  dom.notifCount.hidden = unread === 0;

  if(items.length === 0){
    dom.notifList.innerHTML = `<div class="notif-empty">You're all caught up.</div>`;
    return;
  }
  dom.notifList.innerHTML = items.map(i => `
    <div class="notif-item ${readIds.includes(i.id) ? "read" : ""}" data-id="${i.id}">
      <span class="dot" aria-hidden="true"></span>
      <div class="body"><p>${i.title}</p><span>${i.when}</span></div>
    </div>
  `).join("");
}
function markAllNotifsRead(){
  const session = getSession();
  if(!session) return;
  const items = NOTIF_TEMPLATES[session.role] || [];
  setReadIds(session.email, items.map(i => i.id));
  renderNotifications();
}

/* ---------------------------------------------------------------------- */
/* Popovers (notifications + account menu) — shared open/close logic       */
/* ---------------------------------------------------------------------- */
function initPopovers(){
  const pairs = [
    { btn: dom.notifBtn, panel: dom.notifPanel, onOpen: renderNotifications },
    { btn: dom.accountBtn, panel: dom.accountPanel, onOpen: renderAccountPanel },
  ];

  pairs.forEach(({ btn, panel, onOpen }) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !panel.classList.contains("open");
      pairs.forEach(p => { p.panel.classList.remove("open"); p.btn.setAttribute("aria-expanded","false"); });
      if(willOpen){
        panel.classList.add("open");
        btn.setAttribute("aria-expanded","true");
        if(onOpen) onOpen();
      }
    });
  });

  document.addEventListener("click", () => {
    pairs.forEach(p => { p.panel.classList.remove("open"); p.btn.setAttribute("aria-expanded","false"); });
  });
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape"){
      pairs.forEach(p => { p.panel.classList.remove("open"); p.btn.setAttribute("aria-expanded","false"); });
    }
  });
  document.querySelectorAll(".popover").forEach(p => p.addEventListener("click", e => e.stopPropagation()));

  dom.notifMarkAll.addEventListener("click", markAllNotifsRead);

  // delegated: clicking a notification marks just that one as read
  dom.notifList.addEventListener("click", (e) => {
    const item = e.target.closest(".notif-item");
    if(!item) return;
    const session = getSession();
    if(!session) return;
    const ids = getReadIds(session.email);
    if(!ids.includes(item.dataset.id)){
      ids.push(item.dataset.id);
      setReadIds(session.email, ids);
      renderNotifications();
    }
  });
}
function renderAccountPanel(){
  const session = getSession();
  if(!session) return;
  dom.accountPanelInitials.textContent = initialsOf(session.name);
  dom.accountPanelName.textContent = session.name;
  dom.accountPanelRole.textContent = session.role.charAt(0).toUpperCase() + session.role.slice(1);
}

/* ---------------------------------------------------------------------- */
/* Router                                                                  */
/* ---------------------------------------------------------------------- */
const routes = ["home","about","dashboard","report","profile","contact","login","register","forgot","reset","account"];
const AUTH_ROUTES = new Set(["dashboard","account"]);

function parseHash(){
  const raw = (location.hash || "#/home").replace(/^#\/?/, "");
  const [route, param] = raw.split("/");
  return { route: routes.includes(route) ? route : "home", param };
}
function navigate(route, param){
  location.hash = param ? `/${route}/${param}` : `/${route}`;
}

function renderRoute(){
  let { route, param } = parseHash();

  if(AUTH_ROUTES.has(route) && !getSession()){
    showToast("Please log in to continue.", "info");
    route = "login";
    history.replaceState(null, "", "#/login");
  }

  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const target = document.getElementById(`view-${route}`);
  if(target) target.classList.add("active");
  window.scrollTo({ top: 0, behavior: "auto" });

  updateAuthUI(); // must run before dashboard render so role-based visibility is correct
  closeMobileNav();

  if(route === "dashboard") renderDashboard();
  if(route === "report") renderReport();
  if(route === "profile") renderProfile(param);
  if(route === "account") renderAccountSettings();

  document.querySelectorAll(".nav-links a").forEach(a=>{
    const active = a.dataset.route === route;
    a.classList.toggle("active", active);
    if(active) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current");
  });
}
window.addEventListener("hashchange", renderRoute);

/* ---------------------------------------------------------------------- */
/* Nav auth + role-based menu visibility                                   */
/* ---------------------------------------------------------------------- */
function updateAuthUI(){
  const session = getSession();
  const role = session ? session.role : "guest";

  dom.navGuest.style.display = session ? "none" : "flex";
  dom.navUser.style.display = session ? "flex" : "none";

  if(session){
    dom.navAvatarInitials.textContent = initialsOf(session.name);
    renderNotifications();
  }

  // Show/hide nav links per role (single pass, no DOM rebuild — cheap)
  document.querySelectorAll("#nav-links a[data-roles]").forEach(a => {
    const roles = a.dataset.roles.split(",");
    a.parentElement.style.display = roles.includes(role) ? "" : "none";
  });
}

/* ---------------------------------------------------------------------- */
/* Mobile nav                                                              */
/* ---------------------------------------------------------------------- */
function closeMobileNav(){
  dom.navLinks.classList.remove("open");
  dom.hamburgerBtn.setAttribute("aria-expanded","false");
}
function initMobileNav(){
  dom.hamburgerBtn.addEventListener("click", () => {
    const open = dom.navLinks.classList.toggle("open");
    dom.hamburgerBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

/* ---------------------------------------------------------------------- */
/* Count-up animation                                                      */
/* ---------------------------------------------------------------------- */
function countUp(el, target, opts = {}){
  const duration = opts.duration || 900;
  const decimals = opts.decimals || 0;
  const suffix = opts.suffix || "";
  if(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    el.textContent = target.toFixed(decimals) + suffix;
    return;
  }
  const start = performance.now();
  function tick(now){
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = (target * eased).toFixed(decimals);
    el.textContent = val + suffix;
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function buildStatCard({ label, value, decimals, suffix, trend }){
  const trendClass = trend > 0 ? "trend-up" : trend < 0 ? "trend-down" : "trend-flat";
  const trendLabel = trend > 0 ? "▲ improving" : trend < 0 ? "▼ needs focus" : "— steady";
  return `
    <div class="card stat-card">
      <div class="stat-top">
        <span class="badge-eyebrow">${label}</span>
        <span class="stat-trend ${trendClass}">${trendLabel}</span>
      </div>
      <div class="stat-value mono" data-target="${value}" data-decimals="${decimals}" data-suffix="${suffix}">0</div>
      <div class="progress-track"><div class="progress-fill"></div></div>
    </div>
  `;
}
function animateStatGrid(grid, cards){
  grid.querySelectorAll(".stat-card").forEach((card, i) => {
    const c = cards[i];
    const valueEl = card.querySelector(".stat-value");
    countUp(valueEl, parseFloat(c.value), { decimals:c.decimals, suffix:c.suffix, duration:1000 });
    const pct = c.pct !== undefined ? c.pct : Math.min(100, parseFloat(c.value));
    requestAnimationFrame(()=> setTimeout(()=>{ card.querySelector(".progress-fill").style.width = Math.max(4,pct) + "%"; }, 60));
  });
}

/* ---------------------------------------------------------------------- */
/* Dashboard dispatcher — role-based layouts                               */
/* ---------------------------------------------------------------------- */
function currentStudent(){
  const session = getSession();
  const id = session && session.studentId ? session.studentId : 1;
  return STUDENTS.find(s => s.id === id) || STUDENTS[0];
}
function renderDashboard(){
  const role = currentRole();
  document.querySelectorAll(".dash-role").forEach(el => el.classList.remove("active"));
  const target = document.getElementById(`dash-role-${role === "guest" ? "student" : role}`);
  if(target) target.classList.add("active");

  if(role === "teacher") renderTeacherDashboard();
  else if(role === "admin") renderAdminDashboard();
  else renderStudentDashboard();
}

/* ---- Student dashboard ---- */
function renderStudentDashboard(){
  const student = currentStudent();
  document.getElementById("dash-welcome-name").textContent = (getSession()?.name || student.name).split(" ")[0];

  const trendDelta = student.trend[5]-student.trend[4];
  const cards = [
    { label:"Overall GPA", value: student.gpa, decimals:2, trend: trendDelta, suffix:"", pct: parseFloat(student.gpa)/4*100 },
    { label:"Average Score", value: student.avg, decimals:0, trend: trendDelta, suffix:"%" },
    { label:"Attendance", value: student.attendance, decimals:0, trend: student.attendance>=90?1:(student.attendance>=80?0:-1), suffix:"%" },
    { label:"Class Rank", value: student.rank, decimals:0, trend:0, suffix:` / ${STUDENTS.length}`, pct: Math.max(6, 100 - (student.rank/STUDENTS.length*100)) },
  ];
  const grid = document.getElementById("dash-stat-grid");
  grid.innerHTML = cards.map(buildStatCard).join("");
  animateStatGrid(grid, cards);

  const stamp = document.getElementById("dash-grade-stamp");
  stamp.textContent = student.grade;
  stamp.className = `grade-stamp ${gradeClass(student.grade)}`;

  const subjWrap = document.getElementById("dash-subject-list");
  subjWrap.innerHTML = SUBJECTS.map(subj => `
    <div class="subject-row">
      <span class="subj-name">${subj}</span>
      <div class="bar-track"><div class="bar-fill" data-w="${student.scores[subj]}"></div></div>
      <span class="score mono">${student.scores[subj]}</span>
    </div>
  `).join("");
  requestAnimationFrame(()=> setTimeout(()=>{
    subjWrap.querySelectorAll(".bar-fill").forEach(b => b.style.width = b.dataset.w + "%");
  }, 80));

  const activityBody = document.getElementById("dash-activity-body");
  const activities = [
    { label:"Mid-term Mathematics test graded", when:"2 days ago", pill: pillClass(student.scores.Mathematics) },
    { label:"Science lab report submitted", when:"4 days ago", pill: "pill-good" },
    { label:"Attendance recorded for the week", when:"1 week ago", pill: student.attendance>=90?"pill-good":"pill-warn" },
    { label:"English essay feedback published", when:"1 week ago", pill: pillClass(student.scores.English) },
  ];
  activityBody.innerHTML = activities.map(a => `
    <tr>
      <td>${a.label}</td>
      <td><span class="pill ${a.pill}">Updated</span></td>
      <td class="mono" style="color:var(--text-muted-soft)">${a.when}</td>
    </tr>
  `).join("");
}

/* ---- Teacher dashboard ---- */
let teacherSearchQuery = "";
function myClasses(){
  const session = getSession();
  return (session && session.classes && session.classes.length) ? session.classes : [ALL_CLASSES[0]];
}
function myStudents(){
  const classes = myClasses();
  return STUDENTS.filter(s => classes.includes(s.className));
}
function renderTeacherDashboard(){
  const session = getSession();
  document.getElementById("teacher-welcome-name").textContent = (session?.name || "Teacher").split(" ")[0];
  const classes = myClasses();
  document.getElementById("teacher-classes-sub").textContent = `Teaching ${classes.join(" · ")}`;

  const students = myStudents();
  const avgOfClass = students.length ? Math.round(students.reduce((a,s)=>a+s.avg,0)/students.length) : 0;
  const attOfClass = students.length ? Math.round(students.reduce((a,s)=>a+s.attendance,0)/students.length) : 0;
  const atRisk = students.filter(s => s.avg < 55 || s.attendance < 80).length;

  const cards = [
    { label:"My classes", value: classes.length, decimals:0, trend:0, suffix:"", pct: Math.min(100, classes.length*25) },
    { label:"Students taught", value: students.length, decimals:0, trend:0, suffix:"", pct: Math.min(100, students.length*8) },
    { label:"Class average", value: avgOfClass, decimals:0, trend: avgOfClass>=70?1:-1, suffix:"%" },
    { label:"Students at risk", value: atRisk, decimals:0, trend: atRisk>0?-1:1, suffix:"", pct: Math.min(100, atRisk*20) },
  ];
  const grid = document.getElementById("teacher-stat-grid");
  grid.innerHTML = cards.map(buildStatCard).join("");
  animateStatGrid(grid, cards);

  drawTeacherTable();
}
function drawTeacherTable(){
  const tbody = document.getElementById("teacher-table-body");
  const q = teacherSearchQuery;
  const rows = myStudents().filter(s => s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q));

  if(rows.length === 0){
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No students match your search.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(s => `
    <tr data-id="${s.id}">
      <td><div class="name-cell"><span class="mini-avatar">${initialsOf(s.name)}</span>${s.name}</div></td>
      <td>${s.className}</td>
      <td class="mono">${s.gpa}</td>
      <td><span class="pill ${pillClass(s.avg)}">${s.avg}% · ${s.grade}</span></td>
      <td class="mono">${s.attendance}%</td>
    </tr>
  `).join("");
}

/* ---- Admin dashboard ---- */
function renderAdminDashboard(){
  const session = getSession();
  document.getElementById("admin-welcome-name").textContent = (session?.name || "Admin").split(" ")[0];

  const users = getUsers();
  const teacherCount = users.filter(u => u.role === "teacher").length;
  const schoolAvg = Math.round(STUDENTS.reduce((a,s)=>a+s.avg,0)/STUDENTS.length);

  const cards = [
    { label:"Total students", value: STUDENTS.length, decimals:0, trend:0, suffix:"", pct: Math.min(100, STUDENTS.length*6) },
    { label:"Total teachers", value: teacherCount, decimals:0, trend:0, suffix:"", pct: Math.min(100, teacherCount*20) },
    { label:"Classes", value: ALL_CLASSES.length, decimals:0, trend:0, suffix:"", pct: Math.min(100, ALL_CLASSES.length*20) },
    { label:"School-wide average", value: schoolAvg, decimals:0, trend: schoolAvg>=70?1:-1, suffix:"%" },
  ];
  const grid = document.getElementById("admin-stat-grid");
  grid.innerHTML = cards.map(buildStatCard).join("");
  animateStatGrid(grid, cards);

  // average per class
  const classList = document.getElementById("admin-class-list");
  classList.innerHTML = ALL_CLASSES.map(cls => {
    const rows = STUDENTS.filter(s => s.className === cls);
    const avg = Math.round(rows.reduce((a,s)=>a+s.avg,0)/rows.length);
    return `
      <div class="subject-row">
        <span class="subj-name">${cls}</span>
        <div class="bar-track"><div class="bar-fill" data-w="${avg}"></div></div>
        <span class="score mono">${avg}</span>
      </div>`;
  }).join("");
  requestAnimationFrame(()=> setTimeout(()=>{
    classList.querySelectorAll(".bar-fill").forEach(b => b.style.width = b.dataset.w + "%");
  }, 80));

  // top performers
  const topBody = document.getElementById("admin-top-body");
  topBody.innerHTML = STUDENTS.slice(0,5).map(s => `
    <tr data-id="${s.id}" style="cursor:pointer;">
      <td><div class="name-cell"><span class="mini-avatar">${initialsOf(s.name)}</span>${s.name}</div></td>
      <td>${s.className}</td>
      <td><span class="pill ${pillClass(s.avg)}">${s.avg}%</span></td>
    </tr>
  `).join("");

  // manage accounts
  drawUserManagementTable();
}
function drawUserManagementTable(){
  const tbody = document.getElementById("admin-users-body");
  const users = getUsers();
  if(users.length === 0){
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No registered accounts yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr data-email="${u.email}">
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span class="role-badge role-${u.role}">${u.role}</span></td>
      <td class="row-actions"><button type="button" class="admin-delete-user" ${u.email === (getSession()?.email) ? "disabled title='Cannot remove your own account'" : ""}>Remove</button></td>
    </tr>
  `).join("");
}

/* ---------------------------------------------------------------------- */
/* Report / search / filter / sort                                        */
/* ---------------------------------------------------------------------- */
let reportState = { query: "", classFilter: "all", sortKey: "rank", sortDir: "asc" };
let reportInitialized = false;

function visibleStudentsForReport(){
  // Teachers only see their own classes in the report view; students & admins see everyone.
  if(currentRole() === "teacher") return STUDENTS.filter(s => myClasses().includes(s.className));
  return STUDENTS;
}

function renderReport(){
  const searchInput = document.getElementById("report-search");
  const classSelect = document.getElementById("report-class-filter");

  if(classSelect.options.length <= 1){
    ALL_CLASSES.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c; opt.textContent = c;
      classSelect.appendChild(opt);
    });
  }

  searchInput.value = reportState.query;
  classSelect.value = reportState.classFilter;
  drawReportTable();

  if(!reportInitialized){
    reportInitialized = true;
    searchInput.addEventListener("input", debounce((e) => {
      reportState.query = e.target.value.toLowerCase();
      drawReportTable();
    }, 150));
    classSelect.addEventListener("change", (e) => {
      reportState.classFilter = e.target.value;
      drawReportTable();
    });
    document.querySelector("#report-table thead").addEventListener("click", (e) => {
      const th = e.target.closest("th[data-key]");
      if(!th) return;
      const key = th.dataset.key;
      if(reportState.sortKey === key) reportState.sortDir = reportState.sortDir === "asc" ? "desc" : "asc";
      else { reportState.sortKey = key; reportState.sortDir = "asc"; }
      drawReportTable();
    });
    // delegated row click -> open profile (performance: one listener, not one per row)
    document.getElementById("report-table-body").addEventListener("click", (e) => {
      const tr = e.target.closest("tr[data-id]");
      if(tr) navigate("profile", tr.dataset.id);
    });
  }
}

function drawReportTable(){
  let rows = visibleStudentsForReport().filter(s => {
    const matchesQuery = s.name.toLowerCase().includes(reportState.query) || s.className.toLowerCase().includes(reportState.query);
    const matchesClass = reportState.classFilter === "all" || s.className === reportState.classFilter;
    return matchesQuery && matchesClass;
  });

  rows = rows.slice().sort((a,b) => {
    let av = a[reportState.sortKey], bv = b[reportState.sortKey];
    if(typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
    if(av < bv) return reportState.sortDir === "asc" ? -1 : 1;
    if(av > bv) return reportState.sortDir === "asc" ? 1 : -1;
    return 0;
  });

  document.querySelectorAll("#report-table thead th[data-key]").forEach(th => {
    th.classList.toggle("sorted", th.dataset.key === reportState.sortKey);
    const arrow = th.querySelector(".arrow");
    if(arrow) arrow.textContent = th.dataset.key === reportState.sortKey ? (reportState.sortDir === "asc" ? "↑" : "↓") : "↕";
  });

  const tbody = document.getElementById("report-table-body");
  const emptyState = document.getElementById("report-empty");

  if(rows.length === 0){
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    document.getElementById("report-count").textContent = "0 students";
    return;
  }
  emptyState.style.display = "none";
  document.getElementById("report-count").textContent = `${rows.length} student${rows.length===1?"":"s"}`;

  tbody.innerHTML = rows.map(s => `
    <tr data-id="${s.id}" tabindex="0">
      <td class="mono">#${s.rank}</td>
      <td><div class="name-cell"><span class="mini-avatar">${initialsOf(s.name)}</span>${s.name}</div></td>
      <td>${s.className}</td>
      <td class="mono">${s.gpa}</td>
      <td><span class="pill ${pillClass(s.avg)}">${s.avg}% · ${s.grade}</span></td>
      <td class="mono">${s.attendance}%</td>
    </tr>
  `).join("");
}

/* ---------------------------------------------------------------------- */
/* Profile page                                                            */
/* ---------------------------------------------------------------------- */
function renderProfile(idParam){
  const id = parseInt(idParam, 10) || currentStudent().id;
  const student = STUDENTS.find(s => s.id === id) || currentStudent();

  document.getElementById("profile-avatar-initials").textContent = initialsOf(student.name);
  document.getElementById("profile-name").textContent = student.name;
  document.getElementById("profile-meta-sub").textContent = `${student.className} · Student ID SPAP-${String(student.id).padStart(4,"0")}`;
  document.getElementById("profile-gpa-badge").textContent = `GPA ${student.gpa}`;

  const subjWrap = document.getElementById("profile-subject-list");
  subjWrap.innerHTML = SUBJECTS.map(subj => `
    <div class="subject-row">
      <span class="subj-name">${subj}</span>
      <div class="bar-track"><div class="bar-fill" data-w="${student.scores[subj]}" style="background:${student.scores[subj]>=75?'var(--grade-good)':student.scores[subj]>=55?'var(--grade-warn)':'var(--grade-bad)'}"></div></div>
      <span class="score mono">${student.scores[subj]}</span>
    </div>
  `).join("");
  requestAnimationFrame(()=> setTimeout(()=> subjWrap.querySelectorAll(".bar-fill").forEach(b => b.style.width = b.dataset.w + "%"), 80));

  const ring = document.getElementById("profile-ring-fg");
  const circumference = 2 * Math.PI * 52;
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${circumference}`;
  setTimeout(() => {
    const offset = circumference - (student.attendance/100)*circumference;
    ring.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.22,.9,.3,1)";
    ring.style.strokeDashoffset = offset;
  }, 100);
  document.getElementById("profile-ring-value").textContent = student.attendance + "%";

  const spark = document.getElementById("profile-sparkline");
  const w = 240, h = 60, max = 100, min = 40;
  const pts = student.trend.map((v,i) => {
    const x = (i/(student.trend.length-1)) * w;
    const y = h - ((v-min)/(max-min))*h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  spark.innerHTML = `
    <polyline points="${pts}" fill="none" stroke="var(--slate)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${student.trend.map((v,i) => {
      const x = (i/(student.trend.length-1)) * w;
      const y = h - ((v-min)/(max-min))*h;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="var(--chalk-yellow)" stroke="var(--ink)" stroke-width="1"/>`;
    }).join("")}
  `;

  const stamp = document.getElementById("profile-grade-stamp");
  stamp.textContent = student.grade;
  stamp.className = `grade-stamp ${gradeClass(student.grade)}`;
  document.getElementById("profile-back-btn").onclick = () => navigate("report");
}

/* ---------------------------------------------------------------------- */
/* Form validation helpers                                                 */
/* ---------------------------------------------------------------------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(fieldEl, message){
  fieldEl.classList.add("error");
  const msg = fieldEl.querySelector(".error-msg");
  if(msg) msg.textContent = message;
}
function clearFieldError(fieldEl){ fieldEl.classList.remove("error"); }
function validateField(fieldEl, condition, message){
  if(condition){ clearFieldError(fieldEl); return true; }
  setFieldError(fieldEl, message);
  return false;
}
function togglePasswordVisibility(btn){
  const input = btn.closest(".input-row").querySelector("input");
  const isPass = input.type === "password";
  input.type = isPass ? "text" : "password";
  btn.textContent = isPass ? "Hide" : "Show";
}
function passwordStrength(pw){
  let score = 0;
  if(pw.length >= 6) score++;
  if(pw.length >= 10) score++;
  if(/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if(/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}
function renderStrength(meterEl, pw){
  const bars = meterEl.querySelectorAll("span");
  const strength = passwordStrength(pw);
  const colors = ["var(--grade-bad)","var(--grade-bad)","var(--grade-warn)","var(--grade-good)","var(--grade-good)"];
  bars.forEach((b,i) => { b.style.background = i < strength ? colors[strength] : "var(--paper-line)"; });
}

/* ---------------------------------------------------------------------- */
/* Auth forms                                                              */
/* ---------------------------------------------------------------------- */
function initAuthForms(){
  const loginForm = document.getElementById("login-form");
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const emailField = document.getElementById("login-email-field");
    const passField = document.getElementById("login-password-field");
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    const emailOk = validateField(emailField, EMAIL_RE.test(email), "Enter a valid email address.");
    const passOk = validateField(passField, password.length >= 6, "Password must be at least 6 characters.");
    if(!emailOk || !passOk) return;

    const user = getUsers().find(u => u.email === email);
    if(!user){ setFieldError(emailField, "No account found with this email."); return; }
    if(user.password !== password){ setFieldError(passField, "Incorrect password. Try again."); return; }

    setSession(user);
    showToast(`Welcome back, ${user.name.split(" ")[0]}!`, "success");
    loginForm.reset();
    navigate("dashboard");
  });

  const registerForm = document.getElementById("register-form");
  const regPassInput = document.getElementById("register-password");
  regPassInput.addEventListener("input", () => renderStrength(document.getElementById("register-strength"), regPassInput.value));

  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameField = document.getElementById("register-name-field");
    const emailField = document.getElementById("register-email-field");
    const passField = document.getElementById("register-password-field");
    const confirmField = document.getElementById("register-confirm-field");

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const role = document.getElementById("register-role").value;
    const password = document.getElementById("register-password").value;
    const confirm = document.getElementById("register-confirm").value;

    const nameOk = validateField(nameField, name.length >= 2, "Enter your full name.");
    const emailOk = validateField(emailField, EMAIL_RE.test(email), "Enter a valid email address.");
    const passOk = validateField(passField, password.length >= 6, "Password must be at least 6 characters.");
    const confirmOk = validateField(confirmField, password === confirm && confirm.length > 0, "Passwords do not match.");
    if(!nameOk || !emailOk || !passOk || !confirmOk) return;

    const users = getUsers();
    if(users.find(u => u.email === email)){ setFieldError(emailField, "An account with this email already exists."); return; }

    const newUser = {
      name, email, password, role,
      studentId: role === "student" ? 1 : null,
      classes: role === "teacher" ? [ALL_CLASSES[0]] : [],
    };
    users.push(newUser);
    saveUsers(users);
    setSession(newUser);
    showToast("Account created — you're all set!", "success");
    registerForm.reset();
    navigate("dashboard");
  });

  const forgotForm = document.getElementById("forgot-form");
  forgotForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const emailField = document.getElementById("forgot-email-field");
    const email = document.getElementById("forgot-email").value.trim();
    const emailOk = validateField(emailField, EMAIL_RE.test(email), "Enter a valid email address.");
    if(!emailOk) return;

    const user = getUsers().find(u => u.email === email);
    if(!user){ setFieldError(emailField, "No account found with this email."); return; }

    localStorage.setItem(STORE_RESET, email);
    showToast("Reset instructions sent (simulated) — continue below.", "success");
    forgotForm.reset();
    setTimeout(()=> navigate("reset"), 500);
  });

  const resetForm = document.getElementById("reset-form");
  const resetPassInput = document.getElementById("reset-password");
  resetPassInput.addEventListener("input", () => renderStrength(document.getElementById("reset-strength"), resetPassInput.value));

  resetForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const passField = document.getElementById("reset-password-field");
    const confirmField = document.getElementById("reset-confirm-field");
    const password = document.getElementById("reset-password").value;
    const confirm = document.getElementById("reset-confirm").value;

    const passOk = validateField(passField, password.length >= 6, "Password must be at least 6 characters.");
    const confirmOk = validateField(confirmField, password === confirm && confirm.length > 0, "Passwords do not match.");
    if(!passOk || !confirmOk) return;

    const email = localStorage.getItem(STORE_RESET);
    const users = getUsers();
    const user = users.find(u => u.email === email);
    if(!user){ showToast("Reset session expired. Please request a new link.", "error"); navigate("forgot"); return; }

    user.password = password;
    saveUsers(users);
    localStorage.removeItem(STORE_RESET);
    showToast("Password updated. Please log in.", "success");
    resetForm.reset();
    navigate("login");
  });

  dom.logoutBtn.addEventListener("click", () => {
    clearSession();
    showToast("You've been logged out.", "info");
    navigate("home");
  });

  document.querySelectorAll(".toggle-pass").forEach(btn => {
    btn.addEventListener("click", () => togglePasswordVisibility(btn));
  });

  // delegated: clear a field's error state as soon as the person edits it
  document.body.addEventListener("input", (e) => {
    const field = e.target.closest(".field");
    if(field && (e.target.matches("input, textarea, select"))) clearFieldError(field);
  });
}

/* ---------------------------------------------------------------------- */
/* Account / profile management page                                       */
/* ---------------------------------------------------------------------- */
const PREF_KEYS = { grade:"pref-grade-notifs", attendance:"pref-attendance-notifs", news:"pref-news-notifs" };
function getPrefs(email){
  try { return (JSON.parse(localStorage.getItem("spap_prefs")) || {})[email] || { grade:true, attendance:true, news:false }; }
  catch(e){ return { grade:true, attendance:true, news:false }; }
}
function setPrefs(email, prefs){
  let store = {};
  try { store = JSON.parse(localStorage.getItem("spap_prefs")) || {}; } catch(e){ store = {}; }
  store[email] = prefs;
  localStorage.setItem("spap_prefs", JSON.stringify(store));
}

function renderAccountSettings(){
  const session = getSession();
  if(!session) return;
  const user = getUsers().find(u => u.email === session.email);
  if(!user) return;

  document.getElementById("account-avatar-initials").textContent = initialsOf(user.name);
  document.getElementById("account-side-name").textContent = user.name;
  const roleBadge = document.getElementById("account-side-role");
  roleBadge.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  roleBadge.className = `role-badge role-${user.role}`;

  document.getElementById("account-name").value = user.name;
  document.getElementById("account-email").value = user.email;
  document.getElementById("account-role").value = roleBadge.textContent;

  const prefs = getPrefs(user.email);
  document.getElementById("pref-grade-notifs").checked = prefs.grade;
  document.getElementById("pref-attendance-notifs").checked = prefs.attendance;
  document.getElementById("pref-news-notifs").checked = prefs.news;

  const savedTheme = localStorage.getItem(STORE_THEME);
  document.querySelectorAll('input[name="theme-pref"]').forEach(r => {
    r.checked = savedTheme ? r.value === savedTheme : r.value === "system";
  });
}

function initAccountPage(){
  // tab switching
  document.querySelectorAll(".settings-tabgroup button").forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      document.querySelectorAll(".settings-tabgroup button").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected","false"); });
      tabBtn.classList.add("active");
      tabBtn.setAttribute("aria-selected","true");
      document.querySelectorAll(".settings-section").forEach(s => s.classList.remove("active"));
      document.getElementById(`settings-${tabBtn.dataset.tab}`).classList.add("active");
    });
  });

  document.getElementById("account-profile-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const nameField = document.getElementById("account-name-field");
    const emailField = document.getElementById("account-email-field");
    const name = document.getElementById("account-name").value.trim();
    const email = document.getElementById("account-email").value.trim();

    const nameOk = validateField(nameField, name.length >= 2, "Enter your full name.");
    const emailOk = validateField(emailField, EMAIL_RE.test(email), "Enter a valid email address.");
    if(!nameOk || !emailOk) return;

    const session = getSession();
    const users = getUsers();
    const user = users.find(u => u.email === session.email);
    if(email !== session.email && users.find(u => u.email === email)){
      setFieldError(emailField, "That email is already in use.");
      return;
    }
    user.name = name; user.email = email;
    saveUsers(users);
    setSession(user);
    showToast("Profile updated.", "success");
    updateAuthUI();
    renderAccountSettings();
  });

  const newPassInput = document.getElementById("account-new-password");
  newPassInput.addEventListener("input", () => renderStrength(document.getElementById("account-new-strength"), newPassInput.value));

  document.getElementById("account-security-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const curField = document.getElementById("account-current-field");
    const newField = document.getElementById("account-new-field");
    const confirmField = document.getElementById("account-confirm-field");
    const current = document.getElementById("account-current-password").value;
    const next = document.getElementById("account-new-password").value;
    const confirm = document.getElementById("account-confirm-password").value;

    const session = getSession();
    const users = getUsers();
    const user = users.find(u => u.email === session.email);

    const curOk = validateField(curField, user.password === current, "Current password is incorrect.");
    const newOk = validateField(newField, next.length >= 6, "Password must be at least 6 characters.");
    const confirmOk = validateField(confirmField, next === confirm && confirm.length > 0, "Passwords do not match.");
    if(!curOk || !newOk || !confirmOk) return;

    user.password = next;
    saveUsers(users);
    showToast("Password updated.", "success");
    e.target.reset();
    document.getElementById("account-new-strength").querySelectorAll("span").forEach(s => s.style.background = "var(--paper-line)");
  });

  ["pref-grade-notifs","pref-attendance-notifs","pref-news-notifs"].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      const session = getSession();
      if(!session) return;
      setPrefs(session.email, {
        grade: document.getElementById("pref-grade-notifs").checked,
        attendance: document.getElementById("pref-attendance-notifs").checked,
        news: document.getElementById("pref-news-notifs").checked,
      });
      showToast("Preferences saved.", "info");
    });
  });
}

/* ---------------------------------------------------------------------- */
/* Contact form                                                            */
/* ---------------------------------------------------------------------- */
function initContactForm(){
  const form = document.getElementById("contact-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameField = document.getElementById("contact-name-field");
    const emailField = document.getElementById("contact-email-field");
    const msgField = document.getElementById("contact-message-field");

    const name = document.getElementById("contact-name").value.trim();
    const email = document.getElementById("contact-email").value.trim();
    const message = document.getElementById("contact-message").value.trim();

    const nameOk = validateField(nameField, name.length >= 2, "Enter your name.");
    const emailOk = validateField(emailField, EMAIL_RE.test(email), "Enter a valid email address.");
    const msgOk = validateField(msgField, message.length >= 10, "Message should be at least 10 characters.");
    if(!nameOk || !emailOk || !msgOk) return;

    showToast("Message sent — we'll get back to you shortly.", "success");
    form.reset();
  });
}

/* ---------------------------------------------------------------------- */
/* Delegated listeners for dynamically-built tables (performance:          */
/* one listener per container instead of one per row/button)               */
/* ---------------------------------------------------------------------- */
function initDelegatedTableHandlers(){
  document.getElementById("teacher-search").addEventListener("input", debounce((e) => {
    teacherSearchQuery = e.target.value.toLowerCase();
    drawTeacherTable();
  }, 150));

  document.getElementById("teacher-table-body").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if(tr) navigate("profile", tr.dataset.id);
  });

  document.getElementById("admin-top-body").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if(tr) navigate("profile", tr.dataset.id);
  });

  document.getElementById("admin-users-body").addEventListener("click", (e) => {
    const btn = e.target.closest(".admin-delete-user");
    if(!btn || btn.disabled) return;
    const tr = btn.closest("tr");
    const email = tr.dataset.email;
    const users = getUsers().filter(u => u.email !== email);
    saveUsers(users);
    showToast("Account removed.", "info");
    drawUserManagementTable();
  });
}

/* ---------------------------------------------------------------------- */
/* Init                                                                    */
/* ---------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  initThemeControls();
  initPopovers();
  initMobileNav();
  initAuthForms();
  initContactForm();
  initAccountPage();
  initDelegatedTableHandlers();
  dom.year.textContent = new Date().getFullYear();
  if(!location.hash) location.hash = "#/home";
  renderRoute();
});
