const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// Cloudinary config


const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const cleanFileName = file.originalname
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9]/g, "_");

    return {
      folder: "chat_media",
      resource_type: "auto", // Automatically detects images, video, audio, etc.
      public_id: `${Date.now()}-${cleanFileName}`,
    };
  },
});

const uploadMedia = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

module.exports = uploadMedia;