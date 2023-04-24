class CustomError extends Error {
  constructor(message, statusCode = 422) {
    super(message);
    this.statusCode = statusCode;
  }
}
global.customError = (error, statusCode = 422) => {
  if (typeof error === "string") {
    throw new CustomError(error, statusCode);
  } else if (error instanceof Error) {
    throw new CustomError(error?.message, statusCode);
  }
  throw new CustomError(error, statusCode);
};
