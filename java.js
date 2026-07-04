/* ==========================================================================
   Student Performance Analytics Portal — app.js
   Front-end only prototype. "Backend" behaviour (auth, password reset,
   saved records) is simulated with localStorage.
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

/* ---------------------------------------------------------------------- */
/* Storage helpers (simulated backend)                                     */
/* ---------------------------------------------------------------------- */
const STORE_USERS = "spap_users";
const STORE_SESSION = "spap_session";
const STORE_RESET = "spap_reset_token";

function getUsers(){
  try { return JSON.parse(localStorage.getItem(STORE_USERS)) || []; }
  catch(e){ return []; }
}
function saveUsers(list){ localStorage.setItem(STORE_USERS, JSON.stringify(list)); }
function seedDemoUser(){
  const users = getUsers();
  if(!users.find(u=>u.email === "demo@spap.edu")){
    users.push({ name:"Demo User", email:"demo@spap.edu", password:"Demo1234", studentId:1 });
    saveUsers(users);
  }
}
seedDemoUser();

function getSession(){
  try { return JSON.parse(localStorage.getItem(STORE_SESSION)); }
  catch(e){ return null; }
}
function setSession(user){ localStorage.setItem(STORE_SESSION, JSON.stringify({ name:user.name, email:user.email, studentId:user.studentId })); }
function clearSession(){ localStorage.removeItem(STORE_SESSION); }

/* ---------------------------------------------------------------------- */
/* Toasts                                                                  */
/* ---------------------------------------------------------------------- */
function showToast(message, type="info"){
  const region = document.getElementById("toast-region");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateY(8px)"; setTimeout(()=>el.remove(), 250); }, 3200);
}

/* ---------------------------------------------------------------------- */
/* Router                                                                  */
/* ---------------------------------------------------------------------- */
const routes = ["home","about","dashboard","report","profile","contact","login","register","forgot","reset"];

function parseHash(){
  const raw = (location.hash || "#/home").replace(/^#\/?/, "");
  const [route, param] = raw.split("/");
  return { route: routes.includes(route) ? route : "home", param };
}

function requireAuth(route){
  return route === "dashboard";
}

function navigate(route, param){
  location.hash = param ? `/${route}/${param}` : `/${route}`;
}

function renderRoute(){
  let { route, param } = parseHash();

  if(requireAuth(route) && !getSession()){
    showToast("Please log in to view your dashboard.", "info");
    route = "login";
    history.replaceState(null, "", "#/login");
  }

  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const target = document.getElementById(`view-${route}`);
  if(target) target.classList.add("active");
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

  document.querySelectorAll(".nav-links a").forEach(a=>{
    a.classList.toggle("active", a.dataset.route === route);
  });
  closeMobileNav();

  if(route === "dashboard") renderDashboard();
  if(route === "report") renderReport();
  if(route === "profile") renderProfile(param);

  updateAuthUI();
}
window.addEventListener("hashchange", renderRoute);

/* ---------------------------------------------------------------------- */
/* Nav auth state                                                          */
/* ---------------------------------------------------------------------- */
function updateAuthUI(){
  const session = getSession();
  const guestBox = document.getElementById("nav-guest");
  const userBox = document.getElementById("nav-user");
  if(session){
    guestBox.style.display = "none";
    userBox.style.display = "flex";
    document.getElementById("nav-user-name").textContent = session.name.split(" ")[0];
    document.getElementById("nav-avatar-initials").textContent = initialsOf(session.name);
  } else {
    guestBox.style.display = "flex";
    userBox.style.display = "none";
  }
}

/* ---------------------------------------------------------------------- */
/* Mobile nav                                                              */
/* ---------------------------------------------------------------------- */
function closeMobileNav(){
  document.getElementById("nav-links").classList.remove("open");
}
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("hamburger-btn").addEventListener("click", () => {
    document.getElementById("nav-links").classList.toggle("open");
  });
});

