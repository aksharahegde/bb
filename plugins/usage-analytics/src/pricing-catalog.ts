export interface ModelPricingRow {
  modelPattern: string;
  inputMicrosPerMillion: number;
  cacheReadMicrosPerMillion: number;
  cacheWriteMicrosPerMillion: number;
  outputMicrosPerMillion: number;
}

/**
 * Committed catalog for model-priced estimates. Values are micro-USD per
 * million tokens (1 USD = 1_000_000 micro-USD). Patterns are matched in
 * order; the first case-insensitive prefix or exact match wins.
 */
export const MODEL_PRICING_CATALOG: readonly ModelPricingRow[] = [
  {
    modelPattern: "claude-opus-4",
    inputMicrosPerMillion: 15_000_000,
    cacheReadMicrosPerMillion: 1_500_000,
    cacheWriteMicrosPerMillion: 18_750_000,
    outputMicrosPerMillion: 75_000_000,
  },
  {
    modelPattern: "claude-sonnet-4",
    inputMicrosPerMillion: 3_000_000,
    cacheReadMicrosPerMillion: 300_000,
    cacheWriteMicrosPerMillion: 3_750_000,
    outputMicrosPerMillion: 15_000_000,
  },
  {
    modelPattern: "claude-3-7-sonnet",
    inputMicrosPerMillion: 3_000_000,
    cacheReadMicrosPerMillion: 300_000,
    cacheWriteMicrosPerMillion: 3_750_000,
    outputMicrosPerMillion: 15_000_000,
  },
  {
    modelPattern: "claude-3-5-haiku",
    inputMicrosPerMillion: 800_000,
    cacheReadMicrosPerMillion: 80_000,
    cacheWriteMicrosPerMillion: 1_000_000,
    outputMicrosPerMillion: 4_000_000,
  },
  {
    modelPattern: "claude-haiku",
    inputMicrosPerMillion: 800_000,
    cacheReadMicrosPerMillion: 80_000,
    cacheWriteMicrosPerMillion: 1_000_000,
    outputMicrosPerMillion: 4_000_000,
  },
  {
    modelPattern: "gpt-4.1",
    inputMicrosPerMillion: 2_000_000,
    cacheReadMicrosPerMillion: 500_000,
    cacheWriteMicrosPerMillion: 0,
    outputMicrosPerMillion: 8_000_000,
  },
  {
    modelPattern: "gpt-4o",
    inputMicrosPerMillion: 2_500_000,
    cacheReadMicrosPerMillion: 1_250_000,
    cacheWriteMicrosPerMillion: 0,
    outputMicrosPerMillion: 10_000_000,
  },
  {
    modelPattern: "o3",
    inputMicrosPerMillion: 2_000_000,
    cacheReadMicrosPerMillion: 500_000,
    cacheWriteMicrosPerMillion: 0,
    outputMicrosPerMillion: 8_000_000,
  },
];
