import { Buffer } from 'node:buffer'

/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * woceilinglight.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/colorbulb.md
 */
export class WoCeilingLight extends SwitchbotDevice {
  static async parseServiceData(
    manufacturerData: Buffer,
    onlog: ((message: string) => void) | undefined,
  ): Promise<object | null> {
    if (manufacturerData.length !== 13) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseServiceDataForWoCeilingLight] Buffer length ${manufacturerData.length} !== 13!`)
      }
      return null
    }
    const byte1 = manufacturerData.readUInt8(1)// power and light status
    // const byte2 = manufacturerData.readUInt8(2);//bulb brightness
    const byte3 = manufacturerData.readUInt8(3)// bulb R
    const byte4 = manufacturerData.readUInt8(4)// bulb G
    const byte5 = manufacturerData.readUInt8(5)// bulb B
    const byte6 = manufacturerData.readUInt8(6)// bulb temperature
    const byte7 = manufacturerData.readUInt8(7)
    const byte8 = manufacturerData.readUInt8(8)
    const byte9 = manufacturerData.readUInt8(9)
    const byte10 = manufacturerData.readUInt8(10)// bulb mode

    const power = byte1
    const red = byte3
    const green = byte4
    const blue = byte5
    const color_temperature = byte6
    const state = !!(byte7 & 0b01111111)
    const brightness = byte7 & 0b01111111
    const delay = byte8 & 0b10000000
    const preset = byte8 & 0b00001000
    const color_mode = byte8 & 0b00000111
    const speed = byte9 & 0b01111111
    const loop_index = byte10 & 0b11111110

    const data = {
      model: SwitchBotBLEModel.CeilingLight,
      modelName: SwitchBotBLEModelName.CeilingLight,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.CeilingLight,
      color_temperature,
      power,
      state,
      red,
      green,
      blue,
      brightness,
      delay,
      preset,
      color_mode,
      speed,
      loop_index,
    }

    return data
  }

  static async parseServiceData_Pro(
    manufacturerData: Buffer,
    onlog: ((message: string) => void) | undefined,
  ): Promise<object | null> {
    if (manufacturerData.length !== 13) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoCeilingLightPro] Buffer length ${manufacturerData.length} !== 13!`,
        )
      }
      return null
    }
    const byte1 = manufacturerData.readUInt8(1)// power and light status
    // const byte2 = manufacturerData.readUInt8(2);//bulb brightness
    const byte3 = manufacturerData.readUInt8(3)// bulb R
    const byte4 = manufacturerData.readUInt8(4)// bulb G
    const byte5 = manufacturerData.readUInt8(5)// bulb B
    const byte6 = manufacturerData.readUInt8(6)// bulb temperature
    const byte7 = manufacturerData.readUInt8(7)
    const byte8 = manufacturerData.readUInt8(8)
    const byte9 = manufacturerData.readUInt8(9)
    const byte10 = manufacturerData.readUInt8(10)// bulb mode

    const power = byte1
    const red = byte3
    const green = byte4
    const blue = byte5
    const color_temperature = byte6
    const state = !!(byte7 & 0b01111111)
    const brightness = byte7 & 0b01111111
    const delay = byte8 & 0b10000000
    const preset = byte8 & 0b00001000
    const color_mode = byte8 & 0b00000111
    const speed = byte9 & 0b01111111
    const loop_index = byte10 & 0b11111110

    const data = {
      model: SwitchBotBLEModel.CeilingLightPro,
      modelName: SwitchBotBLEModelName.CeilingLightPro,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.CeilingLightPro,
      color_temperature,
      power,
      state,
      red,
      green,
      blue,
      brightness,
      delay,
      preset,
      color_mode,
      speed,
      loop_index,
    }

    return data
  }

  /**
   * @returns resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  async readState() {
    return await this.operateBot([0x57, 0x0F, 0x48, 0x01])
  }

  /**
   *
   */
  async setState(reqByteArray: number[]) {
    const base = [0x57, 0x0F, 0x47, 0x01]
    return await this.operateBot(base.concat(reqByteArray))
  }

  /**
   * @returns resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  async turnOn() {
    return await this.setState([0x01, 0x01])
  }

  /**
   * @returns resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  async turnOff() {
    return await this.setState([0x01, 0x02])
  }

  /**
   * @param brightness
   */
  async setBrightness(brightness: number) {
    if (typeof brightness !== 'number') {
      throw new TypeError(`The type of target brightness percentage is incorrect: ${typeof brightness}`)
    }
    if (brightness > 100) {
      brightness = 100
    } else if (brightness < 0) {
      brightness = 0
    }
    return await this.setState([0x02, 0x14])
  }

  /**
   * @returns resolves with color_temperature percent
   */
  async setColorTemperature(color_temperature: number) {
    if (typeof color_temperature !== 'number') {
      throw new TypeError(`The type of target color_temperature percentage is incorrect: ${typeof color_temperature}`)
    }
    if (color_temperature > 100) {
      color_temperature = 100
    } else if (color_temperature < 0) {
      color_temperature = 0
    }
    return await this.setState([0x02, 0x17, color_temperature])
  }

  /**
   * @param brightness
   * @param red
   * @param green
   * @param blue
   */
  async setRGB(brightness: number, red: number, green: number, blue: number) {
    if (typeof brightness !== 'number') {
      throw new TypeError(`The type of target brightness percentage is incorrect: ${typeof brightness}`)
    }
    if (typeof red !== 'number') {
      throw new TypeError(`The type of target red is incorrect: ${typeof red}`)
    }
    if (typeof green !== 'number') {
      throw new TypeError(`The type of target green is incorrect: ${typeof green}`)
    }
    if (typeof blue !== 'number') {
      throw new TypeError(`The type of target blue is incorrect: ${typeof blue}`)
    }
    if (brightness > 100) {
      brightness = 100
    } else if (brightness < 0) {
      brightness = 0
    }
    if (red > 255) {
      red = 255
    } else if (red < 0) {
      red = 0
    }
    if (green > 255) {
      green = 255
    } else if (green < 0) {
      green = 0
    }
    if (blue > 255) {
      blue = 255
    } else if (blue < 0) {
      blue = 0
    }
    return await this.setState([0x02, 0x12, brightness, red, green, blue])
  }

  /**
   * @param bytes
   */
  async operateBot(bytes: number[]): Promise<void> {
    const req_buf = Buffer.from(bytes)
    await this.command(req_buf)
      .then((res_bytes) => {
        const res_buf = Buffer.from(res_bytes)
        if (res_buf.length === 2) {
          const code = res_buf.readUInt8(1)
          if (code === 0x00 || code === 0x80) {
            const is_on = code === 0x80
            return is_on
          } else {
            throw new Error(`The device returned an error: 0x${res_buf.toString('hex')}`)
          }
        } else {
          throw new Error(`Expecting a 2-byte response, got instead: 0x${res_buf.toString('hex')}`)
        }
      })
      .catch((error) => {
        throw error
      })
  }
}
