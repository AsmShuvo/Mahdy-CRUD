// async function getData() {
//   const res = await fetch("https://jsonplaceholder.typicode.com/users");
//   const users = await res.json();
//   // console.log(users);

//   const container = document.getElementById("data-container");
//   container.innerHTML = ""; // clear previous content if any

//   users.forEach((user) => {
//     const userCard = document.createElement("div");
//     userCard.className = "student-card";
//     // ${} --> converts into js var
//     userCard.innerHTML = `
//       <h2>${user?.name}</h2>
//       <h3>${user?.username}</h3>
//       <h3>${user?.email}</h3>
//     `;
//     container.appendChild(userCard);
//   });
// }

const form = document.getElementById("user-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault(); // stop page reload

  const name = document.getElementById("name").value;
  const age = document.getElementById("age").value;

  // send POST req
  const response = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers:{
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({name, age}),
  })

  const data = await response.json();
  console.log("Server response: ", data);
  alert("User added!");
  form.reset();
});




// getData();


// HTTP GET request
// webpage([html+css] & [js])
// js ---GET---> server ------> db
// db---info--->server----info---->js
// js---html manipulate : UI change----> client

/* HW: fetch /todos
then create a basic html and design it with css
you must create a card for each todo
you have to show the todos first which are completed --> this will have green color
you have to show the todos last which are incompleted --> this will have blue color
bonus: add titles


*/

// HTTP POST req