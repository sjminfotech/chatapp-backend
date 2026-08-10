const express = require("express");
const router = express.Router();

// Middlewares
const authMiddleware = require("../middleware/authMiddleware");
const uploadPdf = require("../middleware/uploadPdf"); // Multer instance

// Controllers
const pdfController = require("../controllers/pdfController");

// Safe extraction of controller functions (getPdfStats YAHAN ADD KIYA HAI)
const {
  uploadPdfController,
  getAllPdfs,
  searchPdfs,
  getPdfById,
  downloadPdf,
  deletePdf,
  getPdfStats, // 👈 Added getPdfStats
} = pdfController;

// 🔍 QUICK DEBUGGER
console.log("=== CHECKING ROUTE HANDLERS ===");
console.log("authMiddleware:", typeof authMiddleware);
console.log("uploadPdf:", typeof uploadPdf);
console.log("uploadPdfController:", typeof uploadPdfController);
console.log("getPdfStats:", typeof getPdfStats);
console.log("===============================");

// Handle Multer upload function dynamically
const uploadHandler =
  typeof uploadPdf?.single === "function"
    ? uploadPdf.single("pdf")
    : (req, res, next) => next();

// 1. Upload PDF Route
router.post(
  "/upload",
  authMiddleware,
  uploadHandler,
  uploadPdfController
);

// 2. Test Route
router.get("/test", authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// 3. Get all PDFs
router.get("/", authMiddleware, getAllPdfs);

// 4. Search PDF
router.get("/search", authMiddleware, searchPdfs);

// 5. PDF Stats Route (MUST BE ABOVE /:id)
router.get("/stats", authMiddleware, getPdfStats);

// 6. Download PDF
router.get("/download/:id", authMiddleware, downloadPdf);

// 7. Get single PDF (Hamesha baaki specific routes ke NICHE hona chahiye)
router.get("/:id", authMiddleware, getPdfById);

// 8. Delete PDF
router.delete("/:id", authMiddleware, deletePdf);

module.exports = router;