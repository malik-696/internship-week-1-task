function toggleMenu() {
    document.getElementById("navLinks")
    .classList.toggle("active");
}

function validateForm() {

    let name = document.getElementById("name").value;
    let email = document.getElementById("email").value;

    if(name === "" || email === ""){
        alert("Please fill all fields");
        return false;
    }

    alert("Form Submitted Successfully");
    return true;
}