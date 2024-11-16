/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * worelayswitch1plus.ts: Switchbot BLE API registration.
 */
import type { relaySwitch1PlusServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'
import { type Cipher, createCipheriv } from 'node:crypto'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

const COMMAND_HEADER = '57'
const COMMAND_GET_CK_IV = `${COMMAND_HEADER}0f2103`
const COMMAND_TURN_OFF = `${COMMAND_HEADER}0f70010000`
const COMMAND_TURN_ON = `${COMMAND_HEADER}0f70010100`
const COMMAND_TOGGLE = `${COMMAND_HEADER}0f70010200`
const COMMAND_GET_VOLTAGE_AND_CURRENT = `${COMMAND_HEADER}0f7106000000`
// const PASSIVE_POLL_INTERVAL = 1 * 60

/**
 * Class representing a WoRelaySwitch1Plus device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/
 */
export class WoRelaySwitch1Plus extends SwitchbotDevice {
  private _iv: Buffer | null = null
  private _cipher: Cipher | null = null
  private _keyId: string
  private _encryptionKey: Buffer

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
    const keyId = peripheral.advertisement.localName?.slice(-2) || ''
    const encryptionKey = peripheral.advertisement.localName?.slice(0, 32) || ''
    if (keyId.length === 0) {
      throw new Error('key_id is missing')
    } else if (keyId.length !== 2) {
      throw new Error('key_id is invalid')
    }
    if (encryptionKey.length === 0) {
      throw new Error('encryption_key is missing')
    } else if (encryptionKey.length !== 32) {
      throw new Error('encryption_key is invalid')
    }
    this._keyId = keyId
    this._encryptionKey = Buffer.from(encryptionKey, 'hex')
  }

  /**
   * Parses the service data for WoRelaySwitch1Plus.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<relaySwitch1PlusServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<relaySwitch1PlusServiceData | null> {
    if (serviceData.length < 8 || manufacturerData.length === null) {
      emitLog('debugerror', `[parseServiceDataForWoRelaySwitch1Plus] Buffer length ${serviceData.length} < 8!`)
      return null
    }

    const data: relaySwitch1PlusServiceData = {
      model: SwitchBotBLEModel.RelaySwitch1Plus,
      modelName: SwitchBotBLEModelName.RelaySwitch1Plus,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.RelaySwitch1Plus,
      mode: true, // for compatibility, useless
      state: !!(manufacturerData[7] & 0b10000000),
      sequence_number: manufacturerData[6],
    }

    return data
  }

  async turnOn(): Promise<boolean> {
    const result = await this._sendCommand(COMMAND_TURN_ON)
    const ok = this._checkCommandResult(result, 0, new Set([1]))
    if (ok) {
      this._overrideState({ isOn: true })
      this._fireCallbacks()
    }
    return ok
  }

  async turnOff(): Promise<boolean> {
    const result = await this._sendCommand(COMMAND_TURN_OFF)
    const ok = this._checkCommandResult(result, 0, new Set([1]))
    if (ok) {
      this._overrideState({ isOn: false })
      this._fireCallbacks()
    }
    return ok
  }

  async toggle(): Promise<boolean> {
    const result = await this._sendCommand(COMMAND_TOGGLE)
    return this._checkCommandResult(result, 0, new Set([1]))
  }

  async getVoltageAndCurrent(): Promise<{ voltage: number, current: number } | null> {
    const result = await this._sendCommand(COMMAND_GET_VOLTAGE_AND_CURRENT)
    const ok = this._checkCommandResult(result, 0, new Set([1]))
    if (ok) {
      return {
        voltage: result ? (result[9] << 8) + result[10] : 0,
        current: result ? (result[11] << 8) + result[12] : 0,
      }
    }
    return null
  }

  private async _sendCommand(key: string, retry: number | null = null, encrypt: boolean = true): Promise<Buffer | null> {
    if (!encrypt) {
      return await super._sendCommand(`${key.slice(0, 2)}000000${key.slice(2)}`, retry)
    }

    const result = await this._ensureEncryptionInitialized()
    if (!result) {
      return null
    }

    const encrypted = key.slice(0, 2) + this._keyId + this._iv!.slice(0, 2).toString('hex') + this._encrypt(key.slice(2))
    const response = await super._sendCommand(encrypted, retry)
    return response ? Buffer.concat([response.slice(0, 1), this._decrypt(response.slice(4))]) : null
  }

  private async _ensureEncryptionInitialized(): Promise<boolean> {
    if (this._iv !== null) {
      return true
    }

    const result = await this._sendCommand(COMMAND_GET_CK_IV + this._keyId, null, false)
    const ok = this._checkCommandResult(result, 0, new Set([1]))
    if (ok) {
      this._iv = result!.slice(4)
    }
    return ok
  }

  private _getCipher(): Cipher {
    if (this._cipher === null) {
      this._cipher = createCipheriv('aes-128-ctr', this._encryptionKey, this._iv!)
    }
    return this._cipher
  }

  private _encrypt(data: string): string {
    if (data.length === 0) {
      return ''
    }
    const cipher = this._getCipher()
    const encrypted = Buffer.concat([cipher.update(Buffer.from(data, 'hex')), cipher.final()])
    return encrypted.toString('hex')
  }

  private _decrypt(data: Buffer): Buffer {
    if (data.length === 0) {
      return Buffer.alloc(0)
    }
    const decipher = createCipheriv('aes-128-ctr', this._encryptionKey, this._iv!)
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
    return decrypted
  }
}
