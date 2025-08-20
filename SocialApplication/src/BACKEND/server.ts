import { connectToDatabase } from "./db/conn";
import express from 'express';
import cors from 'cors';
const user = require("./routes/user");
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';


const app = express();
const PORT = process.env.PORT || 5000;


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


app.use(cors());
app.use(helmet());
app.use(express.json());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});



app.use(limiter);

app.use('/user', user);


app.route("/user")
  .get(user)
  .post(user);


