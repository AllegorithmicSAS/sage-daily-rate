const Sequelize = require('sequelize')

module.exports = function * (sequelize) {
  // Read-only
  const Rate = sequelize.define('Rate', {
    cbMarq: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    D_CodeISO: Sequelize.STRING,
    D_Cours: Sequelize.REAL
  }, { timestamps: false, tableName: 'P_DEVISE', hasTrigger: true })

  yield sequelize.sync()

  return { Rate }
}
