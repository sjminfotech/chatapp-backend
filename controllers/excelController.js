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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload Excel file",
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
    });

    const sheetName = workbook.SheetNames[0];

    const sheetData = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName]
    );

    console.log("Rows:", sheetData.length);

    const records = [];

    for (const row of sheetData) {
      const invoiceNo = row["Invoice No"]
        ? String(row["Invoice No"]).trim()
        : "";

      if (!invoiceNo) continue;

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
        grnDate: row["GRN Date"]
          ? new Date(row["GRN Date"])
          : null,

        grnStatus: row["GRN NUM"]
          ? "Completed"
          : "Pending",
      });
    }

    if (records.length > 0) {
      const saved = await GrnExcel.insertMany(records);

      console.log("Saved:", saved.length);
    }

    return res.status(200).json({
      success: true,
      message: `${records.length} records uploaded successfully.`,
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