import { z } from 'zod';

export function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? 'Check the provided values.';
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
