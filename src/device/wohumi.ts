/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wohumi.ts: Switchbot BLE API registration.
 */
import type { humidifierServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

const HUMIDIFIER_COMMAND_HEADER = '5701'
const TURN_ON_KEY = `${HUMIDIFIER_COMMAND_HEADER}0101`
const TURN_OFF_KEY = `${HUMIDIFIER_COMMAND_HEADER}0102`
const INCREASE_KEY = `${HUMIDIFIER_COMMAND_HEADER}0103`
const DECREASE_KEY = `${HUMIDIFIER_COMMAND_HEADER}0104`
const SET_AUTO_MODE_KEY = `${HUMIDIFIER_COMMAND_HEADER}0105`
const SET_MANUAL_MODE_KEY = `${HUMIDIFIER_COMMAND_HEADER}0106`

/**
 * Class representing a WoHumi device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/tree/latest/devicetypes
 */
export class WoHumi extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Parses the service data for WoHumi.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<humidifierServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<humidifierServiceData | null> {
    if (serviceData.length !== 8) {
      emitLog('debugerror', `[parseServiceDataForWoHumi] Buffer length ${serviceData.length} !== 8!`)
      return null
    }

    const byte1 = serviceData.readUInt8(1)
    const byte4 = serviceData.readUInt8(4)

    const onState = !!(byte1 & 0b10000000) // 1 - on
    const autoMode = !!(byte4 & 0b10000000) // 1 - auto
    const percentage = byte4 & 0b01111111 // 0-100%, 101/102/103 - Quick gear 1/2/3
    const humidity = autoMode ? 0 : percentage === 101 ? 33 : percentage === 102 ? 66 : percentage === 103 ? 100 : percentage

    const data: humidifierServiceData = {
      model: SwitchBotBLEModel.Humidifier,
      modelName: SwitchBotBLEModelName.Humidifier,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Humidifier,
      onState,
      autoMode,
      percentage: autoMode ? 0 : percentage,
      humidity,
    }

    return data
  }

  /**
   * Sends a command to the humidifier.
   * @param {Buffer} reqBuf - The command buffer.
   * @returns {Promise<void>}
   */
  protected async operateHumi(reqBuf: Buffer): Promise<void> {
    const resBuf = await this.command(reqBuf)
    const code = resBuf.readUInt8(0)

    if (resBuf.length !== 3 || (code !== 0x01 && code !== 0x05)) {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }

  /**
   * Turns on the humidifier.
   * @returns {Promise<void>}
   */
  public async turnOn(): Promise<void> {
    await this.operateHumi(Buffer.from(TURN_ON_KEY, 'hex'))
  }

  /**
   * Turns off the humidifier.
   * @returns {Promise<void>}
   */
  public async turnOff(): Promise<void> {
    await this.operateHumi(Buffer.from(TURN_OFF_KEY, 'hex'))
  }

  /**
   * Increases the humidifier setting.
   * @returns {Promise<void>}
   */
  public async increase(): Promise<void> {
    await this.operateHumi(Buffer.from(INCREASE_KEY, 'hex'))
  }

  /**
   * Decreases the humidifier setting.
   * @returns {Promise<void>}
   */
  public async decrease(): Promise<void> {
    await this.operateHumi(Buffer.from(DECREASE_KEY, 'hex'))
  }

  /**
   * Sets the humidifier to auto mode.
   * @returns {Promise<void>}
   */
  public async setAutoMode(): Promise<void> {
    await this.operateHumi(Buffer.from(SET_AUTO_MODE_KEY, 'hex'))
  }

  /**
   * Sets the humidifier to manual mode.
   * @returns {Promise<void>}
   */
  public async setManualMode(): Promise<void> {
    await this.operateHumi(Buffer.from(SET_MANUAL_MODE_KEY, 'hex'))
  }

  /**
   * Sets the humidifier level.
   * @param {number} level - The level to set (0-100).
   * @returns {Promise<void>}
   */
  public async percentage(level: number): Promise<void> {
    if (level < 0 || level > 100) {
      throw new Error('Level must be between 0 and 100')
    }
    const levelKey = `${HUMIDIFIER_COMMAND_HEADER}0107${level.toString(16).padStart(2, '0')}`
    await this.operateHumi(Buffer.from(levelKey, 'hex'))
  }
}
