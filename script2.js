// ===================== LOGIN PAGE =====================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    const email = document.getElementById("email");
    const password = document.getElementById("password");

    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");

    const togglePassword = document.getElementById("togglePassword");

    // Show / Hide Password
    togglePassword.addEventListener("click", function () {

        if (password.type === "password") {
            password.type = "text";
            togglePassword.innerHTML = "Hide";
        } else {
            password.type = "password";
            togglePassword.innerHTML = "Show";
        }

    });

    // Login Validation
    loginForm.addEventListener("submit", function (e) {

        e.preventDefault();

        emailError.innerHTML = "";
        passwordError.innerHTML = "";

        let valid = true;

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (email.value.trim() === "") {
            emailError.innerHTML = "Email is required.";
            valid = false;
        }
        else if (!emailPattern.test(email.value)) {
            emailError.innerHTML = "Invalid email.";
            valid = false;
        }

        if (password.value.trim() === "") {
            passwordError.innerHTML = "Password is required.";
            valid = false;
        }
        else if (password.value.length < 6) {
            passwordError.innerHTML =
                "Password must contain at least 6 characters.";
            valid = false;
        }

        if (valid) {

            alert("Login Successful!");

            window.location.href = "dashboard.html";

        }

    });

}

// ===================== DASHBOARD =====================

// Dashboard Cards

const cardsData = [

    {
        title: "Total Students",
        value: 250
    },

    {
        title: "Average Marks",
        value: "84%"
    },

    {
        title: "Attendance",
        value: "92%"
    },

    {
        title: "Passed Students",
        value: 220
    }

];

const cardsContainer =
    document.getElementById("cardsContainer");

if (cardsContainer) {

    cardsData.forEach(card => {

        cardsContainer.innerHTML += `

        <div class="card">

            <h3>${card.title}</h3>

            <p>${card.value}</p>

        </div>

        `;

    });

}

// ===================== STUDENT DATA =====================

const students = [

{
name:"Ali",
roll:101,
class:"BSCS",
marks:85,
status:"Pass"
},

{
name:"Ahmed",
roll:102,
class:"BSIT",
marks:67,
status:"Pass"
},

{
name:"Sara",
roll:103,
class:"BSSE",
marks:45,
status:"Fail"
},

{
name:"Fatima",
roll:104,
class:"BBA",
marks:90,
status:"Pass"
},

{
name:"Usman",
roll:105,
class:"BSCS",
marks:39,
status:"Fail"
},

{
name:"Ayesha",
roll:106,
class:"BSIT",
marks:76,
status:"Pass"
}

];

// ===================== TABLE =====================

const studentTable =
document.getElementById("studentTable");

function displayStudents(data){

    if(!studentTable) return;

    studentTable.innerHTML="";

    data.forEach(student=>{

        studentTable.innerHTML+=`

        <tr>

        <td>${student.name}</td>

        <td>${student.roll}</td>

        <td>${student.class}</td>

        <td>${student.marks}</td>

        <td class="${student.status=="Pass"?"pass":"fail"}">

        ${student.status}

        </td>

        </tr>

        `;

    });

}

displayStudents(students);

// ===================== SEARCH =====================

const searchInput =
document.getElementById("searchInput");

if(searchInput){

searchInput.addEventListener("keyup",filterStudents);

}

// ===================== FILTER =====================

const statusFilter =
document.getElementById("statusFilter");

if(statusFilter){

statusFilter.addEventListener("change",filterStudents);

}

// ===================== SEARCH + FILTER =====================

function filterStudents(){

const keyword=
searchInput.value.toLowerCase();

const status=
statusFilter.value;

const filtered=students.filter(student=>{

const matchesSearch=

student.name.toLowerCase().includes(keyword) ||

student.roll.toString().includes(keyword);

const matchesStatus=

status==="All" ||

student.status===status;

return matchesSearch && matchesStatus;

});

displayStudents(filtered);

}

// ===================== MOBILE MENU =====================

const menuBtn=
document.getElementById("menuBtn");

const navLinks=
document.getElementById("navLinks");

if(menuBtn){

menuBtn.addEventListener("click",()=>{

navLinks.classList.toggle("active");

});

}

// ===================== LOGOUT =====================

const logoutBtn=
document.getElementById("logoutBtn");

if(logoutBtn){

logoutBtn.addEventListener("click",function(){

alert("Logged Out Successfully");

});

}