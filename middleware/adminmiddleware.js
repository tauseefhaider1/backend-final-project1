const adminKeyMiddleware = (req, res, next) => {
  const adminKey = req.headers["x-admin-key"];

  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated. Please login.",
    });
  }

  next();
};

export default adminKeyMiddleware;
