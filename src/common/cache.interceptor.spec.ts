import { Test, TestingModule } from '@nestjs/testing';
import { CacheInterceptor } from './cache.interceptor';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Request, Response } from 'express';
import { of } from 'rxjs';
import { createHash } from 'crypto';

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let cacheManager: any;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInterceptor,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    interceptor = module.get<CacheInterceptor>(CacheInterceptor);
    cacheManager = module.get(CACHE_MANAGER);

    mockRequest = {
      method: 'GET',
      url: '/api/services',
      headers: {},
      query: {},
    };

    mockResponse = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      get: jest.fn(),
      statusCode: 200,
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as any;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'test' })),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication detection and no-cache behavior', () => {
    it('should NOT cache when Authorization header exists and set Cache-Control: no-store with security headers', async () => {
      mockRequest.headers = { authorization: 'Bearer token' };

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      result.subscribe(() => {
        expect(mockResponse.set).toHaveBeenCalledWith({
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
        });
      });
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should NOT cache when req.user exists and set Cache-Control: no-store with security headers', async () => {
      (mockRequest as any).user = { id: 1 };

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      result.subscribe(() => {
        expect(mockResponse.set).toHaveBeenCalledWith({
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
        });
      });
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should NOT cache when auth_token cookie exists', async () => {
      (mockRequest as any).cookies = { auth_token: 'token123' };

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      result.subscribe(() => {
        expect(mockResponse.set).toHaveBeenCalledWith({
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
        });
      });
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should NOT cache when session_id cookie exists', async () => {
      (mockRequest as any).cookies = { session_id: 'session123' };

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      result.subscribe(() => {
        expect(mockResponse.set).toHaveBeenCalledWith({
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
        });
      });
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should NOT cache when jwt cookie exists', async () => {
      (mockRequest as any).cookies = { jwt: 'jwt123' };

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      result.subscribe(() => {
        expect(mockResponse.set).toHaveBeenCalledWith({
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
        });
      });
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should NOT cache when session exists', async () => {
      (mockRequest as any).session = { userId: 1 };

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      result.subscribe(() => {
        expect(mockResponse.set).toHaveBeenCalledWith({
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
        });
      });
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('Non-GET requests', () => {
    it('should NOT cache non-GET requests', async () => {
      mockRequest.method = 'POST';

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('Endpoint allowlisting', () => {
    it('should cache allowed endpoint /api/services', async () => {
      mockRequest.url = '/api/services';
      cacheManager.get.mockResolvedValue(null);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(cacheManager.get).toHaveBeenCalled();
    });

    it('should cache allowed endpoint /api/services/categories', async () => {
      mockRequest.url = '/api/services/categories';
      cacheManager.get.mockResolvedValue(null);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(cacheManager.get).toHaveBeenCalled();
    });

    it('should cache allowed endpoint /api/locations/cities', async () => {
      mockRequest.url = '/api/locations/cities';
      cacheManager.get.mockResolvedValue(null);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(cacheManager.get).toHaveBeenCalled();
    });

    it('should NOT cache protected-like paths /api/pro/services', async () => {
      mockRequest.url = '/api/pro/services';

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should NOT cache /api/auth/login', async () => {
      mockRequest.url = '/api/auth/login';

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('Caching behavior', () => {
    it('should cache public allowlisted endpoint and return HIT on second call', async () => {
      const handlerData = { data: 'test' };
      const cachedData = handlerData; // The interceptor caches the handler's return value
      cacheManager.get.mockResolvedValueOnce(null).mockResolvedValueOnce(cachedData);

      // First call - MISS
      let result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      result.subscribe((res) => {
        expect(res).toEqual(handlerData);
        expect(mockResponse.set).toHaveBeenCalledWith({
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'Vary': 'Accept-Encoding',
          'X-Cache': 'MISS',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        });
      });

      // Second call - HIT
      result = await interceptor.intercept(mockExecutionContext, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockResponse.set).toHaveBeenCalledWith({
        ETag: expect.stringMatching(/^W\/"[a-f0-9]{64}"$/),
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Vary': 'Accept-Encoding',
        'X-Cache': 'HIT',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      });
      expect(cacheManager.get).toHaveBeenCalledTimes(2);
      expect(mockCallHandler.handle).toHaveBeenCalledTimes(1);
    });
  });

  describe('ETag handling', () => {
    it('should return 304 for ETag match and not call handler', async () => {
      const data = { services: [] };
      const expectedEtag = `W/"${createHash('sha256').update(JSON.stringify(data)).digest('hex')}"`;
      cacheManager.get.mockResolvedValue(data);
      mockRequest.headers = { 'if-none-match': expectedEtag };

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(result).toBeDefined();
      expect(mockResponse.status).toHaveBeenCalledWith(304);
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });

    it('should use SHA256 for ETag generation', () => {
      const data = { test: 'data' };
      const etag = (interceptor as any).generateETag(data);
      const expectedHash = createHash('sha256').update(JSON.stringify(data)).digest('hex');

      expect(etag).toBe(`W/"${expectedHash}"`);
    });
  });

  describe('Query parameter ordering', () => {
    it('should handle query parameter ordering consistently in cache keys', () => {
      const request1 = {
        method: 'GET',
        url: '/api/services',
        query: { b: '2', a: '1' },
      } as any as Request;

      const request2 = {
        method: 'GET',
        url: '/api/services',
        query: { a: '1', b: '2' },
      } as any as Request;

      const key1 = (interceptor as any).generateCacheKey(request1);
      const key2 = (interceptor as any).generateCacheKey(request2);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^api:[a-f0-9]{64}$/);
    });
  });

  describe('Security headers', () => {
    it('should set proper security headers on cached responses', async () => {
      const data = { services: [] };
      cacheManager.get.mockResolvedValue(data);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockResponse.set).toHaveBeenCalledWith({
        ETag: expect.any(String),
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Vary': 'Accept-Encoding',
        'X-Cache': 'HIT',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      });
    });

    it('should set proper security headers on miss responses', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe(() => {
        expect(mockResponse.set).toHaveBeenCalledWith({
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'Vary': 'Accept-Encoding',
          'X-Cache': 'MISS',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        });
      });
    });
  });
});