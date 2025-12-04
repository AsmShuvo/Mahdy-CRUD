const express = require("express");
const app = express();
const PORT = 8080;
const cors = require("cors");
const { default: mongoose } = require("mongoose");
const { MongoClient } = require("mongodb");
app.use(cors());
app.use(express.json());



const uri = `mongodb://localhost:27017/UniConnectDB`;
const client = new MongoClient(uri);

// database + collection
let db, usersCollection;

(async () => {
  await client.connect();
  db = client.db("uniconnect");
  usersCollection = db.collection("users");
  console.log("MongoDB connected");
})();

//*********************************************** Registration API ********************************************

app.post("/M01028026/users", async (req, res) => {
  try {
    const userData = req.body;

    // Basic validation
    if (
      !userData.name ||
      !userData.id ||
      !userData.email ||
      !userData.university ||
      !userData.password
    ) {
      return res.json({
        success: false,
        message: "Missing required fields",
      });
    }

    if(userData.password != userData.confirmPassword){
      return res.json({
        success: false,
        message: "Passwords don't match",
      });
    }

    // Check if email already exists
    const existing = await usersCollection.findOne({ email: userData.email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Insert into DB
    const result = await usersCollection.insertOne({
      name: userData.name,
      email: userData.email,
      password: userData.password, // todo: hash later
      university: userData.university || "",
      createdAt: new Date(), //current date added 
    });

    res.json({
      success: true,
      message: "User registered successfully",
      // userId: result.insertedId,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

app.get("/M01028026/users", async (req, res) => {
  try {
    const q = req.query.q;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Missing query parameter q",
      });
    }

    // search users by name, email, or university (case-insensitive)
    const results = await usersCollection
      .find({
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { university: { $regex: q, $options: "i" } },
        ],
      })
      .project({
        password: 0, // exclude password from output
      })
      .toArray();

    res.json({
      success: true,
      results,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// last
app.listen(PORT, () => {
  console.log("server is running....");
});
