const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { connectDB, mongoose } = require("../config/db");
const { User } = require("../models");

async function main() {
  await connectDB();
  const email = process.env.ADMIN_EMAIL || process.argv[2] || "shumail1@gmail.com";
  const password = process.env.ADMIN_PASSWORD || process.argv[3] || "shumail1";
  const name = process.env.ADMIN_NAME || process.argv[4] || "Shumara Admin";
  const hash = await bcrypt.hash(password, 10);

  const user = await User.findOneAndUpdate(
    { email },
    {
      name,
      email,
      password: hash,
      role: "admin",
      is_verified: true,
    },
    { upsert: true, returnDocument: "after" }
  );

  console.log(`Admin ready: ${user.email}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
