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

//*********************************************** Registration API *******************************************


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

//*********************************************** Login API ********************************************
let sessions = {};
app.post("/M01028026/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user in DB
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.json({
        success: false,
        message: "Please register first",
      });
    }

    // Check password (plain text for now)
    if (user.password !== password) {
      return res.json({
        success: false,
        message: "Incorrect password",
      });
    }

    // Create simple session ID (string)
    const sessionId = Math.random().toString(36).substring(2);

    // Store session
    sessions[sessionId] = {
      userId: user._id,
      email: user.email,
      name: user.name,
      loginTime: new Date(),
    };

    // Return success + session token
    res.json({
      success: true,
      message: "Login successful",
      sessionId: sessionId, // frontend must save this
      user: {
        name: user.name,
        email: user.email,
        university: user.university,
      },
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

app.get("/M01028026/login", (req, res) => {
  const { sessionId } = req.query;

  // If no sessionId provided
  if (!sessionId) {
    return res.json({
      loggedIn: false,
      message: "No session ID provided",
    });
  }

  // Check if valid session
  if (!sessions[sessionId]) {
    return res.json({
      loggedIn: false,
      message: "Session expired or invalid",
    });
  }

  // User is logged in
  res.json({
    loggedIn: true,
    user: sessions[sessionId],
  });
});

app.delete("/M01028026/login", (req, res) => {
  try {
    const { sessionId } = req.query;

    // No session ID provided
    if (!sessionId) {
      return res.json({
        success: false,
        message: "No session ID provided",
      });
    }

    // Check if session exists
    if (!sessions[sessionId]) {
      return res.json({
        success: false,
        message: "Session already expired or invalid",
      });
    }

    // Remove session
    delete sessions[sessionId];

    res.json({
      success: true,
      message: "Logged out successfully",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
});




// last
app.listen(PORT, () => {
  console.log("server is running....");
});
