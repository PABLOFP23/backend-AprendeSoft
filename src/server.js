const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();
const { sequelize } = require('./models');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS desarrollo: refleja cualquier origin y permite credenciales
app.use(cors({
  origin: (origin, cb) => cb(null, origin || true),
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// Preflight asegurado (por si algún proxy)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    return res.sendStatus(204);
  }
  next();
});

app.get('/', (_req, res) => res.json({ message: 'API online' }));

app.use('/api', require('./routes'));
app.use('/api/reportes', require('./routes/reportesRoutes'));
app.use('/api/tareas', require('./routes/tareasRoutes'));
app.use('/api/horario', require('./routes/horario'));
app.use('/api/materias', require('./routes/materias'));


app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada', path: req.path }));

app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message });
});

const PORT = process.env.PORT || 4001;
sequelize.authenticate()
  .then(() => {
    console.log('DB OK');
    app.listen(PORT, () => console.log(`Servidor http://localhost:${PORT}`));
  })
  .catch(e => {
    console.error('DB error', e);
    process.exit(1);
  });