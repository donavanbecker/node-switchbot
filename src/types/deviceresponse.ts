import type { deviceList } from './devicelist.js'
import type { infraredRemoteList } from './irdevicelist.js'

// json response from SwitchBot API
export interface devices {
  statusCode: 100 | 190 | 'n/a'
  message: string
  body: body
}

interface body {
  deviceList: deviceList
  infraredRemoteList: infraredRemoteList
}
