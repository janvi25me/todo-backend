export const statusCodeResponse = {
  success: { code: 200, message: "Request successful" },
  created: { code: 201, message: "Resource created successfully" },
  accepted: { code: 202, message: "Request accepted, processing in progress" },
  noContent: { code: 204, message: "No content available" },

  badRequest: { code: 400, message: "Bad request. Please check your input" },
  unauthorized: { code: 401, message: "Unauthorized. Invalid credentials" },
  forbidden: { code: 403, message: "Forbidden. Access denied" },
  notFound: { code: 404, message: "Resource not found" },
  methodNotAllowed: { code: 405, message: "HTTP method not allowed" },
  conflict: { code: 409, message: "Conflict. Resource already exists" },
  unprocessableEntity: {
    code: 422,
    message: "Unprocessable entity. Validation failed",
  },
  tooManyRequests: {
    code: 429,
    message: "Too many requests. Please try again later",
  },

  serverError: { code: 500, message: "Internal server error" },
  notImplemented: { code: 501, message: "Not implemented" },
  badGateway: { code: 502, message: "Bad gateway" },
  serviceUnavailable: { code: 503, message: "Service unavailable" },
  gatewayTimeout: { code: 504, message: "Gateway timeout" },
};

export default statusCodeResponse;
