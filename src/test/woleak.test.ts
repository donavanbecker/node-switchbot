import type { waterLeakDetectorServiceData } from '../types/bledevicestatus.js'

import { Buffer } from 'node:buffer'

import { WoLeak } from '../device/woleak.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woLeak', () => {
  describe('parseServiceData', () => {
    const emitLog = jest.fn()

    beforeEach(() => {
      emitLog.mockClear()
    })

    it('should return null if serviceData is null or length < 3', async () => {
      const result = await WoLeak.parseServiceData(Buffer.from([]), Buffer.from([]), emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('debugerror', '[parseServiceDataForWoLeakDetector] Service Data Buffer length 0 < 3!')
    })

    it('should return null if modelId is not 0x26', async () => {
      const serviceData = Buffer.from([0x25, 0x00, 0x00])
      const result = await WoLeak.parseServiceData(serviceData, Buffer.from([]), emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('debugerror', '[parseServiceDataForWoLeakDetector] Model ID 37 !== 0x26!')
    })

    it('should parse valid serviceData correctly', async () => {
      const serviceData = Buffer.from([0x26, 0x03, 0x85])
      const expectedData: waterLeakDetectorServiceData = {
        model: SwitchBotBLEModel.Leak,
        modelName: SwitchBotBLEModelName.Leak,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Leak,
        water_leak_detected: true,
        device_tampered: true,
        battery_level: 5,
        low_battery: true,
      }

      const result = await WoLeak.parseServiceData(serviceData, Buffer.from([]), emitLog)
      expect(result).toEqual(expectedData)
    })

    it('should parse serviceData with no events correctly', async () => {
      const serviceData = Buffer.from([0x26, 0x00, 0x00])
      const expectedData: waterLeakDetectorServiceData = {
        model: SwitchBotBLEModel.Leak,
        modelName: SwitchBotBLEModelName.Leak,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Leak,
        water_leak_detected: false,
        device_tampered: false,
        battery_level: 0,
        low_battery: false,
      }

      const result = await WoLeak.parseServiceData(serviceData, Buffer.from([]), emitLog)
      expect(result).toEqual(expectedData)
    })
  })
})
