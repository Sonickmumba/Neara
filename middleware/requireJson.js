/**
 * Content-Type guard for mutating requests.
 *
 * Blocks POST / PUT / PATCH / DELETE requests whose Content-Type is neither
 *   - application/json  (standard API call)
 *   - multipart/form-data  (file uploads — avatar, chat attachments, listing images)
 *
 * Only applies when the request actually carries a body (Content-Length > 0
 * or Transfer-Encoding is set). Bodyless DELETE/POST requests (e.g. unfavorite,
 * logout) are let through — there is no payload to forge.
 *
 * Why this defends against CSRF:
 *   A browser cross-site form POST can only set Content-Type to
 *   application/x-www-form-urlencoded or multipart/form-data without triggering
 *   a CORS preflight. Since our API only accepts JSON (or multipart for uploads),
 *   any www-form-urlencoded request is by definition either a CSRF probe or a
 *   mis-formed client — rejecting it is safe.
 *
 *   multipart/form-data is allowed because it is used by legitimate authenticated
 *   upload endpoints (/api/users/avatar, /api/conversations/:id/attachments,
 *   /api/images/upload). Those routes are further protected by multer's own
 *   file-size and MIME-type checks.
 */

const ALLOWED_CONTENT_TYPES = ['application/json', 'multipart/form-data'];
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

module.exports = function requireJson(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) return next();

  // No body → nothing to enforce (bodyless DELETE, POST with no payload, etc.)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const hasBody =
    contentLength > 0 || Boolean(req.headers['transfer-encoding']);
  if (!hasBody) return next();

  const ct = req.headers['content-type'] || '';
  const isAllowed = ALLOWED_CONTENT_TYPES.some((type) => ct.startsWith(type));

  if (!isAllowed) {
    return res.status(415).json({
      success: false,
      message: 'Unsupported Media Type — Content-Type must be application/json',
    });
  }

  return next();
};
