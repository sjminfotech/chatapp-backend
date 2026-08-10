// models/WarehouseLog.js
const mongoose = require("mongoose");

const ItemDetailSchema = new mongoose.Schema({
  modelName: { type: String, required: true },
  machineNo: { type: String, required: true },
  barcodeNo: { type: String, required: true },
});

const WarehouseLogSchema = new mongoose.Schema(
  {
    // Common Reference ID
    referenceId: { type: String, required: true, unique: true }, // Auto-generated e.g. WH-2026-001

    // ---------------- 1. INBOUND / INVOICE SECTION ----------------
    inbound: {
      invoiceNo: { type: String },
      invoiceQty: { type: Number },
      invoicePdfUrl: { type: String },
      vehicleNo: { type: String },
      unloadDate: { type: Date },
      items: [ItemDetailSchema], // Array of models, machine nos & barcodes
    },

    // ---------------- 2. OUTBOUND / DELIVERY CHALLAN SECTION ----------------
    outbound: {
      deliveryChallanNo: { type: String },
      dispatchQty: { type: Number },
      vehicleNo: { type: String },
      driverName: { type: String },
      deliveryBoyName: { type: String },
      deliveryBoyMobile: { type: String },
      dispatchDateTime: { type: Date },
      challanPdfUrl: { type: String },
      items: [ItemDetailSchema],
    },

    // ---------------- 3. RETURN SECTION (PART 1 & PART 2) ----------------
    returnSection: {
      // Part 1: Warehouse Receiver Entry
      returnVehicleNo: { type: String },
      driverName: { type: String },
      driverMobile: { type: String },
      deliveryBoyName: { type: String },
      deliveryBoyMobile: { type: String },
      returnDateTime: { type: Date },
      returnReason: { type: String },
      livePhotoUrl: { type: String },
      returnedItems: [ItemDetailSchema],

      // Part 2: PGR Verification Entry
      pgrNo: { type: String },
      pgrSubmittedAt: { type: Date },
      pgrSubmittedBy: { type: String },
      isFinalSubmitted: { type: Boolean, default: false },
    },

    status: {
      type: String,
      enum: ["INBOUND_RECEIVED", "OUTBOUND_DISPATCHED", "RETURNED_PENDING_PGR", "COMPLETED"],
      default: "INBOUND_RECEIVED",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WarehouseLog", WarehouseLogSchema);