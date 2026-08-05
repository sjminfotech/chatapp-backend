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

// Helper function to extract cell value regardless of casing or extra spaces/dots
const getRowVal = (row, fieldKeys) => {
  const rowKeys = Object.keys(row);
  for (const expectedKey of fieldKeys) {
    const normalizedExpected = expectedKey.toLowerCase().replace(/[^a-z0-9]/g, "");
    const foundKey = rowKeys.find(
      (rk) => rk.trim().toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedExpected
    );
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      return String(row[foundKey]).trim();
    }
  }
  return "";
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
      cellDates: true,
    });

    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      raw: false,
    });

    console.log("Total Excel Rows:", sheetData.length);

    const records = [];

    for (const row of sheetData) {
      const invoiceNo = getRowVal(row, ["Invoice No", "InvoiceNo", "Invoice No."]);

      if (!invoiceNo) continue;

      // Safe Date Parsing
      let parsedGrnDate = null;
      const rawGrnDate = getRowVal(row, ["GRN Date", "GRNDate"]);
      if (rawGrnDate) {
        const d = new Date(rawGrnDate);
        if (!isNaN(d.getTime())) {
          parsedGrnDate = d;
        }
      }

      const grnNumVal = getRowVal(row, ["GRN NUM", "GRN Num", "GRNNUM"]);

      records.push({
        userId: req.user._id,
        uploadedBy: req.user.name || "Admin",

        siteCode: getRowVal(row, ["SITE CODE", "Site Code"]),
        site: getRowVal(row, ["SITE", "Site"]),
        invoiceNo,
        year: getRowVal(row, ["YEAR", "Year"]),
        month: getRowVal(row, ["MONTH", "Month"]),
        transport: getRowVal(row, ["Transport"]),
        lrNo: getRowVal(row, ["LR No.", "LR No", "LRNo"]),
        vehicleNo: getRowVal(row, ["Vehicle No", "Vehicle No."]),
        poNo: getRowVal(row, ["PO No.", "PO No", "PONo"]),
        eway: getRowVal(row, ["Eway", "E-Way"]),
        make: getRowVal(row, ["MAKE", "Make"]),
        model: getRowVal(row, ["Model"]),
        machinen: getRowVal(row, ["Machinen", "Machine"]),
        assetNo: getRowVal(row, ["Asset No.", "Asset No"]),

        grnNum: grnNumVal,
        grnDate: parsedGrnDate,

        grnStatus: grnNumVal ? "Completed" : "Pending",
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
    const { invoiceNo, grnNum, grnDate } = req.body;

    if (!invoiceNo || !grnNum || !grnDate) {
      return res.status(400).json({
        success: false,
        message: "Invoice No, GRN NUM and GRN Date are required",
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