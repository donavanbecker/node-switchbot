/*
 * wosmartlock.ts: Switchbot BLE API registration.
 * adapted off the work done by [pySwitchbot](https://github.com/Danielhiversen/pySwitchbot)
 */
import type Noble from '@stoprocent/noble'

import { Buffer } from 'node:buffer'
import * as Crypto from 'node:crypto'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types.js'

export class WoSmartLockPro extends SwitchbotDevice {
  _iv: Buffer | null
  _key_id: string
  _encryption_key: Buffer | null

  static COMMAND_GET_CK_IV = '570f2103'
  static COMMAND_LOCK_INFO = '570f4f8102'
  static COMMAND_UNLOCK = '570f4e0101000080'
  static COMMAND_UNLOCK_NO_UNLATCH = '570f4e01010000a0'
  static COMMAND_LOCK = '570f4e0101000000'
  static COMMAND_ENABLE_NOTIFICATIONS = '570e01001e00008101'
  static COMMAND_DISABLE_NOTIFICATIONS = '570e00'

  static Result = {
    ERROR: 0x00,
    SUCCESS: 0x01,
    SUCCESS_LOW_BATTERY: 0x06,
  }

  static validateResponse(res: Buffer) {
    if (res.length >= 3) {
      switch (res.readUInt8(0)) {
        case WoSmartLockPro.Result.SUCCESS:
          return WoSmartLockPro.Result.SUCCESS
        case WoSmartLockPro.Result.SUCCESS_LOW_BATTERY:
          return WoSmartLockPro.Result.SUCCESS_LOW_BATTERY
      }
    }
    return WoSmartLockPro.Result.ERROR
  }

  static getLockStatus(code: number) {
    switch (code) {
      case 0b0000000:
        return 'LOCKED'
      case 0b0010000:
        return 'UNLOCKED'
      case 0b0100000:
        return 'LOCKING'
      case 0b0110000:
        return 'UNLOCKING'
      case 0b1000000:
        return 'LOCKING_STOP'
      case 0b1010000:
        return 'UNLOCKING_STOP'
      case 0b01100000: // Only EU lock type
        return 'NOT_FULLY_LOCKED'
      default:
        return 'UNKNOWN'
    }
  }

