import { z } from 'zod';

export const apiBaseUrl = z
  .url()
  .parse(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000')
  .replace(/\/$/, '');
