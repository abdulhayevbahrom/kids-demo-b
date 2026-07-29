export function notFound(req, _res, next) {
  const error = new Error(`Manzil topilmadi: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Serverda kutilmagan xatolik.";

  if (error.code === 11000) {
    statusCode = 409;
    message = error.keyPattern?.username
      ? "Bu login allaqachon band."
      : error.keyPattern?.name
        ? "Bu nomdagi mahsulot allaqachon mavjud."
        : "Bu telefon raqami allaqachon ro‘yxatdan o‘tgan.";
  }
  if (error.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(error.errors)
      .map((item) => item.message)
      .join(" ");
  }

  res.status(statusCode).json({ success: false, message });
}
