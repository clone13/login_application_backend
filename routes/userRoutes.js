const express = require("express");
const router = express.Router();
const connection = require("../dbConfig");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// require("dotenv").config();

router.get("/", (req, res) => {
  const sql = "SELECT * FROM users";
  connection.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
    res.status(200).json(results);
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Find the user by email
  const getUserQuery = "SELECT * FROM users WHERE email = ?";
  connection.query(getUserQuery, [email], async (err, results) => {
    if (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ message: "Internal server error" });
      return;
    }

    if (results.length === 0) {
      // User not found
      res.status(401).json({ message: "Invalid email" });
      return;
    }

    try {
      const user = results[0];

      // Check if user is blocked
      if (user.status === "blocked") {
        res.status(403).json({
          message: "Your account is blocked. Please contact support.",
        });
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        // Passwords don't match
        res.status(401).json({ message: "Invalid password" });
        return;
      }

      // Generate JWT token
      const secretKey = process.env.JWT_SECRET;
      const token = jwt.sign({ email: user.email }, secretKey, {
        expiresIn: "1h",
      });
      res.status(200).json({ token });
    } catch (error) {
      console.error("Error comparing password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
});

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  // Check if the user already exists
  const userExistsQuery = "SELECT * FROM users WHERE email = ?";
  connection.query(userExistsQuery, [email], async (err, results) => {
    if (err) {
      console.error("Error checking if user exists:", err);
      res.status(500).json({ message: "Internal server error" });
      return;
    }

    if (results.length > 0) {
      // User already exists
      res.status(400).json({ message: "User already exists" });
      return;
    }

    try {
      // User doesn't exist, hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the new user into the database
      const insertUserQuery =
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
      connection.query(
        insertUserQuery,
        [name, email, hashedPassword],
        (err, results) => {
          if (err) {
            console.error("Error registering user:", err);
            res.status(500).json({ message: "Internal server error" });
            return;
          }
          res.status(201).json({ message: "User registered successfully" });
        }
      );
    } catch (error) {
      console.error("Error hashing password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
});

router.post("/block/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const sql = "UPDATE users SET status = ? WHERE id = ?";
    const [updateResult] = await connection.query(sql, ["blocked", userId]);

    if (updateResult.affectedRows === 1) {
      console.log(`User with ID ${userId} successfully blocked.`); // Optional logging
      res.status(200).json({ message: "User successfully blocked" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/unblock/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const sql = "UPDATE users SET status = ? WHERE id = ?";
    const [updateResult] = await connection.query(sql, ["active", userId]);

    if (updateResult.affectedRows === 1) {
      console.log(`User with ID ${userId} successfully unblocked.`); // Optional logging
      res.status(200).json({ message: "User successfully unblocked" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    console.error("Error unblocking user:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/delete/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const sql = "DELETE FROM users WHERE id = ?";
    const [updateResult] = await connection.query(sql, userId);

    if (updateResult.affectedRows === 1) {
      console.log(`User with ID ${userId} successfully deleted.`); // Optional logging
      res.status(200).json({ message: "User successfully deleted" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (err) {
    console.error("Error deleted user:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
