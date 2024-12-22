/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * worelayswitch1pm.ts: Switchbot BLE API registration.
 */
import type { Buffer } from 'node:buffer'

import type { relaySwitch1PMServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoRelaySwitch1PM device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/
 */
export class WoRelaySwitch1PM extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Parses the service data for WoRelaySwitch1PM.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<relaySwitch1PMServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<relaySwitch1PMServiceData | null> {
    if (serviceData.length < 8 || manufacturerData.length === 0) {
      emitLog('debugerror', `[parseServiceDataForWoRelaySwitch1PM] Buffer length ${serviceData.length} < 8!`)
      return null
    }

    const data: relaySwitch1PMServiceData = {
      model: SwitchBotBLEModel.RelaySwitch1PM,
      modelName: SwitchBotBLEModelName.RelaySwitch1PM,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.RelaySwitch1PM,
      mode: true, // for compatibility, useless
      state: !!(manufacturerData[7] & 0b10000000),
      sequence_number: manufacturerData[6],
      power: ((manufacturerData[10] << 8) + manufacturerData[11]) / 10,
      voltage: 0,
      current: 0,
    }

    return data
  }
}
