const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    try {

        const token = req.header("Authorization");

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No Token"
            });
        }

        const decoded = jwt.verify(
            token,
            "SECRET_KEY"
        );

        if (decoded.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin Access Required"
            });
        }

        req.admin = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Invalid Token"
        });
    }
};