const form = document.getElementById("profileForm");

form.addEventListener("submit", async function(e){

e.preventDefault();

const username = document.getElementById("username").value;
const password = document.getElementById("password").value;

const response = await fetch("/login",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
username:username,
password:password
})

});

const data = await response.json();

alert(data.message);

if(data.message === "Login successful"){
localStorage.setItem("username",username);
window.location.href="chat.html";
}

});


async function registerUser(){

const username = document.getElementById("username").value;
const password = document.getElementById("password").value;

const response = await fetch("/register",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
username:username,
password:password
})

});

const data = await response.json();

alert(data.message);

}