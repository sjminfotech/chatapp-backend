const mongoose = require("mongoose");

const grnSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uploadedBy: { type: String, required: true },
    
    // Image Headers (Excel Fields)
    siteCode: { type: String, trim: true, default: "" },
    site: { type: String, trim: true, default: "" },
    invoiceNo: { type: String, required: true, trim: true, index: true }, // Invoice Match Karne Ke Liye
    year: { type: String, trim: true, default: "" },
    month: { type: String, trim: true, default: "" },
    transport: { type: String, trim: true, default: "" },
    lrNo: { type: String, trim: true, default: "" },
    vehicleNo: { type: String, trim: true, default: "" },
    poNo: { type: String, trim: true, default: "" },
    eway: { type: String, trim: true, default: "" },
    make: { type: String, trim: true, default: "" },
    model: { type: String, trim: true, default: "" },
    machinen: { type: String, trim: true, default: "" },
    assetNo: { type: String, trim: true, default: "" },

    // Step 2 Fields (Invoice Match ke Baad Update Honge)
    grnNum: { type: String, trim: true, default: "" },
    grnDate: { type: Date, default: null },

    // GRN Status
    grnStatus: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GrnExcel", grnSchema);