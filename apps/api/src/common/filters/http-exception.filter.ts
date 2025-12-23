import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { CustomException } from "../errors/custom-exception";

interface ExceptionResponse {
  message?: string | string[];
  errors?: unknown[];
  [key: string]: unknown;
}

interface ErrorResponse {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  errorCode?: string;
  errors?: unknown[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let errorCode: string | undefined;
    let errors: unknown[] | undefined = undefined;

    if (exception instanceof CustomException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const responseObj = exceptionResponse as ExceptionResponse;
        message = Array.isArray(responseObj.message)
          ? responseObj.message[0]
          : responseObj.message || exception.message || "";
        errors = responseObj.errors;
      } else {
        message = exception.message || "";
      }
      errorCode = exception.errorCode;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === "object" &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as ExceptionResponse;
        const responseMessage = Array.isArray(responseObj.message)
          ? responseObj.message[0]
          : responseObj.message;
        message = responseMessage || message;
        errors = responseObj.errors;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Add errorCode if available
    if (errorCode) {
      errorResponse.errorCode = errorCode;
    }

    // Add errors array if available (for validation errors)
    if (errors) {
      errorResponse.errors = errors;
    }

    response.status(status).json(errorResponse);
  }
}
