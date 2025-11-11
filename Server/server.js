import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// REGISTER ROUTE
app.post("/register", async (req, res) => {
  try {
    const { email, password, fullName, avatarUrl, preferredLanguage, learningStyle, date_of_birth } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Full name, email, and password are required" });
    }

   
    const password_hash = await bcrypt.hash(password, 10);

   
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
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
      message: "Account created! Please check your email to confirm your account.",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.post("/login", async (req,res) => {
  try {
    const {email, password} = req.body;

    if(!email || !password){
      return res.status(400).json({message: "email and password is required"});
    }

  const {data: authData, error: authError} = await supabase.auth.admin.listUsers();
  
  if(authError) throw authError;

  const user = authData.users.find(u => u.email === email);

  if(!user){
    return res.status(401).json({error: "Invalid email or password"});
  }
  if(!user.email_confirmed_at){
    return res.status(403).json({error:  "Please confirm your email before logging in"});
  }
  
  const {data: tableData, error: tableError} = await supabase.from("users").select("password_hash, full_name, avatar_url, preferred_language, learning_style, status")
  .eq("email", email).single();

  if(tableError || !tableData){
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const PassMatch = await bcrypt.compare(password, tableData.password_hash);

  if(!PassMatch){
    return res.status(401).json({ error: "Invalid email or password" });
  }

   const token = jwt.sign(
      { id: tableData.id, email: email },
      process.env.JWT_SECRET || "default_secret_key",
      { expiresIn: "7d" }
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
})

// START SERVER
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
