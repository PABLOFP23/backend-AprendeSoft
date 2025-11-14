const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addColumn('usuarios', 'foto', {
      type: DataTypes.STRING(255),
      allowNull: true,
      after: 'fecha_nacimiento'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('usuarios', 'foto');
  }
};
