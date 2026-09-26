export const BINARY_FORMATTER_LIMITS = Object.freeze({
  maxBytes: 8 * 1024 * 1024,
  maxObjects: 100_000,
  maxStringBytes: 1 * 1024 * 1024,
  maxCollectionLength: 10_000,
  maxDepth: 64,
  maxMembers: 64,
})

export type BinaryFormatterLimits = typeof BINARY_FORMATTER_LIMITS
