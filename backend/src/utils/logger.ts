import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from '../config';

const { combine, timestamp, errors, json, colorize, printf } = format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const cid = correlationId ? `[${correlationId}] ` : '';
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${cid}${message}${extra}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

const fileTransport = new DailyRotateFile({
  dirname: config.logging.dir,
  filename: 'shortr-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: config.logging.level,
  format: prodFormat,
});

const logger = createLogger({
  level: config.logging.level,
  format: config.app.isDev ? devFormat : prodFormat,
  transports: [
    new transports.Console(),
    ...(config.app.isProd ? [fileTransport] : []),
  ],
  exitOnError: false,
});

export default logger;
