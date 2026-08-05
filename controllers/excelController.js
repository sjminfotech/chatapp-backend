const XLSX = require("xlsx");
const GrnExcel = require("../models/GrnExcel");

// 1. Download Sample Excel Sheet (Sabhhi Image Headings ke Saath)
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

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Bulk_GRN_Format.xlsx");

    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Step 1: Bulk Excel Upload
exports.uploadBulkExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload an Excel file." });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log("Rows in Excel:", sheetData.length);
console.log("Sheet Data:", sheetData);
    const recordsToInsert = [];

    for (const row of sheetData) {


   console.log("Current Row:", row);
      const invoiceNo = row["Invoice No"] ? String(row["Invoice No"]).trim() : null;
      if (!invoiceNo) continue; // Skip if Invoice No is empty

      recordsToInsert.push({
        userId: req.user._id,
        uploadedBy: req.user.name || "Admin",
        siteCode: row["SITE CODE"] || "",
        site: row["SITE"] || "",
        invoiceNo: invoiceNo,
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
        grnDate: row["GRN Date"] ? new Date(row["GRN Date"]) : null,
        grnStatus: row["GRN NUM"] ? "Completed" : "Pending",
      });
    }

    if (recordsToInsert.length > 0) {
      console.log("Records to Insert:", recordsToInsert.length);
console.log(recordsToInsert);
     const saved = await GrnExcel.insertMany(recordsToInsert);

console.log("Saved Records:", saved.length);
console.log(saved);

    }

    return res.status(200).json({
      success: true,
      message: `${recordsToInsert.length} records uploaded successfully!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Get All Uploaded Records
exports.getAllRecords = async (req, res) => {
  try {
    console.log("Logged User:", req.user._id);

    const total = await GrnExcel.countDocuments();
    console.log("Total Records In DB:", total);

    const records = await GrnExcel.find();
    console.log("Records Found:", records.length);

    return res.status(200).json({
      success: true,
      data: records,
    });
  } catch (err) {
    console.error("Fetch Records Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// 3. STEP 2: Invoice No Match karke GRN NUM & GRN Date Add & Successful karna
exports.completeGrnByInvoice = async (req, res) => {
  try {
    const { invoiceNo, grnNum, grnDate } = req.body;

    if (!invoiceNo || !grnNum || !grnDate) {
      return res.status(400).json({
        success: false,
        message: "Invoice No, GRN NUM, and GRN Date are required fields.",
      });
    }

    // Invoice No se Database record khojna
    const record = await GrnExcel.findOne({ invoiceNo: invoiceNo.trim() });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Invoice No not found in database!",
      });
    }

    // Record Update & GRN Complete Status Set
    record.grnNum = grnNum.trim();
    record.grnDate = new Date(grnDate);
    record.grnStatus = "Completed";

    await record.save();

    return res.status(200).json({
      success: true,
      message: "GRN Details matched & Status set to Completed successfully!",
      data: record,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Invoice details fetch karna (Frontend Verification ke liye)
exports.getRecordByInvoice = async (req, res) => {
  try {
    const { invoiceNo } = req.params;
    const record = await GrnExcel.findOne({ invoiceNo: invoiceNo.trim() });

    if (!record) {
      return res.status(404).json({ success: false, message: "Invoice No not found!" });
    }

    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};