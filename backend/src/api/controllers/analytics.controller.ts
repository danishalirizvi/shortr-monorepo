import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../utils/AppError';
import { getShortUrlAnalytics } from '../../services/urlShortener.service';

export const getAnalytics: RequestHandler = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    if (!shortCode) {
      throw new AppError('Short code is required.', StatusCodes.BAD_REQUEST, 'MISSING_SHORT_CODE');
    }

    const analytics = await getShortUrlAnalytics(shortCode);

    if (!analytics) {
      throw new AppError('Short URL not found.', StatusCodes.NOT_FOUND, 'URL_NOT_FOUND');
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
};
