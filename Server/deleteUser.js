import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Email to delete (replace with the email you want to remove)
const emailToDelete = "marklemin606@gmail.com";

async function deleteUserByEmail(email) {
  try {
    // 1️⃣ List users in Supabase Auth
    const { data, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const usersArray = data.users; // array of users
    const user = usersArray.find(u => u.email === email);

    if (!user) {
      console.log(`No user found in Auth with email: ${email}`);
    } else {
      // 2️⃣ Delete user from Supabase Auth
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteAuthError) throw deleteAuthError;
      console.log(`Deleted user from Auth: ${email}`);
    }

    // 3️⃣ Delete user from custom "users" table
    const { data: tableData, error: tableError } = await supabase
      .from("users")
      .delete()
      .eq("email", email);

    if (tableError) throw tableError;

    if (tableData.length > 0) {
      console.log(`Deleted user from 'users' table: ${email}`);
    } else {
      console.log(`No user found in 'users' table with email: ${email}`);
    }

  } catch (err) {
    console.error("Error deleting user:", err.message || err);
  }
}

// Run the deletion
deleteUserByEmail(emailToDelete);
