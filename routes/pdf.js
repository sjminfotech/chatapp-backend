const express = require("express");
const router = express.Router();

// Middlewares
const authMiddleware = require("../middleware/authMiddleware");
const uploadPdf = require("../middleware/uploadPdf"); // Multer instance

// Controllers
const pdfController = require("../controllers/pdfController");

// Safe extraction of controller functions
const {
  uploadPdfController,
  getAllPdfs,
  searchPdfs,
  getPdfById,
  downloadPdf,
  deletePdf,
} = pdfController;

// 🔍 QUICK DEBUGGER: Konsi cheez crash kar rahi hai terminal par turant dikhegi
console.log("=== CHECKING ROUTE HANDLERS ===");
console.log("authMiddleware:", typeof authMiddleware);
console.log("uploadPdf:", typeof uploadPdf);
console.log("uploadPdf.single:", typeof uploadPdf?.single);
console.log("uploadPdfController:", typeof uploadPdfController);
console.log("===============================");

// Handle Multer upload function dynamically
const uploadHandler = typeof uploadPdf?.single === "function" 
  ? uploadPdf.single("pdf") 
  : (req, res, next) => next();

// Upload PDF Route
router.post(
  "/upload",
  authMiddleware,
  uploadHandler,
  uploadPdfController
);

// Test Route
router.get("/test", authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// Get all PDFs
router.get("/", authMiddleware, getAllPdfs);

// Search PDF
router.get("/search", authMiddleware, searchPdfs);

// Get single PDF
router.get("/:id", authMiddleware, getPdfById);

// Download PDF
router.get("/download/:id", authMiddleware, downloadPdf);

// Delete PDF
router.delete("/:id", authMiddleware, deletePdf);

module.exports = router;