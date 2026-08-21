import { Request, Response, NextFunction } from 'express';

interface RateLimiterOptions {
  windowMs: number; // timeframe
  max: number;      // max requests within that timeframe
  message?: string; // customize response message
  statusCode?: number;
}

interface RequestRecord {
  timestamps: number[];
}

export class RateLimiter {
  private store: Map<string, RequestRecord> = new Map();
  private windowMs: number;
  private max: number;
  private message: string;
  private statusCode: number;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
    this.message = options.message || 'Muitas requisições vindas deste IP. Por favor, tente novamente mais tarde.';
    this.statusCode = options.statusCode || 429;

    // Periodically clean up old IPs to prevent memory leaks (refreshes twice per timeframe)
    const intervalMs = Math.max(10000, Math.min(this.windowMs / 2, 60000));
    setInterval(() => this.cleanup(), intervalMs);
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
      } else if (Array.isArray(forwarded)) {
        return forwarded[0];
      }
    }
    return req.socket.remoteAddress || req.ip || 'unknown-ip';
  }

  private cleanup() {
    const now = Date.now();
    for (const [ip, record] of this.store.entries()) {
      const validTimestamps = record.timestamps.filter(
        (timestamp) => now - timestamp < this.windowMs
      );
      if (validTimestamps.length === 0) {
        this.store.delete(ip);
      } else {
        this.store.set(ip, { timestamps: validTimestamps });
      }
    }
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction): any => {
      const ip = this.getClientIp(req);
      const now = Date.now();

      let record = this.store.get(ip);
      if (!record) {
        record = { timestamps: [] };
      }

      // Filter timestamps within current window
      const filteredTimestamps = record.timestamps.filter(
        (timestamp) => now - timestamp < this.windowMs
      );

      if (filteredTimestamps.length >= this.max) {
        // Exceeded limit
        const oldestTimestamp = filteredTimestamps[0];
        const resetTimeSec = Math.ceil((this.windowMs - (now - oldestTimestamp)) / 1000);
        
        res.setHeader('Retry-After', resetTimeSec);
        res.setHeader('X-RateLimit-Limit', this.max);
        res.setHeader('X-RateLimit-Remaining', 0);
        return res.status(this.statusCode).json({ error: this.message });
      }

      // Add current timestamp
      filteredTimestamps.push(now);
      this.store.set(ip, { timestamps: filteredTimestamps });

      // Set headers
      res.setHeader('X-RateLimit-Limit', this.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.max - filteredTimestamps.length));

      return next();
    };
  }
}
