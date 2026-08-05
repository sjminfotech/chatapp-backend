const mongoose = require("mongoose");

const grnSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },

    siteCode: { type: String, default: "" },
    site: { type: String, default: "" },
    invoiceNo: { type: String, required: true, index: true },
    year: { type: String, default: "" },
    month: { type: String, default: "" },
    transport: { type: String, default: "" },
    lrNo: { type: String, default: "" },
    vehicleNo: { type: String, default: "" },
    poNo: { type: String, default: "" },
    eway: { type: String, default: "" },
    make: { type: String, default: "" },
    model: { type: String, default: "" },
    machinen: { type: String, default: "" },
    assetNo: { type: String, default: "" },

    grnNum: { type: String, default: "" },
    grnDate: { type: Date, default: null },

    grnStatus: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GrnExcel", grnSchema);