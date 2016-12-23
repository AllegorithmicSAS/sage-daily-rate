const _ = require('lodash')
const co = require('co')
const fs = require('fs')
const request = require('superagent')
const Sequelize = require('sequelize')
const bunyan = require('bunyan')
const log = bunyan.createLogger({
  name: 'sage-daily-rate',
  streams: [
    { stream: process.stdout },
    { path: 'sage-daily-rate.log' }
  ]
})

const getModels = require('./models')
const settings = JSON.parse(fs.readFileSync(`./settings.json`))

function * fetchRates () {
  return (yield request(settings.rateApi.url)).body
}

co(function * () {
  log.info({ srcUrl: settings.rateApi.url }, `starting fetch of all new rates`)
  const allRates = yield fetchRates()
  if (!allRates) {
    log.error({ srcUrl: settings.rateApi.url }, `cannot fetch rates`)
    return
  }
  log.info(`fetch done`)

  // DB init
  const sequelize = new Sequelize(settings.db, { logging: false })
  const models = yield getModels(sequelize)
  let successCount = 0
  let failCount = 0

  for (const isoCode in settings.rateApi.paths) {
    const newRate = _.get(allRates, settings.rateApi.paths[isoCode])

    if (!newRate) {
      log.warn({ isoCode }, `rate not found on online service`)
      failCount++
      continue
    }

    log.info({ isoCode, rate: newRate }, `rate found on online service`)

    const rateEntry = yield models.Rate.findOne({ where: { D_CodeISO: isoCode } })
    if (!rateEntry) {
      log.warn({ isoCode }, `ISO code not found in sage database, skipping`)
      failCount++
      continue
    }

    rateEntry.D_Cours = newRate
    yield rateEntry.save()
    log.info({ isoCode }, `sage sync done`)
    successCount++
  }

  sequelize.close()
  log.info({ successCount, failCount }, `done`)
}).catch(err => log.error(err))
