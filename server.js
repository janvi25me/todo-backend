import express from "express";
import dotenv from "dotenv";
import "./db.js";
import cors from "cors";
import bodyParser from "body-parser";
import userRoute from "./Routes/userRoute.js";
import todoRoute from "./Routes/todoRoute.js";
// import adminRoute from "./Routes/adminRoute.js";

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
app.use("/api/product", todoRoute);

// app.use("/", (req, res) => {
//   res.send("This is home route");
// });

app.listen(process.env.PORT || 1000, () => {
  console.log(`Server is started on ${process.env.PORT}`);
});
