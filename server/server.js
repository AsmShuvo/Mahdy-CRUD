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
let db, usersCollection, postsCollection, followsCollection;

(async () => {
  await client.connect();
  db = client.db("uniconnect");
  usersCollection = db.collection("users");
  postsCollection = db.collection("posts");
  followsCollection = db.collection("follows");
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

    if (userData.password != userData.confirmPassword) {
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
      userId: result.insertedId,
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

// Middleware to protect routes (requires login)
function requireLogin(req, res, next) {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(401).json({
      success: false,
      message: "No session ID provided. Please log in first.",
    });
  }

  const sessionUser = sessions[sessionId];

  if (!sessionUser) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid. Please log in again.",
    });
  }

  // Attach user info from session
  req.user = sessionUser;
  next();
}

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
      university: user.university,
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
      error: err.message,
    });
  }
});

// ****************************** CONTENT *********************************

app.post("/M01028026/contents", requireLogin, async (req, res) => {
  try {
    const postData = req.body;

    // Expecting from body: { title, description }
    if (!postData.title || !postData.description) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, description",
      });
    }

    // User info from session (set by requireLogin)
    const sessionUser = req.user;

    // Build post document according to your schema
    const blog = {
      title: postData.title,
      description: postData.description,
      likes: 0, // default likes
      comments: [], // empty array initially
      posted: new Date(), // current date-time
      author: {
        name: sessionUser.name,
        university: sessionUser.university,
        email: sessionUser.email,
      },
    };

    // Insert into MongoDB
    const result = await postsCollection.insertOne(blog);

    return res.json({
      success: true,
      message: "Post created successfully",
      // postId: result.insertedId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

app.get("/M01028026/contents", async (req, res) => {
  try {
    const q = req.query.q;

    // Validate query
    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Missing query parameter",
      });
    }

    // Search posts by title or description (case-insensitive)
    const results = await postsCollection
      .find({
        $or: [
          { title: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { "author.name": { $regex: q, $options: "i" } },
          { "author.university": { $regex: q, $options: "i" } },
        ],
      })
      .sort({ posted: -1 }) // newest first
      .toArray();

    return res.json({
      success: true,
      // count: results.length,
      results,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// ************** follow api *********************

app.post("/M01028026/follow", requireLogin, async (req, res) => {
  try {
    const curUser = req.user; // mahdy
    const { targetEmail } = req.body; // shuvo@gmail.com

    // Check that target user exists
    const targetUser = await usersCollection.findOne({ email: targetEmail });
    if (!targetUser) {
      return res.status(400).json({
        success: false,
        message: "User to follow not found",
      });
    }

    // Check if already following
    const existingFollow = await followsCollection.findOne({
      followerEmail: curUser.email,
      followingEmail: targetEmail,
    });

    if (existingFollow) {
      return res.json({
        success: true,
        message: "You are already following this user",
      });
    }

    // Insert follow document
    await followsCollection.insertOne({
      followerEmail: curUser.email,
      followingEmail: targetEmail,
      followedAt: new Date(),
    });

    res.json({
      success: true,
      message: `Now following ${targetEmail}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});


app.delete("/M01028026/follow", requireLogin, async (req, res) => {
  try {
    const sessionUser = req.user;
    const { targetEmail } = req.body;

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: "targetEmail is required",
      });
    }

    const result = await followsCollection.deleteOne({
      followerEmail: sessionUser.email,
      followingEmail: targetEmail,
    });

    if (result.deletedCount === 0) {
      return res.json({
        success: false,
        message: "Couldn't find data",
      });
    }

    res.json({
      success: true,
      message: `Unfollowed successfully`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

app.get("/M01028026/feed", requireLogin, async (req, res) => {
  try {
    const sessionUser = req.user;

    // Find all users that current user is following
    const follows = await followsCollection
      .find({ followerEmail: sessionUser.email })
      .toArray();

    const followingEmails = follows.map((f) => f.followingEmail);

    if (followingEmails.length === 0) {
      return res.json({
        success: true,
        feed: [],
        message: "You are not following anyone yet",
      });
    }

    // Get posts only from followed users
    const feedPosts = await postsCollection
      .find({ "author.email": { $in: followingEmails } })
      .sort({ posted: -1 })
      .toArray();

    res.json({
      success: true,
      feed: feedPosts,
    });
  } catch (err) {
    console.error(err);
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
