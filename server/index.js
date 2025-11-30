const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 3000;

// API's --> endpoint , request , response
// for home--> /

// GET
app.get("/", function (req, res) {
  res.send({
    message: "Hello from my server",
    succes: true,
  });
});
app.get("/login", function (req, res) {
  res.send("login page");
});
app.get("/problemset/problems", function (req, res) {
  res.send("new page");
});

//POST
app.post("/login", function (req, res) {
  const { name, age } = req.body;
  console.log("Name: ", name);
  console.log("age: ", age);

  res.send({
    message: "Data received successfully",
    succes: true,
  });
});

// starts listening to the server
app.listen(PORT, () => {
  console.log(`My server is running`);
});

// www.mahdy.com/ --> www.mahdy.com
