const admin = require("firebase-admin");
const serviceAccount = require("../talks2us8987-firebase-adminsdk-fbsvc-50096fbd95.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
});

const bucket = admin.storage().bucket();

module.exports = bucket;