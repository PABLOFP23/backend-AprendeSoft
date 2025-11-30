'use strict';
const { DataTypes } = require('sequelize');


module.exports = {
  up: async (queryInterface) => {
    // Tabla usuarios (versión inicial con 'apellido' para que luego migre a apellido1/2)
    await queryInterface.createTable('usuarios', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      apellido: { type: DataTypes.STRING(100), allowNull: true }, // será migrada a apellido1/2
      email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
      username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      password: { type: DataTypes.STRING(255), allowNull: false },
      rol: { type: DataTypes.ENUM('admin', 'profesor', 'estudiante', 'padre'), allowNull: false, defaultValue: 'estudiante' },
      activo: { type: DataTypes.BOOLEAN, defaultValue: true },
      telefono: { type: DataTypes.STRING(20), allowNull: true },
      direccion: { type: DataTypes.TEXT, allowNull: true },
      fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    // Tabla cursos (versión inicial con grado INT y seccion, que luego migras a ENUM/grupo y eliminas seccion)
    await queryInterface.createTable('cursos', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(50), allowNull: false },
      grado: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }, // luego migration lo cambia a ENUM
      seccion: { type: DataTypes.STRING(10), allowNull: true },              // luego se copia a grupo y se elimina
      capacidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
      'año_lectivo': { type: DataTypes.INTEGER, allowNull: false, defaultValue: new Date().getFullYear() },
      profesor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('cursos');
    await queryInterface.dropTable('usuarios');
  }
};