/**
 * Central error handler. Throw or next(err) from anywhere in a route and the
 * response shape stays the same, which keeps the front end simple.
 *
 * Mongoose errors are turned into the shapes in docs/api-spec.md → "Errors":
 * validation → 400 with a per-field `errors` map, bad ObjectId → 404,
 * duplicate unique key (e.g. email) → 409.
 */
// eslint-disable-next-line no-unused-vars -- Express needs all four params
export default function errorHandler(err, req, res, next) {
  if (err.name === "ValidationError") {
    const errors = {};
    for (const [field, e] of Object.entries(err.errors)) errors[field] = e.message;
    return res.status(400).json({ message: "Please fix the highlighted fields.", errors });
  }

  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(404).json({ message: "Not found." });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    if (field === "email") {
      return res.status(409).json({ message: "That email is already registered.", errors: { email: "That email is already registered." } });
    }
    return res.status(409).json({ message: "That already exists." });
  }

  const status = err.status || 500;

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({
    message: status === 500 ? "Something went wrong." : err.message,
    ...(err.errors && status === 400 ? { errors: err.errors } : {}),
  });
}

/** Create an error the handler above turns into `{ message }` with this status. */
export function httpError(status, message, errors) {
  const err = new Error(message);
  err.status = status;
  if (errors) err.errors = errors;
  return err;
}