/* ---------------------------------------------------------------------- */
/* Count-up animation                                                      */
/* ---------------------------------------------------------------------- */
function countUp(el, target, opts = {}){
  const duration = opts.duration || 900;
  const decimals = opts.decimals || 0;
  const suffix = opts.suffix || "";
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

/* ---------------------------------------------------------------------- */
/* Dashboard                                                               */
/* ---------------------------------------------------------------------- */
function currentStudent(){
  const session = getSession();
  const id = session && session.studentId ? session.studentId : 1;
  return STUDENTS.find(s => s.id === id) || STUDENTS[0];
}

function renderDashboard(){
  const student = currentStudent();
  document.getElementById("dash-welcome-name").textContent = (getSession()?.name || student.name).split(" ")[0];

  const cards = [
    { label:"Overall GPA", value: student.gpa, decimals:2, trend: student.trend[5]-student.trend[4], suffix:"" },
    { label:"Average Score", value: student.avg, decimals:0, trend: student.trend[5]-student.trend[4], suffix:"%" },
    { label:"Attendance", value: student.attendance, decimals:0, trend: student.attendance>=90?1:(student.attendance>=80?0:-1), suffix:"%" },
    { label:"Class Rank", value: student.rank, decimals:0, trend:0, suffix:` / ${STUDENTS.length}` },
  ];

  const grid = document.getElementById("dash-stat-grid");
  grid.innerHTML = "";
  cards.forEach(c => {
    const trendClass = c.trend > 0 ? "trend-up" : c.trend < 0 ? "trend-down" : "trend-flat";
    const trendLabel = c.trend > 0 ? "▲ improving" : c.trend < 0 ? "▼ needs focus" : "— steady";
    const card = document.createElement("div");
    card.className = "card stat-card";
    card.innerHTML = `
      <div class="stat-top">
        <span class="badge-eyebrow">${c.label}</span>
        <span class="stat-trend ${trendClass}">${trendLabel}</span>
      </div>
      <div class="stat-value mono" data-target="${c.value}" data-decimals="${c.decimals}" data-suffix="${c.suffix}">0</div>
      <div class="progress-track"><div class="progress-fill"></div></div>
    `;
    grid.appendChild(card);
    const valueEl = card.querySelector(".stat-value");
    countUp(valueEl, parseFloat(c.value), { decimals:c.decimals, suffix:c.suffix, duration:1000 });
    const pct = c.label === "Class Rank" ? Math.max(6, 100 - (student.rank/STUDENTS.length*100)) : Math.min(100, parseFloat(c.value));
    requestAnimationFrame(()=> setTimeout(()=>{ card.querySelector(".progress-fill").style.width = pct + "%"; }, 60));
  });

  // grade stamp
  document.getElementById("dash-grade-stamp").textContent = student.grade;
  document.getElementById("dash-grade-stamp").className = `grade-stamp ${gradeClass(student.grade)}`;

  // subject breakdown mini list
  const subjWrap = document.getElementById("dash-subject-list");
  subjWrap.innerHTML = SUBJECTS.map(subj => `
    <div class="subject-row">
      <span class="subj-name">${subj}</span>
      <div class="bar-track"><div class="bar-fill" data-w="${student.scores[subj]}"></div></div>
      <span class="score mono">${student.scores[subj]}</span>
    </div>
  `).join("");
  setTimeout(()=>{
    subjWrap.querySelectorAll(".bar-fill").forEach(b => b.style.width = b.dataset.w + "%");
  }, 80);

  // upcoming / recent table (simple recent activity)
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
      <td class="mono" style="color:#7A8B83">${a.when}</td>
    </tr>
  `).join("");
}

/* ---------------------------------------------------------------------- */
/* Report / search / filter / sort                                        */
/* ---------------------------------------------------------------------- */
let reportState = { query: "", classFilter: "all", sortKey: "rank", sortDir: "asc" };

function renderReport(){
  const searchInput = document.getElementById("report-search");
  const classSelect = document.getElementById("report-class-filter");

  // populate class filter once
  if(classSelect.options.length <= 1){
    const classes = [...new Set(STUDENTS.map(s => s.className))].sort();
    classes.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c; opt.textContent = c;
      classSelect.appendChild(opt);
    });
  }

  searchInput.value = reportState.query;
  classSelect.value = reportState.classFilter;

  drawReportTable();

  searchInput.oninput = (e) => { reportState.query = e.target.value.toLowerCase(); drawReportTable(); };
  classSelect.onchange = (e) => { reportState.classFilter = e.target.value; drawReportTable(); };

  document.querySelectorAll("#report-table thead th[data-key]").forEach(th => {
    th.onclick = () => {
      const key = th.dataset.key;
      if(reportState.sortKey === key){
        reportState.sortDir = reportState.sortDir === "asc" ? "desc" : "asc";
      } else {
        reportState.sortKey = key;
        reportState.sortDir = "asc";
      }
      drawReportTable();
    };
  });
}

function drawReportTable(){
  let rows = STUDENTS.filter(s => {
    const matchesQuery = s.name.toLowerCase().includes(reportState.query) || s.className.toLowerCase().includes(reportState.query);
    const matchesClass = reportState.classFilter === "all" || s.className === reportState.classFilter;
    return matchesQuery && matchesClass;
  });

  rows.sort((a,b) => {
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
    <tr data-id="${s.id}">
      <td class="mono">#${s.rank}</td>
      <td>
        <div class="name-cell">
          <span class="mini-avatar">${initialsOf(s.name)}</span>
          ${s.name}
        </div>
      </td>
      <td>${s.className}</td>
      <td class="mono">${s.gpa}</td>
      <td><span class="pill ${pillClass(s.avg)}">${s.avg}% · ${s.grade}</span></td>
      <td class="mono">${s.attendance}%</td>
    </tr>
  `).join("");

  tbody.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", () => navigate("profile", tr.dataset.id));
  });
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
  setTimeout(()=> subjWrap.querySelectorAll(".bar-fill").forEach(b => b.style.width = b.dataset.w + "%"), 80);

  // attendance ring
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

  // trend sparkline (inline SVG)
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

  document.getElementById("profile-grade-stamp").textContent = student.grade;
  document.getElementById("profile-grade-stamp").className = `grade-stamp ${gradeClass(student.grade)}`;
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
function clearFieldError(fieldEl){
  fieldEl.classList.remove("error");
}
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
  // LOGIN
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

    const users = getUsers();
    const user = users.find(u => u.email === email);
    if(!user){
      setFieldError(emailField, "No account found with this email.");
      return;
    }
    if(user.password !== password){
      setFieldError(passField, "Incorrect password. Try again.");
      return;
    }
    setSession(user);
    showToast(`Welcome back, ${user.name.split(" ")[0]}!`, "success");
    loginForm.reset();
    navigate("dashboard");
  });

  // REGISTER
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
    const password = document.getElementById("register-password").value;
    const confirm = document.getElementById("register-confirm").value;

    const nameOk = validateField(nameField, name.length >= 2, "Enter your full name.");
    const emailOk = validateField(emailField, EMAIL_RE.test(email), "Enter a valid email address.");
    const passOk = validateField(passField, password.length >= 6, "Password must be at least 6 characters.");
    const confirmOk = validateField(confirmField, password === confirm && confirm.length > 0, "Passwords do not match.");
    if(!nameOk || !emailOk || !passOk || !confirmOk) return;

    const users = getUsers();
    if(users.find(u => u.email === email)){
      setFieldError(emailField, "An account with this email already exists.");
      return;
    }
    const newUser = { name, email, password, studentId: 1 };
    users.push(newUser);
    saveUsers(users);
    setSession(newUser);
    showToast("Account created — you're all set!", "success");
    registerForm.reset();
    navigate("dashboard");
  });

  // FORGOT PASSWORD
  const forgotForm = document.getElementById("forgot-form");
  forgotForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const emailField = document.getElementById("forgot-email-field");
    const email = document.getElementById("forgot-email").value.trim();
    const emailOk = validateField(emailField, EMAIL_RE.test(email), "Enter a valid email address.");
    if(!emailOk) return;

    const users = getUsers();
    const user = users.find(u => u.email === email);
    if(!user){
      setFieldError(emailField, "No account found with this email.");
      return;
    }
    localStorage.setItem(STORE_RESET, email);
    showToast("Reset instructions sent (simulated) — continue below.", "success");
    forgotForm.reset();
    setTimeout(()=> navigate("reset"), 500);
  });

  // RESET PASSWORD
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
    if(!user){
      showToast("Reset session expired. Please request a new link.", "error");
      navigate("forgot");
      return;
    }
    user.password = password;
    saveUsers(users);
    localStorage.removeItem(STORE_RESET);
    showToast("Password updated. Please log in.", "success");
    resetForm.reset();
    navigate("login");
  });

  // LOGOUT
  document.getElementById("logout-btn").addEventListener("click", () => {
    clearSession();
    showToast("You've been logged out.", "info");
    navigate("home");
  });

  // show/hide password toggles
  document.querySelectorAll(".toggle-pass").forEach(btn => {
    btn.addEventListener("click", () => togglePasswordVisibility(btn));
  });

  // live-clear errors while typing
  document.querySelectorAll(".field input, .field textarea").forEach(input => {
    input.addEventListener("input", () => clearFieldError(input.closest(".field")));
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
/* Init                                                                    */
/* ---------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initAuthForms();
  initContactForm();
  document.getElementById("year").textContent = new Date().getFullYear();
  if(!location.hash) location.hash = "#/home";
  renderRoute();
});
