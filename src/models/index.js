// src/models/index.js
// Centralización de modelos y relaciones

const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/* ============================================================
   USUARIOS
============================================================ */
const User = sequelize.define('User', { 
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  segundo_nombre: { type: DataTypes.STRING(100), allowNull: true },
  apellido1: { type: DataTypes.STRING(100), allowNull: false },
  apellido2: { type: DataTypes.STRING(100), allowNull: true },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  numero_identificacion: { type: DataTypes.STRING(12), allowNull: true, unique: true, validate: { len: [1, 12] } },
  password: { type: DataTypes.STRING(255), allowNull: false },
  rol: { type: DataTypes.ENUM('admin', 'profesor', 'estudiante', 'padre'), allowNull: false, defaultValue: 'estudiante' },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  telefono: { type: DataTypes.STRING(20), allowNull: true, unique: true },
  direccion: { type: DataTypes.TEXT, allowNull: true },
  fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: true },
  foto: { type: DataTypes.STRING(255), allowNull: true }
}, {
  tableName: 'usuarios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});




/* ============================================================
   CURSOS
============================================================ */
const Curso = sequelize.define('Curso', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(50), allowNull: false },
  grado: {
    type: DataTypes.ENUM('prejardin','jardin','preescolar','primero','segundo','tercero','cuarto','quinto'),
    allowNull: false
  },
  grupo: { type: DataTypes.STRING(10), allowNull: false },
  capacidad: { type: DataTypes.INTEGER, defaultValue: 30 },
  'año_lectivo': { type: DataTypes.INTEGER, defaultValue: new Date().getFullYear() },
  profesor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'usuarios', key: 'id' } },
  join_code: { type: DataTypes.STRING(12), unique: true, allowNull: true }
}, {
  tableName: 'cursos',
  timestamps: false
});

/* ============================================================
   MATERIAS
============================================================ */
const Materia = sequelize.define('Materia', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  curso_id: { type: DataTypes.INTEGER, allowNull: true },
  profesor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'usuarios', key: 'id' } }
}, {
  tableName: 'materias',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
/* ============================================================
   INSCRIPCIONES A MATERIAS (N:M)
============================================================ */
const InscripcionMateria = sequelize.define('InscripcionMateria', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  materia_id: { type: DataTypes.INTEGER, allowNull: false },
  estudiante_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'inscripciones_materias',
  timestamps: false
});

/* ============================================================
   MATRÍCULAS (N:M Curso ↔ Usuario)
============================================================ */
const Matricula = sequelize.define('Matricula', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  curso_id: { type: DataTypes.INTEGER, allowNull: false },
  estudiante_id: { type: DataTypes.INTEGER, allowNull: false },
  fecha_matricula: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  estado: { type: DataTypes.ENUM('activo', 'inactivo'), defaultValue: 'activo' }
}, {
  tableName: 'matriculas',
  timestamps: false
});

