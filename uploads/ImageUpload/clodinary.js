import { v2 as cloudinary } from "cloudinary";
// import { Authenticated } from "../../Middleware/Auth";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

(async function () {
  try {
    // Upload an image
    const uploadResult = await cloudinary.uploader.upload("", {
      public_id: "shoes",
    });

    console.log("Upload Result:", uploadResult);

    // Optimize delivery
    const optimizeUrl = cloudinary.url("shoes", {
      fetch_format: "auto",
      quality: "auto",
    });

    console.log("Optimized Image URL:", optimizeUrl);

    // Auto-crop transformation
    const autoCropUrl = cloudinary.url("shoes", {
      crop: "auto",
      gravity: "auto",
      width: 500,
      height: 500,
    });

    console.log("Auto-Cropped Image URL:", autoCropUrl);
  } catch (error) {
    console.error("Cloudinary Error:", error);
  }
})();
