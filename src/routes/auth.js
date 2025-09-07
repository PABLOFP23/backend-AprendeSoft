const express = require('express');
const router = express.Router(); //servidor de express donde define rutas especificas
const { register, login } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

//registro de usuario
router.post('/register', register);

//login
router.post('/login', login);

//ver pefil del usuario creado ver rol asingado
router.get('/me', authMiddleware, async (req, res) => {

    try {
        const user = await user.findByPk(req.user.id, { //esta pasando la ruta y el rol que tiene el usuario login
            attributes: ['id', 'username', 'role']
        });
    } catch (err) {
         res.status(500).json({ error: err.message });
    }
});

module.exports = router;

