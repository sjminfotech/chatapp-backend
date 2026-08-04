const mongoose = require("mongoose");

const pdfSchema = new mongoose.Schema(
  {
    // Kis user ne upload kiya
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Upload karne wale ka naam (JWT se auto save hoga)
    uploadedBy: {
      type: String,
      required: true,
      trim: true,
    },

    // Search fields
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    dcNo: {
      type: String,
      required: true,
      trim: true,
      unique: true, // 👈 UNIQUE Constraint Added (Duplicate DC Numbers Blocked)
      index: true,
    },

    assetNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // PDF info
    originalFileName: {
      type: String,
      default: "",
    },

    pdfUrl: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    // Optional remark
    remark: {
      type: String,
      default: "",
      trim: true,
    },

    // Stats
    viewCount: {
      type: Number,
      default: 0,
    },

    downloadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Fast text search
pdfSchema.index({
  name: "text",
  mobile: "text",
  dcNo: "text",
  assetNo: "text",
});

module.exports = mongoose.model("Pdf", pdfSchema);