'use strict';
module.exports = {
  async up(q) {
    const Sequelize = require('sequelize');
    const desc = await q.describeTable('excusas').catch(()=>null);
    if (desc && desc.fecha && desc.fecha.allowNull === false) {
      await q.changeColumn('excusas', 'fecha', { type: Sequelize.DATEONLY, allowNull: true, defaultValue: null });
    }
  },
  async down(q) {
    const Sequelize = require('sequelize');
    const desc = await q.describeTable('excusas').catch(()=>null);
    if (desc && desc.fecha) {
      await q.changeColumn('excusas', 'fecha', { type: Sequelize.DATEONLY, allowNull: false });
    }
  }
};