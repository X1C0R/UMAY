import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path"; 
import fs from "fs";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({dest: "uploads/"});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// MIDDLEWARE
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token)
    return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 

    if(!decoded.id){
      return res.status(403).json({ error: "Token missing user ID" });
    }
    // req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    res.status(403).json({ error: "Invalid or expired token." });
  }
}

// REGISTER ROUTE
app.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      avatarUrl,
      preferredLanguage,
      learningStyle,
      date_of_birth,
    } = req.body;

    if (!email || !password || !fullName) {
      return res
        .status(400)
        .json({ error: "Full name, email, and password are required" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { fullName, date_of_birth },
        email_confirm: false,
      });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const { data: tableData, error: tableError } = await supabase
      .from("users")
      .insert([
        {
          id: authData.user.id,
          email: authData.user.email,
          password_hash,
          full_name: fullName,
          avatar_url: avatarUrl || null,
          preferred_language: preferredLanguage || "en",
          learning_style: learningStyle || "mixed",
          created_at: new Date(),
          updated_at: new Date(),
          status: "pending",
        },
      ])
      .select()
      .single();

    if (tableError) {
      return res.status(400).json({ error: tableError.message });
    }

    res.status(201).json({
      id: tableData.id,
      email: tableData.email,
      full_name: tableData.full_name,
      avatar_url: tableData.avatar_url,
      preferred_language: tableData.preferred_language,
      learning_style: tableData.learning_style,
      message:
        "Account created! Please check your email to confirm your account.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password is required" });
    }

    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) throw authError;

    const user = authData.users.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (!user.email_confirmed_at) {
      return res
        .status(403)
        .json({ error: "Please confirm your email before logging in" });
    }

    const { data: tableData, error: tableError } = await supabase
      .from("users")
      .select(
        "password_hash, full_name, avatar_url, preferred_language, learning_style, status"
      )
      .eq("email", email)
      .single();

    if (tableError || !tableData) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const PassMatch = await bcrypt.compare(password, tableData.password_hash);

    if (!PassMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      token,
      email,
      fullName: tableData.full_name,
      avatarUrl: tableData.avatar_url,
      preferredLanguage: tableData.preferred_language,
      learningStyle: tableData.learning_style,
      message: "Login successful",
    });
  } catch (error) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId; // directly from middleware
    console.log("Fetching profile for userId:", userId);

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !user) {
      console.error("Supabase returned error:", error);
      return res.status(404).json({ error: "User not found" });
    }

    delete user.password; // remove sensitive info
    res.json({ message: "User profile fetched successfully", user });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put(
  "/edit",
  authenticateToken,
  upload.single("avatar"),
  async (req, res) => {
    const { full_name } = req.body;
    const userId = req.userId;
    let avatar_url;

    try {
      // Handle avatar upload
      if (req.file) {
        const filepath = req.file.path;
        const fileExt = path.extname(req.file.originalname);
        const filename = `${userId}-${Date.now()}${fileExt}`;

        // Upload to Supabase
        const { data, error } = await supabase.storage
          .from("profiles")
          .upload(filename, fs.createReadStream(filepath), {
            cacheControl: "3600",
            upsert: true,
            contentType: req.file.mimetype,
          });

        fs.unlinkSync(filepath);

        if (error) throw error;

        const { data: publicData } = supabase.storage
          .from("profiles")
          .getPublicUrl(filename);

        avatar_url = publicData?.publicUrl;
      }

      // Prepare update object
      const updateObj = { updated_at: new Date().toISOString() };
      if (full_name) updateObj.full_name = full_name;
      if (avatar_url) updateObj.avatar_url = avatar_url;

      // Update user in Supabase
      const { data: userData, error: userError } = await supabase
        .from("users")
        .update(updateObj)
        .eq("id", userId)
        .select()
        .single();

      if (userError) throw userError;

      res.json({ success: true, user: userData });
    } catch (err) {
      console.error("Profile edit error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to update profile" });
    }
  }
);



// START SERVER
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
