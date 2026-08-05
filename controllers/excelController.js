const XLSX = require("xlsx");
const GrnExcel = require("../models/GrnExcel");

// ===============================
// 1. Download Sample Excel Format
// ===============================
exports.downloadSampleFormat = (req, res) => {
  try {
    const sampleData = [
      {
        "SITE CODE": "ST01",
        "SITE": "Delhi Depot",
        "Invoice No": "INV-2026-001",
        "YEAR": "2026",
        "MONTH": "August",
        "Transport": "Express Logistics",
        "LR No.": "LR9988",
        "Vehicle No": "UP14AB1234",
        "PO No.": "PO-8821",
        "Eway": "EW12345678",
        "MAKE": "TATA",
        "Model": "2025",
        "Machinen": "Generator",
        "Asset No.": "AST-1001",
        "GRN NUM": "",
        "GRN Date": "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "GRN_Sheet");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Bulk_GRN_Format.xlsx"
    );

    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ===============================
// 2. Upload Excel
// ===============================
exports.uploadBulkExcel = async (req, res) => {
  try {
    // 1. Check Auth User
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access. User not found in request.",
      });
    }

    // 2. Check File Upload
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Please upload a valid Excel file.",
      });
    }

    // 3. Read Workbook Buffer
    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: true, // Auto-parse JS Date objects from Excel
    });

    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName],
      { raw: false }
    );

    console.log("Total Excel Rows:", sheetData.length);

    const records = [];

    for (const row of sheetData) {
      const invoiceNo = row["Invoice No"]
        ? String(row["Invoice No"]).trim()
        : "";

      if (!invoiceNo) continue;

      // Safe Date Parsing
      let parsedGrnDate = null;
      if (row["GRN Date"]) {
        const d = new Date(row["GRN Date"]);
        if (!isNaN(d.getTime())) {
          parsedGrnDate = d;
        }
      }

      records.push({
        userId: req.user._id,
        uploadedBy: req.user.name || "Admin",

        siteCode: row["SITE CODE"] || "",
        site: row["SITE"] || "",
        invoiceNo,
        year: row["YEAR"] || "",
        month: row["MONTH"] || "",
        transport: row["Transport"] || "",
        lrNo: row["LR No."] || "",
        vehicleNo: row["Vehicle No"] || "",
        poNo: row["PO No."] || "",
        eway: row["Eway"] || "",
        make: row["MAKE"] || "",
        model: row["Model"] || "",
        machinen: row["Machinen"] || "",
        assetNo: row["Asset No."] || "",

        grnNum: row["GRN NUM"] || "",
        grnDate: parsedGrnDate,

        grnStatus: row["GRN NUM"] ? "Completed" : "Pending",
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid records found in the uploaded sheet.",
      });
    }

    // 4. Batch Insert
    const saved = await GrnExcel.insertMany(records);
    console.log("Saved Records Count:", saved.length);

    return res.status(200).json({
      success: true,
      message: `${saved.length} records uploaded successfully.`,
    });
  } catch (err) {
    console.error("========== ERROR ==========");
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};

// ===============================
// 3. Get All Records
// ===============================
exports.getAllRecords = async (req, res) => {
  try {
    const records = await GrnExcel.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      data: records,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ===============================
// 4. Get Record By Invoice
// ===============================
exports.getRecordByInvoice = async (req, res) => {
  try {
    const { invoiceNo } = req.params;

    const record = await GrnExcel.findOne({
      invoiceNo: invoiceNo.trim(),
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ===============================
// 5. Complete GRN
// ===============================
exports.completeGrnByInvoice = async (req, res) => {
  try {
    const {
      invoiceNo,
      grnNum,
      grnDate,
    } = req.body;

    if (!invoiceNo || !grnNum || !grnDate) {
      return res.status(400).json({
        success: false,
        message:
          "Invoice No, GRN NUM and GRN Date are required",
      });
    }

    const record = await GrnExcel.findOne({
      invoiceNo: invoiceNo.trim(),
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    record.grnNum = grnNum.trim();
    record.grnDate = new Date(grnDate);
    record.grnStatus = "Completed";

    await record.save();

    return res.status(200).json({
      success: true,
      message: "GRN Updated Successfully",
      data: record,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};