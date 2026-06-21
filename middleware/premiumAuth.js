const jwt = require("jsonwebtoken");

const PremiumAuth = (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Invalid token format"
            });
        }

        const decoded = jwt.verify(token, "SECRET_KEY");

        req.user = decoded; // id + email

        next();

    } catch (error) {
        console.log(error);

        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }
};

module.exports = PremiumAuth;