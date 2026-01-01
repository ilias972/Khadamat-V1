import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Request, Response } from 'express';
import { createHash } from 'crypto';

const CACHE_TTL_MS = 5 * 60 * 1000; // 300000ms

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // ✅ CORRECTION : On type explicitement la Request et la Response
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method;
    const url = request.url;

    // Enhanced authentication detection
    const isAuthenticated =
      Boolean(request.headers.authorization) ||
      Boolean(request.user) ||
      Boolean((request as any).session) ||
      Boolean((request as any).cookies && (
        (request as any).cookies['auth_token'] ||
        (request as any).cookies['session_id'] ||
        (request as any).cookies['jwt']
      ));

    if (isAuthenticated) {
      // Skip caching entirely and set Cache-Control: no-store
      return next.handle().pipe(
        map((data) => {
          response.set({
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
          });
          return data;
        }),
      );
    }

    // Only cache GET requests
    if (method !== 'GET') {
      return next.handle();
    }

    // Check if endpoint should be cached
    const shouldCache = this.shouldCacheEndpoint(url);
    if (!shouldCache) {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(request);

    // Check for If-None-Match header (ETag)
    const ifNoneMatch = request.headers['if-none-match'];

    if (ifNoneMatch) {
      // ✅ CORRECTION : On utilise unknown au lieu de any pour plus de sécurité
      const cachedData = await this.cacheManager.get<unknown>(cacheKey);
      if (cachedData) {
        const etag = this.generateETag(cachedData);
        if (ifNoneMatch === etag) {
          response.status(304).send();
          return of(null);
        }
      }
    }

    // Check cache
    const cachedData = await this.cacheManager.get<unknown>(cacheKey);
    if (cachedData) {
      const etag = this.generateETag(cachedData);
      response.set({
        ETag: etag,
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Vary': 'Accept-Encoding',
        'X-Cache': 'HIT',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      });
      return of(cachedData);
    }

    return next.handle().pipe(
      tap(async (data) => {
        // Cache the response with enhanced safety checks
        if (
          data &&
          response.statusCode >= 200 &&
          response.statusCode < 300 &&
          !response.get('Set-Cookie') &&
          !response.get('Authorization')
        ) {
          await this.cacheManager.set(cacheKey, data, CACHE_TTL_MS);
        }
      }),
      map((data) => {
        if (data) {
          response.set({
            'Cache-Control': 'public, max-age=300, s-maxage=300',
            'Vary': 'Accept-Encoding',
            'X-Cache': 'MISS',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          });
        }
        return data;
      }),
    );
  }

  private shouldCacheEndpoint(url: string): boolean {
    const allowedPatterns = [
      /^\/api\/services(?:\/.*)?$/,
      /^\/api\/services\/categories$/,
      /^\/api\/locations\/cities$/,
      /^\/api\/locations\/categories$/,
      /^\/api\/health$/,
    ];

    const excludedPatterns = [
      /^\/api\/pro\//,
      /^\/api\/client\//,
      /^\/api\/user\//,
      /^\/api\/auth\//,
      /^\/api\/messaging\//,
      /^\/api\/bookings\//,
      /^\/api\/reviews\//,
      /^\/api\/subscriptions\//,
      /^\/api\/notifications\//,
      /^\/api\/stats\//,
      /^\/api\/disputes\//,
    ];

    return allowedPatterns.some(pattern => pattern.test(url)) &&
            !excludedPatterns.some(pattern => pattern.test(url));
  }

  // ✅ CORRECTION : request est typé comme Request (Express)
  private generateCacheKey(request: Request): string {
    const { method, url, query } = request;

    // Normalize query parameters by sorting keys
    const sortedQuery = Object.keys(query || {}).sort().reduce((obj, key) => {
      obj[key] = query[key];
      return obj;
    }, {} as any);

    // On construit l'objet clé proprement
    const keyData = {
      method,
      url,
      query: sortedQuery,
    };
    return `api:${createHash('sha256').update(JSON.stringify(keyData)).digest('hex')}`;
  }

  // ✅ CORRECTION : data peut être inconnu, c'est acceptable ici
  private generateETag(data: unknown): string {
    const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return `W/"${hash}"`; // Weak ETag for better compatibility
  }
}