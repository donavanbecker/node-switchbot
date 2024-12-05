/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * worelayswitch1plus.ts: Switchbot BLE API registration.
 */
import type { Buffer } from 'node:buffer'

import type { relaySwitch1ServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoRelaySwitch1 device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/
 */
export class WoRelaySwitch1 extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Parses the service data for WoRelaySwitch1.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<relaySwitch1ServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<relaySwitch1ServiceData | null> {
    if (serviceData.length < 8 || manufacturerData.length === null) {
      emitLog('debugerror', `[parseServiceDataForWoRelaySwitch1Plus] Buffer length ${serviceData.length} < 8!`)
      return null
    }

    const data: relaySwitch1ServiceData = {
      model: SwitchBotBLEModel.RelaySwitch1,
      modelName: SwitchBotBLEModelName.RelaySwitch1,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.RelaySwitch1,
      mode: true, // for compatibility, useless
      state: !!(manufacturerData[7] & 0b10000000),
      sequence_number: manufacturerData[6],
    }

    return data
  }
}
