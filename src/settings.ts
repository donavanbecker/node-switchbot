/**
 * Switchbot BLE API registration settings.
 *
 * © 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 */
let baseURL = 'https://api.switch-bot.com'

let devicesURL = `${baseURL}/v1.1/devices`
let setupWebhook = `${baseURL}/v1.1/webhook/setupWebhook`
let queryWebhook = `${baseURL}/v1.1/webhook/queryWebhook`
let updateWebhook = `${baseURL}/v1.1/webhook/updateWebhook`
let deleteWebhook = `${baseURL}/v1.1/webhook/deleteWebhook`

/**
 * Updates the base URL for the SwitchBot API endpoints.
 * @param {string} newBaseURL - The new base URL to use.
 */
export function updateBaseURL(newBaseURL: string): void {
  baseURL = newBaseURL
  devicesURL = `${baseURL}/v1.1/devices`
  setupWebhook = `${baseURL}/v1.1/webhook/setupWebhook`
  queryWebhook = `${baseURL}/v1.1/webhook/queryWebhook`
  updateWebhook = `${baseURL}/v1.1/webhook/updateWebhook`
  deleteWebhook = `${baseURL}/v1.1/webhook/deleteWebhook`
}

export const urls = {
  get baseURL() { return baseURL },
  get devicesURL() { return devicesURL },
  get setupWebhook() { return setupWebhook },
  get queryWebhook() { return queryWebhook },
  get updateWebhook() { return updateWebhook },
  get deleteWebhook() { return deleteWebhook },
}

/**
 * constants used to access SwitchBot BLE API
 */
export const SERV_UUID_PRIMARY = 'cba20d00224d11e69fb80002a5d5c51b'
export const CHAR_UUID_WRITE = 'cba20002224d11e69fb80002a5d5c51b'
export const CHAR_UUID_NOTIFY = 'cba20003224d11e69fb80002a5d5c51b'
export const CHAR_UUID_DEVICE = '2a00'

export const READ_TIMEOUT_MSEC = 3000
export const WRITE_TIMEOUT_MSEC = 3000
export const COMMAND_TIMEOUT_MSEC = 3000

export const DEFAULT_DISCOVERY_DURATION = 5000
export const PRIMARY_SERVICE_UUID_LIST = []

export enum WoSmartLockProCommands {
  GET_CKIV = '570f2103',
  LOCK_INFO = '570f4f8102',
  UNLOCK = '570f4e0101000080',
  UNLOCK_NO_UNLATCH = '570f4e01010000a0',
  LOCK = '570f4e0101000000',
  ENABLE_NOTIFICATIONS = '570e01001e00008101',
  DISABLE_NOTIFICATIONS = '570e00',
}

export enum WoSmartLockCommands {
  GET_CKIV = '570f2103',
  LOCK_INFO = '570f4f8101',
  UNLOCK = '570f4e01011080',
  UNLOCK_NO_UNLATCH = '570f4e010110a0',
  LOCK = '570f4e01011000',
  ENABLE_NOTIFICATIONS = '570e01001e00008101',
  DISABLE_NOTIFICATIONS = '570e00',
}
