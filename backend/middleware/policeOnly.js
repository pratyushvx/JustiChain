module.exports = (req, res, next) => {
  if (req.user.role !== "police") {
    return res.status(403).json({
      msg: "Police access only"
    });
  }
  next();
};
