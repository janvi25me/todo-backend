import express from "express";
import dotenv from "dotenv";
import "./db.js";
import cors from "cors";
import bodyParser from "body-parser";
import userRoute from "./Routes/userRoute.js";

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

dotenv.config();

app.use(
  cors({
    origin: "http://localhost:5173" || true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use("/api/user", userRoute);

app.listen(process.env.PORT, () => {
  console.log(`Server is started on ${process.env.PORT}`);
});
