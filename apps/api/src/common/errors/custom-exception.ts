import {
  HttpException,
  HttpExceptionOptions,
  HttpStatus,
} from "@nestjs/common";

/**
 * Custom exception that includes an error code for i18n translation
 */
export class CustomException extends HttpException {
  public readonly errorCode: string;

  constructor(
    errorCode: string,
    statusCode: HttpStatus,
    message?: string | object,
    options?: HttpExceptionOptions
  ) {
    super(message || "", statusCode, options);
    this.errorCode = errorCode;
  }

  /**
   * Create a BadRequestException with error code
   */
  static badRequest(
    errorCode: string,
    message?: string | object,
    options?: HttpExceptionOptions
  ) {
    return new CustomException(
      errorCode,
      HttpStatus.BAD_REQUEST,
      message,
      options
    );
  }

  /**
   * Create an UnauthorizedException with error code
   */
  static unauthorized(
    errorCode: string,
    message?: string | object,
    options?: HttpExceptionOptions
  ) {
    return new CustomException(
      errorCode,
      HttpStatus.UNAUTHORIZED,
      message,
      options
    );
  }

  /**
   * Create a ForbiddenException with error code
   */
  static forbidden(
    errorCode: string,
    message?: string | object,
    options?: HttpExceptionOptions
  ) {
    return new CustomException(
      errorCode,
      HttpStatus.FORBIDDEN,
      message,
      options
    );
  }

  /**
   * Create a NotFoundException with error code
   */
  static notFound(
    errorCode: string,
    message?: string | object,
    options?: HttpExceptionOptions
  ) {
    return new CustomException(
      errorCode,
      HttpStatus.NOT_FOUND,
      message,
      options
    );
  }

  /**
   * Create a ConflictException with error code
   */
  static conflict(
    errorCode: string,
    message?: string | object,
    options?: HttpExceptionOptions
  ) {
    return new CustomException(
      errorCode,
      HttpStatus.CONFLICT,
      message,
      options
    );
  }
}
