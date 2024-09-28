import { Buffer } from 'node:buffer'

import * as Noble from '@stoprocent/noble'
import { expect } from 'chai'
import sinon from 'sinon'

import { WoSmartLock } from '../device/wosmartlock.js'
import { WoSmartLockCommands } from '../settings.js'

describe('woSmartLock', () => {
  let lock: WoSmartLock
  let mockPeripheral: any
  let mockNoble: any

  beforeEach(() => {
    mockPeripheral = {}
    mockNoble = sinon.stub(Noble)
    lock = new WoSmartLock(mockPeripheral, mockNoble)
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('getLockStatus', () => {
    it('should return correct lock status', () => {
      expect(WoSmartLock.getLockStatus(0b0000000)).to.equal('LOCKED')
      expect(WoSmartLock.getLockStatus(0b0010000)).to.equal('UNLOCKED')
      expect(WoSmartLock.getLockStatus(0b0100000)).to.equal('LOCKING')
      expect(WoSmartLock.getLockStatus(0b0110000)).to.equal('UNLOCKING')
      expect(WoSmartLock.getLockStatus(0b1000000)).to.equal('LOCKING_STOP')
      expect(WoSmartLock.getLockStatus(0b1010000)).to.equal('UNLOCKING_STOP')
      expect(WoSmartLock.getLockStatus(0b1100000)).to.equal('NOT_FULLY_LOCKED')
      expect(WoSmartLock.getLockStatus(0b1110000)).to.equal('UNKNOWN')
    })
  })

  describe('parseServiceData', () => {
    it('should parse service data correctly', async () => {
      const serviceData = Buffer.from([0x00, 0x00, 0x7F, 0x0A, 0x81, 0x80])
      const manufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x20])
      const expectedData = {
        model: 'Lock',
        modelName: 'Lock',
        modelFriendlyName: 'Lock',
        battery: 127,
        calibration: false,
        status: 'UNLOCKED',
        update_from_secondary_lock: false,
        door_open: false,
        double_lock_mode: false,
        unclosed_alarm: false,
        unlocked_alarm: false,
        auto_lock_paused: false,
        night_latch: false,
      }

      const result = await WoSmartLock.parseServiceData(serviceData, manufacturerData, undefined)
      expect(result).to.deep.equal(expectedData)
    })

    it('should return null if manufacturer data is too short', async () => {
      const serviceData = Buffer.from([0x00, 0x00, 0x7F, 0x0A, 0x81, 0x80])
      const manufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00])
      const result = await WoSmartLock.parseServiceData(serviceData, manufacturerData, undefined)
      return expect(result).to.be.null
    })
  })

  describe('lock and unlock methods', () => {
    beforeEach(() => {
      sinon.stub(lock, 'operateLock').resolves(Buffer.from([0x01]))
    })

    it('should unlock the smart lock', async () => {
      const result = await lock.unlock()
      expect(result).to.equal(WoSmartLock.Result.SUCCESS)
    })

    it('should unlock the smart lock without unlatching', async () => {
      const result = await lock.unlockNoUnlatch()
      expect(result).to.equal(WoSmartLock.Result.SUCCESS)
    })

    it('should lock the smart lock', async () => {
      const result = await lock.lock()
      expect(result).to.equal(WoSmartLock.Result.SUCCESS)
    })

    it('should get lock info', async () => {
      const expectedData = {
        calibration: true,
        status: 'LOCKED',
        door_open: false,
        unclosed_alarm: false,
        unlocked_alarm: false,
      }
      sinon.stub(lock, 'operateLock').resolves(Buffer.from([0x01, 0b10000000, 0b00000000]))
      const result = await lock.info()
      expect(result).to.deep.equal(expectedData)
    })
  })

  describe('encrypt', () => {
    it('should encrypt a string', async () => {
      const str = 'test'
      lock.encryption_key = Buffer.from('0123456789abcdef0123456789abcdef', 'hex')
      lock.iv = Buffer.from('0123456789abcdef', 'hex')
      const encrypted = await lock.encrypt(str)
      expect(encrypted).to.be.a('string')
    })
  })

  describe('decrypt', () => {
    it('should decrypt a buffer', async () => {
      const data = Buffer.from('74657374', 'hex') // 'test' in hex
      lock.encryption_key = Buffer.from('0123456789abcdef0123456789abcdef', 'hex')
      lock.iv = Buffer.from('0123456789abcdef', 'hex')
      const decrypted = await lock.decrypt(data)
      expect(decrypted.toString()).to.equal('test')
    })
  })

  describe('getIv', () => {
    it('should get the IV', async () => {
      const res = Buffer.from('00000000000000000000000000000000', 'hex')
      sinon.stub(lock, 'operateLock').resolves(res)
      const iv = await lock.getIv()
      expect(iv).to.deep.equal(res.subarray(4))
    })
  })

  describe('encryptedCommand', () => {
    it('should send an encrypted command', async () => {
      const key = 'testKey'
      const iv = Buffer.from('0123456789abcdef', 'hex')
      const encrypted = 'encryptedString'
      const resBuf = Buffer.from('01000000', 'hex')
      sinon.stub(lock, 'getIv').resolves(iv)
      sinon.stub(lock, 'encrypt').resolves(encrypted)
      sinon.stub(lock, 'command').resolves(resBuf)
      sinon.stub(lock, 'decrypt').resolves(Buffer.from('decrypted', 'hex'))
      const result = await lock.encryptedCommand(key)
      expect(result).to.be.instanceOf(Buffer)
    })
  })

  describe('operateLock', () => {
    it('should operate the lock with encryption', async () => {
      const key = 'testKey'
      sinon.stub(lock, 'encryptedCommand').resolves(Buffer.from('01000000', 'hex'))
      const result = await lock.operateLock(key)
      expect(result).to.be.instanceOf(Buffer)
    })

    it('should operate the lock without encryption', async () => {
      const key = 'testKey'
      const resBuf = Buffer.from('01000000', 'hex')
      sinon.stub(lock, 'command').resolves(resBuf)
      const result = await lock.operateLock(key, false)
      expect(result).to.be.instanceOf(Buffer)
    })
  })
})
