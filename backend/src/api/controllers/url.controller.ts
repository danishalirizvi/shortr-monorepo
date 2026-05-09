import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createShortUrl } from '../../services/urlShortener.service';
import AppError from '../../utils/AppError';

export const createUrl: RequestHandler = async (req, res, next) => {
  try {
    const { longURL } = req.body as { longURL?: string };

    if (!longURL || typeof longURL !== 'string' || longURL.trim() === '') {
      throw new AppError('longURL is required in the request body.', StatusCodes.BAD_REQUEST, 'MISSING_URL');
    }

    const creatorIp = req.ip ?? '0.0.0.0';
    const result    = await createShortUrl(longURL.trim(), creatorIp);

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: {
        shortUrl:  result.shortUrl,
        shortCode: result.shortCode,
        longURL:   longURL.trim(),
      },
    });
  } catch (err) {
    next(err);
  }
};
