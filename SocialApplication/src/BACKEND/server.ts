import { connectToDatabase } from "./db/conn";
import express from 'express';
import cors from 'cors';
const app = express();
const PORT = process.env.PORT || 5000;
const user = require("./routes/user");

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Failed to connect to the database', error);
    process.exit(1);
  });

//app.use("")
