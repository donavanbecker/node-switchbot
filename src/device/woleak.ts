/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * woleak.ts: Switchbot BLE API registration.
 */
import type { Buffer } from 'node:buffer'

import type { waterLeakDetectorServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoLeak device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md#outdoor-temperaturehumidity-sensor
 */
export class WoLeak extends SwitchbotDevice {
  /**
   * Parses the service data for WoLeak.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<leakServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<waterLeakDetectorServiceData | null> {
    if (!serviceData || serviceData.length < 3) {
      emitLog('debugerror', `[parseServiceDataForWoLeakDetector] Service Data Buffer length ${serviceData?.length ?? 0} < 3!`)
      return null
    }

    if (!manufacturerData || manufacturerData.length < 2) {
      emitLog('debugerror', `[parseServiceDataForWoLeakDetector] Manufacturer Data Buffer length ${manufacturerData?.length ?? 0} < 2!`)
      return null
    }

    const modelId = serviceData.readUInt8(0)

    if (modelId !== 0x26) {
      // Not a Water Leak Detector
      emitLog('debugerror', `[parseServiceDataForWoLeakDetector] Model ID ${modelId} !== 0x26!`)
      return null
    }

    const eventFlags = serviceData.readUInt8(1)
    const waterLeakDetected = !!(eventFlags & 0b00000001) // Bit 0
    const deviceTampered = !!(eventFlags & 0b00000010) // Bit 1

    const batteryInfo = serviceData.readUInt8(2)
    const batteryLevel = batteryInfo & 0b01111111 // Bits 0-6
    const lowBattery = !!(batteryInfo & 0b10000000) // Bit 7

    // Manufacturer data can be processed here if needed

    const data = {
      model: SwitchBotBLEModel.Leak,
      modelName: SwitchBotBLEModelName.Leak,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Leak,
      leak: waterLeakDetected,
      tampered: deviceTampered,
      battery: batteryLevel,
      low_battery: lowBattery,
    }

    return data as waterLeakDetectorServiceData
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }
}
