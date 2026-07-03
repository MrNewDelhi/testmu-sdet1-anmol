import 'dotenv/config';

export const env = {
  baseUrl: process.env.BASE_URL ?? 'http://127.0.0.1:9323',
  webBaseUrl: process.env.WEB_BASE_URL ?? 'https://ecommerce-playground.lambdatest.io',
  apiBaseUrl: process.env.API_BASE_URL ?? 'https://restful-booker.herokuapp.com',
  xaiApiKey: process.env.XAI_API_KEY ?? '',
  xaiModel: process.env.XAI_MODEL ?? 'grok-4.3',
  // Model used for multimodal (screenshot) failure analysis; defaults to the
  // main model, override with XAI_VISION_MODEL if it lacks vision support.
  xaiVisionModel: process.env.XAI_VISION_MODEL ?? process.env.XAI_MODEL ?? 'grok-4.3',
};

export function requireXaiApiKey(): string {
  if (!env.xaiApiKey) {
    throw new Error('XAI_API_KEY is required for the v1 self-healing demo.');
  }

  return env.xaiApiKey;
}
