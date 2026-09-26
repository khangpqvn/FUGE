import { BINARY_FORMATTER_LIMITS, type BinaryFormatterLimits } from './limits'

export class BinaryFormatterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BinaryFormatterError'
  }
}

export class BinaryReader {
  readonly bytes: Uint8Array
  offset = 0
  private depth = 0
  private readonly limits: BinaryFormatterLimits

  constructor(bytes: Uint8Array, limits: BinaryFormatterLimits = BINARY_FORMATTER_LIMITS) {
    if (bytes.byteLength === 0 || bytes.byteLength > limits.maxBytes) throw new BinaryFormatterError('Legacy file is empty or exceeds the size limit.')
    this.bytes = bytes
    this.limits = limits
  }

  get remaining() { return this.bytes.byteLength - this.offset }
  get position() { return this.offset }

  byte() {
    this.require(1)
    return this.bytes[this.offset++]
  }

  int32() {
    this.require(4)
    const value = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 4).getInt32(0, true)
    this.offset += 4
    return value
  }

  uint32() {
    this.require(4)
    const value = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 4).getUint32(0, true)
    this.offset += 4
    return value
  }

  float32() {
    this.require(4)
    const value = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 4).getFloat32(0, true)
    this.offset += 4
    return value
  }

  int64() {
    this.require(8)
    const value = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 8).getBigInt64(0, true)
    this.offset += 8
    return value
  }

  bytesValue(length: number) {
    if (!Number.isSafeInteger(length) || length < 0 || length > this.limits.maxBytes) throw new BinaryFormatterError('Invalid binary length.')
    this.require(length)
    const value = this.bytes.slice(this.offset, this.offset + length)
    this.offset += length
    return value
  }

  length7Bit() {
    let value = 0
    let shift = 0
    for (let index = 0; index < 5; index += 1) {
      const byte = this.byte()
      value += (byte & 0x7f) * 2 ** shift
      if ((byte & 0x80) === 0) return value
      shift += 7
    }
    throw new BinaryFormatterError('Invalid 7-bit encoded length.')
  }

  utf8String(length = this.length7Bit()) {
    if (length > this.limits.maxStringBytes) throw new BinaryFormatterError('String exceeds the size limit.')
    return new TextDecoder('utf-8', { fatal: false }).decode(this.bytesValue(length))
  }

  enter() {
    this.depth += 1
    if (this.depth > this.limits.maxDepth) throw new BinaryFormatterError('Object nesting exceeds the safety limit.')
  }

  leave() { this.depth = Math.max(0, this.depth - 1) }

  require(length: number) {
    if (this.offset + length > this.bytes.byteLength) throw new BinaryFormatterError('Legacy file is truncated.')
  }

  expect(value: number, label: string) {
    const actual = this.byte()
    if (actual !== value) throw new BinaryFormatterError(`Unsupported BinaryFormatter ${label}.`)
  }
}
