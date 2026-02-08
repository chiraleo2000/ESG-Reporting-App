/**
 * Error Handler & Middleware Unit Tests
 * Tests AppError classes, errorHandler, notFoundHandler, asyncHandler, auth middleware
 */
import { Request, Response, NextFunction } from 'express';

// ===================== ERROR CLASSES =====================
import {
  AppError, BadRequestError, UnauthorizedError, ForbiddenError,
  NotFoundError, ConflictError, ValidationError, InternalServerError,
  notFoundHandler, errorHandler, asyncHandler,
} from '../../src/middleware/errorHandler';

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

describe('Error Classes', () => {
  it('AppError should set statusCode and code', () => {
    const err = new AppError('test', 418, 'TEA');
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('TEA');
    expect(err.isOperational).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('BadRequestError should be 400', () => {
    const err = new BadRequestError('bad');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
  });

  it('UnauthorizedError should be 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  it('ForbiddenError should be 403', () => {
    const err = new ForbiddenError('no access');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('NotFoundError should be 404', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not Found');
  });

  it('ConflictError should be 409', () => {
    const err = new ConflictError('dup');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('ValidationError should be 422 with errors array', () => {
    const details = [{ field: 'name', message: 'required' }];
    const err = new ValidationError('bad data', details);
    expect(err.statusCode).toBe(422);
    expect(err.errors).toEqual(details);
  });

  it('InternalServerError should be 500', () => {
    const err = new InternalServerError();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
  });
});

describe('notFoundHandler', () => {
  it('should call next with NotFoundError', () => {
    const req = { method: 'GET', originalUrl: '/api/v1/missing' } as Request;
    const res = {} as Response;
    const next: NextFunction = jest.fn();

    notFoundHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err.message).toContain('/api/v1/missing');
  });
});

describe('errorHandler', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { path: '/test', method: 'GET' };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
  });

  it('should send operational error with correct status code', () => {
    const err = new BadRequestError('invalid input');
    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.objectContaining({ code: 'BAD_REQUEST', message: 'invalid input' }),
    });
  });

  it('should hide non-operational error details', () => {
    const err = new Error('secret crash');
    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.objectContaining({ message: 'An unexpected error occurred' }),
    });
  });

  it('should include validation error details', () => {
    const err = new ValidationError('validation', [{ field: 'email', message: 'required' }]);
    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(422);
    const call = (res.json as jest.Mock).mock.calls[0][0];
    expect(call.error.details).toEqual([{ field: 'email', message: 'required' }]);
  });

  it('should include stack in development', () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const err = new BadRequestError('dev');
    errorHandler(err, req as Request, res as Response, next);
    const call = (res.json as jest.Mock).mock.calls[0][0];
    expect(call.error.stack).toBeDefined();
    process.env.NODE_ENV = orig;
  });
});

describe('asyncHandler', () => {
  it('should call the handler and pass through', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);
    const req = {} as Request;
    const res = {} as Response;
    const next: NextFunction = jest.fn();

    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
  });

  it('should catch async errors and pass to next', async () => {
    const error = new Error('async fail');
    const handler = jest.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(handler);
    const req = {} as Request;
    const res = {} as Response;
    const next: NextFunction = jest.fn();

    await wrapped(req, res, next);

    // Need to wait for the promise to resolve
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(next).toHaveBeenCalledWith(error);
  });
});