  static parseServiceData(serviceData: Buffer, manufacturerData: Buffer, onlog: ((message: string) => void) | undefined) {
    if (manufacturerData.length < 11) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoSmartLockPro] Buffer length ${manufacturerData.length} is too short!`,
        )
      }
      return null
    }

    // adv data needs both service data and manufacturer data
    // byte var names based on documentation
    const byte2 = serviceData.readUInt8(2)
    const byte7 = manufacturerData.readUInt8(7)
    const byte8 = manufacturerData.readUInt8(8)
    const byte9 = manufacturerData.readUInt8(9)
    const byte11 = manufacturerData.readUInt8(11)

    const battery = byte2 & 0b01111111 // %
    const calibration = !!(byte7 & 0b10000000)
    const status = WoSmartLockPro.getLockStatus((byte7 & 0b00111000) >> 3)
    const door_open = !!(byte8 & 0b01100000)
    // Double lock mode is not supported on Lock Pro
    const update_from_secondary_lock = false // byte7 & 0b00001000 ? true : false;
    const double_lock_mode = false // byte8 & 0b10000000 ? true : false;
    const unclosed_alarm = !!(byte11 & 0b10000000)
    const unlocked_alarm = !!(byte11 & 0b01000000)
    const auto_lock_paused = !!(byte8 & 0b100000)
    const night_latch = !!(byte9 & 0b00000001)
    // const manual = byte7 & 0b100000;

    const data = {
      model: SwitchBotBLEModel.LockPro,
      modelName: SwitchBotBLEModelName.LockPro,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.LockPro,
      battery,
      calibration,
      status,
      update_from_secondary_lock,
      door_open,
      double_lock_mode,
      unclosed_alarm,
      unlocked_alarm,
      auto_lock_paused,
      night_latch,
    }

    return data
  }

  constructor(peripheral: Noble.Peripheral, noble: typeof Noble) {
    super(peripheral, noble)
    this._iv = null
    this._key_id = ''
    this._encryption_key = null
  }

  /* ------------------------------------------------------------------
   * setKey()
   * - initialise the encryption key info for valid lock communication, this currently must be retrived externally
   *
   * [Arguments]
   * - keyId, encryptionKey
   *
   * [Return value]
   * - void
   * ---------------------------------------------------------------- */
  setKey(keyId: string, encryptionKey: string) {
    this._iv = null
    this._key_id = keyId
    this._encryption_key = Buffer.from(encryptionKey, 'hex')
  }

  /* ------------------------------------------------------------------
   * unlock()
   * - Unlock the Smart Lock
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   WoSmartLockPro.LockResult will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  unlock() {
    return new Promise<number>((resolve, reject) => {
      this._operateLock(WoSmartLockPro.COMMAND_UNLOCK)
        .then((resBuf) => {
          resolve(WoSmartLockPro.validateResponse(resBuf))
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  /* ------------------------------------------------------------------
   * unlockNoUnlatch()
   * - Unlock the Smart Lock without unlatching door
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   WoSmartLockPro.LockResult will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  unlockNoUnlatch() {
    return new Promise<number>((resolve, reject) => {
      this._operateLock(WoSmartLockPro.COMMAND_UNLOCK_NO_UNLATCH)
        .then((resBuf) => {
          resolve(WoSmartLockPro.validateResponse(resBuf))
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  /* ------------------------------------------------------------------
   * lock()
   * - Lock the Smart Lock
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   WoSmartLockPro.LockResult will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  lock() {
    return new Promise<number>((resolve, reject) => {
      this._operateLock(WoSmartLockPro.COMMAND_LOCK)
        .then((resBuf) => {
          resolve(WoSmartLockPro.validateResponse(resBuf))
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  /* ------------------------------------------------------------------
   * info()
   * - Get general state info from the Smart Lock
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   state object will be passed to the `resolve()`
   * ---------------------------------------------------------------- */
  info() {
    return new Promise((resolve, reject) => {
      this._operateLock(WoSmartLockPro.COMMAND_LOCK_INFO)
        .then((resBuf) => {
          const data = {
            calibration: Boolean(resBuf[0] & 0b10000000),
            status: WoSmartLockPro.getLockStatus((resBuf[0] & 0b01110000) >> 4),
            door_open: Boolean(resBuf[0] & 0b00000100),
            unclosed_alarm: Boolean(resBuf[1] & 0b00100000),
            unlocked_alarm: Boolean(resBuf[1] & 0b00010000),
          }
          resolve(data)
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  _encrypt(str: string) {
    const cipher = Crypto.createCipheriv('aes-128-ctr', this._encryption_key!, this._iv)
    return Buffer.concat([cipher.update(str, 'hex'), cipher.final()]).toString('hex')
  }

  _decrypt(data: Buffer) {
    const decipher = Crypto.createDecipheriv('aes-128-ctr', this._encryption_key!, this._iv)
    return Buffer.concat([decipher.update(data), decipher.final()])
  }

  async _getIv(): Promise<Buffer> {
    if (this._iv === null) {
      const res = await this._operateLock(WoSmartLockPro.COMMAND_GET_CK_IV + this._key_id, false)
      this._iv = res.subarray(4)
    }
    return this._iv
  }

  async _encryptedCommand(key: string) {
    const iv = await this._getIv()
    const req = Buffer.from(
      key.substring(0, 2) + this._key_id + Buffer.from(iv.subarray(0, 2)).toString('hex') + this._encrypt(key.substring(2))
      , 'hex',
    )

    const bytes: unknown = await this._command(req)
    const buf = Buffer.from(bytes as Uint8Array)
    const code = WoSmartLockPro.validateResponse(buf)

    if (code !== WoSmartLockPro.Result.ERROR) {
      return Buffer.concat([buf.subarray(0, 1), this._decrypt(buf.subarray(4))])
    } else {
      throw (
        new Error(`The device returned an error: 0x${buf.toString('hex')}`,
        )
      )
    }
  }

  _operateLock(key: string, encrypt: boolean = true): Promise<Buffer> {
    // encrypted command
    if (encrypt) {
      return this._encryptedCommand(key)
    }

    // unencypted command
    return new Promise((resolve, reject) => {
      const req = Buffer.from(`${key.substring(0, 2)}000000${key.substring(2)}`, 'hex')

      this._command(req).then((bytes) => {
        const buf = Buffer.from(bytes as Uint8Array)
        const code = WoSmartLockPro.validateResponse(buf)

        if (code === WoSmartLockPro.Result.ERROR) {
          reject(new Error(`The device returned an error: 0x${buf.toString('hex')}`))
        } else {
          resolve(buf)
        }
      }).catch((error) => {
        reject(error)
      })
    })
  }
}