import express from "express";
import dotenv from "dotenv";
import path from "path";
import "./db.js";
import cors from "cors";
import bodyParser from "body-parser";
import userRoute from "./Routes/userRoute.js";
import productRoute from "./Routes/productRoute.js";
import cartRoute from "./Routes/cart.js";
import addressRoute from "./Routes/addressRoute.js";
import orderRoute from "./Routes/orderRoute.js";

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

app.use(
  "/uploads/UserImages/",
  express.static(path.join("uploads", "UserImages"))
);
app.use(
  "/uploads/ProductImages/",
  express.static(path.join("uploads", "ProductImages"))
);

app.use("/api/user", userRoute);
app.use("/api/product", productRoute);
app.use("/api/product/cart", cartRoute);
app.use("/api/address", addressRoute);
app.use("/api/order", orderRoute);

app.use("/mobile", (req, res) => {
  res.send([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.example.mlkit_example",
        sha256_cert_fingerprints: [
          "25:5A:C9:39:2A:4A:08:2B:BD:C3:38:1C:50:D0:1D:31:54:E0:4C:7E:D5:4C:C9:49:C3:57:AA:57:89:4F:5E:14",
        ],
      },
    },
  ]);
});

// Example backend verification (Node.js/Express)
app.use("/verify-recaptcha", async (req, res) => {
  if (req.method === "GET") {
    console.log("GET Request Received");
    return res.send("This endpoint expects a POST request.");
  }

  const { token, secret } = req.body;
  console.log("POST Request Received");
  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

//2nd january
app.use("/well-known", (req, res) => {
  res.send([
    ({
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "web",
        site: "https://www.200oksolutions.com/",
      },
    },
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.example.mlkit_example",
        sha256_cert_fingerprints: [
          "25:5A:C9:39:2A:4A:08:2B:BD:C3:38:1C:50:D0:1D:31:54:E0:4C:7E:D5:4C:C9:49:C3:57:AA:57:89:4F:5E:14",
        ],
      },
    }),
  ]);
});

app.listen(process.env.PORT || 1000, () => {
  console.log(`Server is started on ${process.env.PORT}`);
});
