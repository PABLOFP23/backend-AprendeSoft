// src/migrations/XXXXXXXXXXXXXX-update-roles-to-spanish.js
// (El nombre exacto te lo dará el comando anterior)
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Primero, agregar la nueva columna ENUM con valores en español
    await queryInterface.changeColumn('Users', 'role', {
      type: DataTypes.ENUM('administrador', 'profesor', 'estudiante', 'admin', 'teacher', 'student'),
      allowNull: false,
      defaultValue: 'estudiante'
    });

    // Actualizar los valores existentes
    await queryInterface.sequelize.query(`
      UPDATE Users SET role = 'administrador' WHERE role = 'admin'
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE Users SET role = 'profesor' WHERE role = 'teacher'
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE Users SET role = 'estudiante' WHERE role = 'student'
    `);

    // Finalmente, cambiar la columna para solo permitir valores en español
    await queryInterface.changeColumn('Users', 'role', {
      type: DataTypes.ENUM('administrador', 'profesor', 'estudiante'),
      allowNull: false,
      defaultValue: 'estudiante'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revertir cambios (volver al inglés)
    await queryInterface.changeColumn('Users', 'role', {
      type: DataTypes.ENUM('admin', 'teacher', 'student', 'administrador', 'profesor', 'estudiante'),
      allowNull: false,
      defaultValue: 'student'
    });

    await queryInterface.sequelize.query(`
      UPDATE Users SET role = 'admin' WHERE role = 'administrador'
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE Users SET role = 'teacher' WHERE role = 'profesor'
    `);
    
    await queryInterface.sequelize.query(`
      UPDATE Users SET role = 'student' WHERE role = 'estudiante'
    `);

    await queryInterface.changeColumn('Users', 'role', {
      type: DataTypes.ENUM('admin', 'teacher', 'student'),
      allowNull: false,
      defaultValue: 'student'
    });
  }
};
