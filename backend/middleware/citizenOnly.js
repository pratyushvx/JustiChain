module.exports = (req, res, next) => {
  if (!req.user) return res.status(401).json({ msg: "Unauthorized" });

  if (req.user.role !== "citizen") {
    return res.status(403).json({ msg: "Citizen access only" });
  }

  next();
};
