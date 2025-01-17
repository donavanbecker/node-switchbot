/* Copyright(C) 2017-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * pushbody.ts: @switchbot/homebridge-switchbot platform class.
 */
export interface bodyChange {
  command: string
  parameter: string
  commandType: string
}

export interface pushResponse {
  statusCode: number
  body: {
    commandId: string
  }
  message: string
}
