/**
 * Central error handler. Throw or next(err) from anywhere in a route and the
 * response shape stays the same, which keeps the front end simple.
 */
// eslint-disable-next-line no-unused-vars -- Express needs all four params
export default function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({
    message: status === 500 ? "Something went wrong." : err.message,
  });
}