/* ============================================================
   TAREAS / ESTADO TAREAS / ENTREGAS
============================================================ */
const Tarea = sequelize.define('Tarea', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  fecha_entrega: { type: DataTypes.DATEONLY, allowNull: false },
  prioridad: { type: DataTypes.ENUM('baja', 'media', 'alta'), defaultValue: 'media' },
  curso_id: { type: DataTypes.INTEGER, allowNull: false },
  materia_id: { type: DataTypes.INTEGER, allowNull: true },
  profesor_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'tareas',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const EstadoTarea = sequelize.define('EstadoTarea', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  estado: { type: DataTypes.ENUM('pendiente', 'en_proceso', 'completada', 'vencida'), defaultValue: 'pendiente' },
  fecha_completado: { type: DataTypes.DATE, allowNull: true },
  comentario_estudiante: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'estado_tareas',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const TareaEstudiante = sequelize.define('TareaEstudiante', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tarea_id: { type: DataTypes.INTEGER, allowNull: false },
  estudiante_id: { type: DataTypes.INTEGER, allowNull: false },
  curso_id: { type: DataTypes.INTEGER, allowNull: false },
  materia_id: { type: DataTypes.INTEGER, allowNull: true },
  imagen_ruta: { type: DataTypes.STRING(255), allowNull: true },
  archivo_ruta: { type: DataTypes.STRING(255), allowNull: true },
  comentario: { type: DataTypes.TEXT, allowNull: true },           
  nota: { type: DataTypes.DECIMAL(5,2), allowNull: true },          
  comentario_profesor: { type: DataTypes.TEXT, allowNull: true }    
}, {
  tableName: 'tareas_estudiantes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/* ============================================================
   EVENTOS / AVISOS
============================================================ */
const Evento = sequelize.define('Evento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  curso_id: { type: DataTypes.INTEGER, allowNull: true },
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  hora_inicio: { type: DataTypes.TIME, allowNull: true },
  hora_fin: { type: DataTypes.TIME, allowNull: true },
  tipo: { type: DataTypes.ENUM('examen', 'actividad', 'festivo', 'reunion'), defaultValue: 'actividad' },
  es_general: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'eventos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

const Aviso = sequelize.define('Aviso', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  contenido: { type: DataTypes.TEXT, allowNull: false },
  tipo: { type: DataTypes.ENUM('general', 'curso', 'urgente'), defaultValue: 'general' },
  fecha_expiracion: { type: DataTypes.DATEONLY, allowNull: true }
}, {
  tableName: 'avisos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

/* ============================================================
   ASISTENCIA
============================================================ */
const Asistencia = sequelize.define('Asistencia', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  estudiante_id: { type: DataTypes.INTEGER, allowNull: false },
  curso_id: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  estado: { type: DataTypes.ENUM('presente', 'ausente', 'tardanza', 'justificado'), allowNull: false },
  hora_llegada: { type: DataTypes.TIME, allowNull: true },
  observaciones: { type: DataTypes.TEXT, allowNull: true },
  justificacion: { type: DataTypes.TEXT, allowNull: true },
  archivo_justificacion: { type: DataTypes.STRING(255), allowNull: true },
  registrado_por: { type: DataTypes.INTEGER, allowNull: true },
    materia_id: { type: DataTypes.INTEGER, allowNull: true }

}, {
  tableName: 'asistencias',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const PadreEstudiante = sequelize.define('PadreEstudiante', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  padre_id: { type: DataTypes.INTEGER, allowNull: false },
  estudiante_id: { type: DataTypes.INTEGER, allowNull: false },
  parentesco: { type: DataTypes.STRING(50), allowNull: true }
}, { tableName: 'padres_estudiantes', timestamps: false });


PadreEstudiante.belongsTo(User, { as: 'padreUser', foreignKey: 'padre_id' });
PadreEstudiante.belongsTo(User, { as: 'estudianteUser', foreignKey: 'estudiante_id' });


// Relaciones desde User hacia la tabla puente (hasMany / hasOne)
User.hasMany(PadreEstudiante, { as: 'vinculosComoPadre', foreignKey: 'padre_id' });
User.hasMany(PadreEstudiante, { as: 'vinculosComoEstudiante', foreignKey: 'estudiante_id' });

// Relaciones N:M autoref (opcional, si las usas en includes)
User.belongsToMany(User, { as: 'hijos', through: PadreEstudiante, foreignKey: 'padre_id', otherKey: 'estudiante_id' });
User.belongsToMany(User, { as: 'padres', through: PadreEstudiante, foreignKey: 'estudiante_id', otherKey: 'padre_id' });


const AsistenciaArchivo = sequelize.define('AsistenciaArchivo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ruta: { type: DataTypes.STRING(255), allowNull: false },
  fecha_subida: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'asistencias_archivos',
  timestamps: false
});

/* ============================================================
   CONFIG ASISTENCIA
============================================================ */
const ConfigAsistencia = sequelize.define('ConfigAsistencia', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  curso_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  limite_faltas_notificacion: { type: DataTypes.INTEGER, defaultValue: 3 },
  limite_faltas_alerta: { type: DataTypes.INTEGER, defaultValue: 5 },
  porcentaje_minimo_asistencia: { type: DataTypes.DECIMAL(5, 2), defaultValue: 75.00 },
  notificar_padres: { type: DataTypes.BOOLEAN, defaultValue: true },
  notificar_cada_falta: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'config_asistencia',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/* ============================================================
   REPORTES
============================================================ */
const ReporteEstudiante = sequelize.define('ReporteEstudiante', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  estudiante_id: { type: DataTypes.INTEGER, allowNull: false },
  curso_id: { type: DataTypes.INTEGER, allowNull: false },
  materia_id: { type: DataTypes.INTEGER, allowNull: false },
  estado_rendimiento: { type: DataTypes.ENUM('regular', 'bueno', 'malo'), allowNull: false, defaultValue: 'regular' },
  comentario: { type: DataTypes.TEXT, allowNull: true },
  nota: { type: DataTypes.DECIMAL(5, 2), allowNull: true }
}, {
  tableName: 'reporte_estudiante',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ name: 'reporte_estudiante_uq_est_materia_curso', unique: true, fields: ['estudiante_id', 'materia_id', 'curso_id'] }]
});

const ReporteCurso = sequelize.define('ReporteCurso', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  curso_id: { type: DataTypes.INTEGER, allowNull: false },
  materia_id: { type: DataTypes.INTEGER, allowNull: true },
  nombre_curso: { type: DataTypes.STRING(100), allowNull: false },
  comentario: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'reporte_curso',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/* ============================================================
   EXCUSAS
============================================================ */
const Excusa = sequelize.define('Excusa', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  estudiante_id: { type: DataTypes.INTEGER, allowNull: false },
  curso_id: { type: DataTypes.INTEGER, allowNull: false },
  materia_id: { type: DataTypes.INTEGER, allowNull: true },
  fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
  fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
  motivo: { type: DataTypes.TEXT, allowNull: false },
  archivo_justificacion: { type: DataTypes.STRING(255), allowNull: true },
  estado: { type: DataTypes.ENUM('pendiente','aprobada','rechazada'), allowNull: false, defaultValue: 'pendiente' },
  observaciones: { type: DataTypes.TEXT, allowNull: true },
  creado_por: { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'excusas', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });


/* ============================================================
   NOTIFICACIONES
============================================================ */
const Notificacion = sequelize.define('Notificacion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.STRING(40), allowNull: false },
  titulo: { type: DataTypes.STRING(200), allowNull: true },
  mensaje: { type: DataTypes.TEXT, allowNull: true },
  leido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  enviado_por: { type: DataTypes.INTEGER, allowNull: true },
  estudiante_id: { type: DataTypes.INTEGER, allowNull: true },
  fecha_citacion: { type: DataTypes.DATEONLY, allowNull: true },
  hora_citacion: { type: DataTypes.TIME, allowNull: true },
  location: { type: DataTypes.STRING(150), allowNull: true }
}, {
  tableName: 'notificaciones',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/* ============================================================
   HORARIO (clases / bloques del profesor)
============================================================ */
const Horario = sequelize.define('Horario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  profesor_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  curso_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'cursos', key: 'id' } },
  materia_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'materias', key: 'id' } },
  dia: { type: DataTypes.STRING(20), allowNull: false }, 
  hora_inicio: { type: DataTypes.STRING(10), allowNull: false }, 
  hora_fin: { type: DataTypes.STRING(10), allowNull: false },    
  aula: { type: DataTypes.STRING(50), allowNull: true },
  sala: { type: DataTypes.STRING(50), allowNull: true }
}, {
  tableName: 'horarios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});



/* ============================================================
   RELACIONES
============================================================ */
Asistencia.belongsTo(User, { as: 'estudiante', foreignKey: 'estudiante_id' });
Asistencia.belongsTo(Curso, { as: 'curso', foreignKey: 'curso_id' });
Asistencia.belongsTo(Materia, { as: 'materia', foreignKey: 'materia_id' });
Asistencia.belongsTo(User, { as: 'registrador', foreignKey: 'registrado_por' });

PadreEstudiante.belongsTo(User, { as: 'padre', foreignKey: 'padre_id' });
PadreEstudiante.belongsTo(User, { as: 'estudiante', foreignKey: 'estudiante_id' });
User.hasMany(PadreEstudiante, { as: 'hijosRel', foreignKey: 'padre_id' });
User.hasOne(PadreEstudiante, { as: 'padreRel', foreignKey: 'estudiante_id' });

Materia.belongsTo(Curso, { as: 'curso', foreignKey: 'curso_id' });
Curso.hasMany(Materia, { as: 'materias', foreignKey: 'curso_id' });


Excusa.belongsTo(User, { as: 'estudiante', foreignKey: 'estudiante_id' });
Excusa.belongsTo(User, { as: 'solicitante', foreignKey: 'creado_por' });
Excusa.belongsTo(Curso, { as: 'curso', foreignKey: 'curso_id' });
Excusa.belongsTo(Materia, { as: 'materia', foreignKey: 'materia_id' });


// Asociaciones (añadir al bloque de relaciones, con guardas)
if (!Horario.associations || !Horario.associations.profesor) {
  Horario.belongsTo(User, { as: 'profesor', foreignKey: 'profesor_id' });
}
if (!Horario.associations || !Horario.associations.curso) {
  Horario.belongsTo(Curso, { as: 'curso', foreignKey: 'curso_id' });
}
if (!Horario.associations || !Horario.associations.materia) {
  Horario.belongsTo(Materia, { as: 'materia', foreignKey: 'materia_id' });
}


if (!User.associations || !User.associations.cursosDictados) {
  // Curso ↔ Profesor
  Curso.belongsTo(User, { foreignKey: 'profesor_id', as: 'profesor' });
  User.hasMany(Curso, { foreignKey: 'profesor_id', as: 'cursosDictados' });
}

// Curso ↔ Estudiantes (matrícula) - N:M a través de Matricula
if (!Curso.associations || !Curso.associations.estudiantes) {
  Curso.belongsToMany(User, { through: Matricula, as: 'estudiantes', foreignKey: 'curso_id', otherKey: 'estudiante_id' });
}
if (!User.associations || !User.associations.cursos) {
  User.belongsToMany(Curso, { through: Matricula, as: 'cursos', foreignKey: 'estudiante_id', otherKey: 'curso_id' });
}
if (!Matricula.associations || !Matricula.associations.estudiante) {
  Matricula.belongsTo(User, { as: 'estudiante', foreignKey: 'estudiante_id' });
}
if (!Matricula.associations || !Matricula.associations.curso) {
  Matricula.belongsTo(Curso, { as: 'curso', foreignKey: 'curso_id' });
}

// Materia ↔ Curso
if (!Curso.associations || !Curso.associations.materias) {
  Curso.hasMany(Materia, { foreignKey: 'curso_id', as: 'materias' });
}
if (!Materia.associations || !Materia.associations.curso) {
  Materia.belongsTo(Curso, { foreignKey: 'curso_id', as: 'curso' });
}

// Materia ↔ Profesor
if (!Materia.associations || !Materia.associations.profesor) {
  Materia.belongsTo(User, { as: 'profesor', foreignKey: 'profesor_id' });
}

// Materia ↔ Estudiantes (inscripciones a materias)
if (!Materia.associations || !Materia.associations.estudiantes) {
  Materia.belongsToMany(User, { through: InscripcionMateria, as: 'estudiantes', foreignKey: 'materia_id', otherKey: 'estudiante_id' });
}
if (!User.associations || !User.associations.materias) {
  User.belongsToMany(Materia, { through: InscripcionMateria, as: 'materias', foreignKey: 'estudiante_id', otherKey: 'materia_id' });
}

// Tareas ↔ Curso/Materia
if (!Curso.associations || !Curso.associations.tareasCurso) {
  Curso.hasMany(Tarea, { foreignKey: 'curso_id', as: 'tareasCurso' });
}
if (!Tarea.associations || !Tarea.associations.curso) {
  Tarea.belongsTo(Curso, { foreignKey: 'curso_id', as: 'curso' });
}
if (!Materia.associations || !Materia.associations.tareasMateria) {
  Materia.hasMany(Tarea, { foreignKey: 'materia_id', as: 'tareasMateria' });
}
if (!Tarea.associations || !Tarea.associations.materia) {
  Tarea.belongsTo(Materia, { foreignKey: 'materia_id', as: 'materia' });
}

// Entregas de tareas
if (!Tarea.associations || !Tarea.associations.entregas) {
  Tarea.hasMany(TareaEstudiante, { foreignKey: 'tarea_id', as: 'entregas' });
}
if (!TareaEstudiante.associations || !TareaEstudiante.associations.tarea) {
  TareaEstudiante.belongsTo(Tarea, { foreignKey: 'tarea_id', as: 'tarea' });
}
if (!User.associations || !User.associations.entregasTarea) {
  User.hasMany(TareaEstudiante, { foreignKey: 'estudiante_id', as: 'entregasTarea' });
}
if (!TareaEstudiante.associations || !TareaEstudiante.associations.estudiante) {
  TareaEstudiante.belongsTo(User, { foreignKey: 'estudiante_id', as: 'estudiante' });
}
if (!Curso.associations || !Curso.associations.entregasCurso) {
  Curso.hasMany(TareaEstudiante, { foreignKey: 'curso_id', as: 'entregasCurso' });
}
if (!TareaEstudiante.associations || !TareaEstudiante.associations.curso) {
  TareaEstudiante.belongsTo(Curso, { foreignKey: 'curso_id', as: 'curso' });
}
if (!Materia.associations || !Materia.associations.entregasMateria) {
  Materia.hasMany(TareaEstudiante, { foreignKey: 'materia_id', as: 'entregasMateria' });
}
if (!TareaEstudiante.associations || !TareaEstudiante.associations.materia) {
  TareaEstudiante.belongsTo(Materia, { foreignKey: 'materia_id', as: 'materia' });
}

// Asistencia
if (!User.associations || !User.associations.asistencias) {
  User.hasMany(Asistencia, { foreignKey: 'estudiante_id', as: 'asistencias' });
}
if (!Asistencia.associations || !Asistencia.associations.estudiante) {
  Asistencia.belongsTo(User, { foreignKey: 'estudiante_id', as: 'estudiante' });
}
if (!Curso.associations || !Curso.associations.asistencias) {
  Curso.hasMany(Asistencia, { foreignKey: 'curso_id', as: 'asistencias' });
}
if (!Asistencia.associations || !Asistencia.associations.curso) {
  Asistencia.belongsTo(Curso, { foreignKey: 'curso_id', as: 'curso' });
}
if (!Asistencia.associations || !Asistencia.associations.registrador) {
  Asistencia.belongsTo(User, { foreignKey: 'registrado_por', as: 'registrador' });
}

// Padre ↔ Estudiante (User <-> User)
if (!User.associations || !User.associations.hijos) {
  User.belongsToMany(User, { through: PadreEstudiante, as: 'hijos', foreignKey: 'padre_id', otherKey: 'estudiante_id' });
}
if (!User.associations || !User.associations.padres) {
  User.belongsToMany(User, { through: PadreEstudiante, as: 'padres', foreignKey: 'estudiante_id', otherKey: 'padre_id' });
}

// ConfigAsistencia ↔ Curso
if (!Curso.associations || !Curso.associations.configuracionAsistencia) {
  Curso.hasOne(ConfigAsistencia, { foreignKey: 'curso_id', as: 'configuracionAsistencia' });
}
if (!ConfigAsistencia.associations || !ConfigAsistencia.associations.curso) {
  ConfigAsistencia.belongsTo(Curso, { foreignKey: 'curso_id', as: 'curso' });
}

// Reportes
if (!ReporteEstudiante.associations || !ReporteEstudiante.associations.estudiante) {
  ReporteEstudiante.belongsTo(User, { foreignKey: 'estudiante_id', as: 'estudiante' });
}
if (!ReporteEstudiante.associations || !ReporteEstudiante.associations.curso) {
  ReporteEstudiante.belongsTo(Curso, { foreignKey: 'curso_id', as: 'curso' });
}
if (!ReporteEstudiante.associations || !ReporteEstudiante.associations.materia) {
  ReporteEstudiante.belongsTo(Materia, { foreignKey: 'materia_id', as: 'materia' });
}
if (!User.associations || !User.associations.reportes) {
  User.hasMany(ReporteEstudiante, { foreignKey: 'estudiante_id', as: 'reportes' });
}
if (!Curso.associations || !Curso.associations.reportes) {
  Curso.hasMany(ReporteEstudiante, { foreignKey: 'curso_id', as: 'reportes' });
}
if (!Materia.associations || !Materia.associations.reportes) {
  Materia.hasMany(ReporteEstudiante, { foreignKey: 'materia_id', as: 'reportes' });
}

if (!ReporteCurso.associations || !ReporteCurso.associations.curso) {
  ReporteCurso.belongsTo(Curso, { foreignKey: 'curso_id', as: 'curso' });
}
if (!Curso.associations || !Curso.associations.reportsCurso) {
  Curso.hasMany(ReporteCurso, { foreignKey: 'curso_id', as: 'reportesCurso' });
}
if (!ReporteCurso.associations || !ReporteCurso.associations.materia) {
  ReporteCurso.belongsTo(Materia, { foreignKey: 'materia_id', as: 'materia' });
}
if (!Materia.associations || !Materia.associations.reportsCurso) {
  Materia.hasMany(ReporteCurso, { foreignKey: 'materia_id', as: 'reportesCurso' });
}

// Notificaciones
if (!Notificacion.associations || !Notificacion.associations.usuario) {
  Notificacion.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });
}
if (!User.associations || !User.associations.notificaciones) {
  User.hasMany(Notificacion, { foreignKey: 'usuario_id', as: 'notificaciones' });
}

Notificacion.belongsTo(User, { as: 'remitente', foreignKey: 'enviado_por' });
Notificacion.belongsTo(User, { as: 'destinatario', foreignKey: 'usuario_id' });

Evento.belongsTo(Curso, { as: 'curso', foreignKey: 'curso_id' });

// Evitar redefinir asociaciones duplicadas: comprobación final (opcional)
Object.freeze(User.associations);
Object.freeze(Curso.associations);
Object.freeze(Materia.associations);
Object.freeze(Matricula.associations);
Object.freeze(Tarea.associations);
Object.freeze(TareaEstudiante.associations);

/* ============================================================
   EXPORTS
============================================================ */
module.exports = {
  sequelize,
  User,
  Curso,
  Materia,
  InscripcionMateria,
  Matricula,
  Tarea,
  EstadoTarea,
  TareaEstudiante,
  Evento,
  Aviso,
  Asistencia,
  AsistenciaArchivo,
  ConfigAsistencia,
  ReporteEstudiante,
  ReporteCurso,
  Excusa,
  PadreEstudiante,
  Notificacion,
  Horario
};