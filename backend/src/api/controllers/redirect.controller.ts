import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { resolveShortUrl } from '../../services/urlShortener.service';
import AppError from '../../utils/AppError';

export const redirectToOriginal: RequestHandler = async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const originalUrl   = await resolveShortUrl(shortCode);

    if (!originalUrl) {
      throw new AppError(`Short URL '${shortCode}' not found.`, StatusCodes.NOT_FOUND, 'URL_NOT_FOUND');
    }

    // 301 Permanent Redirect — browsers will cache this.
    // Trade-off: subsequent hits won't reach the server (no analytics for cached redirects).
    // Change to 302 if complete click-tracking coverage becomes a hard requirement.
    res.redirect(StatusCodes.MOVED_PERMANENTLY, originalUrl);
  } catch (err) {
    next(err);
  }
};
