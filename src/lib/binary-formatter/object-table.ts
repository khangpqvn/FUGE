import { BINARY_FORMATTER_LIMITS, type BinaryFormatterLimits } from './limits'
import { BinaryFormatterError } from './reader'

export class ObjectTable {
  private readonly values = new Map<number, unknown>()
  private readonly limits: BinaryFormatterLimits

  constructor(limits: BinaryFormatterLimits = BINARY_FORMATTER_LIMITS) { this.limits = limits }

  set(id: number, value: unknown) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new BinaryFormatterError('Invalid object reference ID.')
    if (this.values.size >= this.limits.maxObjects && !this.values.has(id)) throw new BinaryFormatterError('Object count exceeds the safety limit.')
    this.values.set(id, value)
  }

  get(id: number) {
    if (!this.values.has(id)) throw new BinaryFormatterError('Unknown object reference ID.')
    return this.values.get(id)
  }

  has(id: number) { return this.values.has(id) }
}
