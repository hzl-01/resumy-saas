export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export function formatCliError(error: unknown): { message: string; exitCode: number } {
  if (error instanceof CliError) {
    return {
      message: error.message,
      exitCode: error.exitCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      exitCode: 1,
    };
  }

  return {
    message: "An unknown error occurred.",
    exitCode: 1,
  };
}
