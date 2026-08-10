// const Pdf = require('../models/Pdf');
const Pdf = require("../models/pdf");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const supabase = require("../config/supabase");
const path = require("path");

// =======================
// Upload PDF
// =======================
const uploadPdfController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF",
      });
    }

    const { mobile, dcNo, assetNo } = req.body;

    if (!mobile || !dcNo || !assetNo) {
      return res.status(400).json({
        success: false,
        message: "Mobile, DC No and Asset No are required",
      });
    }

    // Check if DC No already exists
    const existingPdf = await Pdf.findOne({ dcNo });

    if (existingPdf) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(409).json({
        success: false,
        message: "DC No already exists in database",
      });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const fileName = `${Date.now()}-${req.file.originalname}`;

    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(fileName);

    const pdf = await Pdf.create({
      userId: req.user._id,
      name: req.user.name,
      mobile,
      dcNo,
      assetNo,
      pdfUrl: data.publicUrl,
      publicId: fileName,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.user.name,
    });

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(201).json({
      success: true,
      message: "PDF uploaded successfully",
      pdf,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "DC No already exists in database",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =======================
// Get All PDFs
// =======================
const getAllPdfs = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await Pdf.countDocuments();

    const pdfs = await Pdf.find()
      .populate("userId", "name phone email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      page,
      total,
      totalPages: Math.ceil(total / limit),
      pdfs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =======================
// Search
// =======================
const searchPdfs = async (req, res) => {
  try {
    const search = req.query.q || "";

    const pdfs = await Pdf.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { dcNo: { $regex: search, $options: "i" } },
        { assetNo: { $regex: search, $options: "i" } },
      ],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: pdfs.length,
      pdfs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =======================
// Get Single PDF
// =======================
const getPdfById = async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);

    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: "PDF not found",
      });
    }

    pdf.viewCount += 1;
    await pdf.save();

    return res.status(200).json({
      success: true,
      pdf,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =======================
// Download PDF
// =======================
const downloadPdf = async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);

    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: "PDF not found",
      });
    }

    pdf.downloadCount += 1;
    await pdf.save();

    return res.status(200).json({
      success: true,
      downloadUrl: pdf.pdfUrl,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =======================
// Get PDF Stats
// =======================
const getPdfStats = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    let filter = {};

    if (userId) {
      filter.userId = userId;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filter.createdAt = { $gte: start, $lte: end };
    }

    const stats = await Pdf.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            user: "$userId",
          },
          pdfCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id.user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          date: "$_id.date",
          userName: { $ifNull: ["$userInfo.name", "$uploadedBy"] },
          userEmail: "$userInfo.email",
          pdfCount: 1,
        },
      },
      { $sort: { date: -1 } },
    ]);

    const totalCount = stats.reduce((acc, item) => acc + item.pdfCount, 0);

    return res.status(200).json({
      success: true,
      totalCount,
      stats,
    });
  } catch (error) {
    console.error("PDF Stats Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =======================
// Delete PDF
// =======================
const deletePdf = async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);

    if (!pdf) {
      return res.status(404).json({
        success: false,
        message: "PDF not found",
      });
    }

    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .remove([pdf.publicId]);

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    await pdf.deleteOne();

    return res.status(200).json({
      success: true,
      message: "PDF deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// EXPORTS (getPdfStats added here)
module.exports = {
  uploadPdfController,
  getAllPdfs,
  searchPdfs,
  getPdfById,
  downloadPdf,
  deletePdf,
  getPdfStats,
};