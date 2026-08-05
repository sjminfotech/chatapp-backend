const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  downloadSampleFormat,
  uploadBulkExcel,
  completeGrnByInvoice,
  getRecordByInvoice,
  getAllRecords,
} = require("../controllers/excelController");

const authMiddleware = require("../middleware/authMiddleware");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes
router.get("/download-format", downloadSampleFormat);
router.post("/upload", authMiddleware, upload.single("excelFile"), uploadBulkExcel);

// Step 2 APIs

// ✅ Fetch All Uploaded Records
router.get("/list", authMiddleware, getAllRecords);
router.get("/get-invoice/:invoiceNo", authMiddleware, getRecordByInvoice); // Frontend verification
router.put("/complete-grn", authMiddleware, completeGrnByInvoice); // Invoice match & GRN Success

module.exports = router;