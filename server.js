const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

// Conexión a Base de Datos
const db = new sqlite3.Database('./inventario.db', (err) => {
    if (err) console.error("Error BD:", err.message);
    else console.log('✅ Base de Datos Conectada');
});

// INICIALIZACIÓN
db.serialize(() => {
    // 1. Tabla EQUIPOS 
    db.run(`CREATE TABLE IF NOT EXISTS equipos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estado TEXT DEFAULT 'operativo',
        piso TEXT, area TEXT,
        usuario_nombre TEXT, usuario_apellido TEXT, usuario_user TEXT,
        equipo_nombre_pc TEXT, equipo_marca TEXT, equipo_modelo TEXT, equipo_serie TEXT, equipo_c_barras TEXT,
        ip TEXT, procesador_nombre TEXT, ram_total TEXT, disco_capacidad TEXT, 
        tarjeta_video TEXT,  -- NUEVO CAMPO
        monitor_marca TEXT, monitor_modelo TEXT, monitor_serie TEXT, monitor_c_barras TEXT,
        teclado_marca TEXT, teclado_modelo TEXT, teclado_serie TEXT, teclado_c_barras TEXT,
        mouse_marca TEXT, mouse_modelo TEXT, mouse_serie TEXT, mouse_c_barras TEXT,
        comentarios TEXT
    )`);

    // 2. Tabla USUARIOS
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        rol TEXT
    )`);

    // 3. REINICIO DE USUARIOS
    db.run("DELETE FROM usuarios", () => {
        const stmt = db.prepare("INSERT INTO usuarios (username, password, rol) VALUES (?,?,?)");
        stmt.run('admin', 'usmp2025', 'admin');
        stmt.run('invitado', 'usmp123', 'viewer'); 
        stmt.finalize();
        console.log("👥 Usuarios Admin e Invitado refrescados correctamente.");
    });
});

// --- RUTAS ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM usuarios WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: "Error interno" });
        if (row) {
            res.json({ success: true, username: row.username, rol: row.rol });
        } else {
            res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }
    });
});

app.get('/api/equipos', (req, res) => {
    let sql = "SELECT * FROM equipos";
    let params = [];
    if (req.query.piso) {
        sql += " WHERE piso = ?";
        params.push(req.query.piso);
    }
    db.all(sql, params, (err, rows) => res.json({ data: rows }));
});

// BÚSQUEDA GLOBAL
app.get('/api/buscar', (req, res) => {
    const term = `%${req.query.q}%`;
    const sql = `SELECT * FROM equipos WHERE 
                 /* 1. CODIGOS */
                 equipo_c_barras LIKE ? OR monitor_c_barras LIKE ? OR teclado_c_barras LIKE ? OR mouse_c_barras LIKE ? OR 
                 /* 2. SERIES */
                 equipo_serie LIKE ? OR monitor_serie LIKE ? OR teclado_serie LIKE ? OR mouse_serie LIKE ? OR
                 /* 3. MODELOS */
                 equipo_modelo LIKE ? OR monitor_modelo LIKE ? OR teclado_modelo LIKE ? OR mouse_modelo LIKE ? OR
                 /* 4. MARCAS */
                 equipo_marca LIKE ? OR monitor_marca LIKE ? OR teclado_marca LIKE ? OR mouse_marca LIKE ? OR
                 /* 5. HARDWARE (Inc. Tarjeta Video) */
                 procesador_nombre LIKE ? OR ram_total LIKE ? OR disco_capacidad LIKE ? OR tarjeta_video LIKE ? OR
                 /* 6. USUARIOS Y OTROS */
                 usuario_user LIKE ? OR usuario_nombre LIKE ? OR usuario_apellido LIKE ? OR
                 equipo_nombre_pc LIKE ? OR ip LIKE ? OR area LIKE ? OR comentarios LIKE ?`;
    
    // Total 27 signos de interrogación
    const params = Array(27).fill(term);
    db.all(sql, params, (err, rows) => res.json({ data: rows }));
});

app.post('/api/equipos', (req, res) => {
    const d = req.body;
    const sql = `INSERT INTO equipos (estado, piso, area, usuario_nombre, usuario_apellido, usuario_user, equipo_nombre_pc, equipo_marca, equipo_modelo, equipo_serie, equipo_c_barras, ip, procesador_nombre, ram_total, disco_capacidad, tarjeta_video, monitor_marca, monitor_modelo, monitor_serie, monitor_c_barras, teclado_marca, teclado_modelo, teclado_serie, teclado_c_barras, mouse_marca, mouse_modelo, mouse_serie, mouse_c_barras, comentarios) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [d.estado || 'operativo', d.piso, d.area, d.usuario_nombre, d.usuario_apellido, d.usuario_user, d.equipo_nombre_pc, d.equipo_marca, d.equipo_modelo, d.equipo_serie, d.equipo_c_barras, d.ip, d.procesador_nombre, d.ram_total, d.disco_capacidad, d.tarjeta_video, d.monitor_marca, d.monitor_modelo, d.monitor_serie, d.monitor_c_barras, d.teclado_marca, d.teclado_modelo, d.teclado_serie, d.teclado_c_barras, d.mouse_marca, d.mouse_modelo, d.mouse_serie, d.mouse_c_barras, d.comentarios];
    db.run(sql, params, function(err) {
        if(err) res.status(500).json({error: err.message});
        else res.json({message: "success", id: this.lastID});
    });
});

app.put('/api/equipos/:id', (req, res) => {
    const d = req.body;
    const sql = `UPDATE equipos SET estado=?, piso=?, area=?, usuario_nombre=?, usuario_apellido=?, usuario_user=?, equipo_nombre_pc=?, equipo_marca=?, equipo_modelo=?, equipo_serie=?, equipo_c_barras=?, ip=?, procesador_nombre=?, ram_total=?, disco_capacidad=?, tarjeta_video=?, monitor_marca=?, monitor_modelo=?, monitor_serie=?, monitor_c_barras=?, teclado_marca=?, teclado_modelo=?, teclado_serie=?, teclado_c_barras=?, mouse_marca=?, mouse_modelo=?, mouse_serie=?, mouse_c_barras=?, comentarios=? WHERE id = ?`;
    const params = [d.estado, d.piso, d.area, d.usuario_nombre, d.usuario_apellido, d.usuario_user, d.equipo_nombre_pc, d.equipo_marca, d.equipo_modelo, d.equipo_serie, d.equipo_c_barras, d.ip, d.procesador_nombre, d.ram_total, d.disco_capacidad, d.tarjeta_video, d.monitor_marca, d.monitor_modelo, d.monitor_serie, d.monitor_c_barras, d.teclado_marca, d.teclado_modelo, d.teclado_serie, d.teclado_c_barras, d.mouse_marca, d.mouse_modelo, d.mouse_serie, d.mouse_c_barras, d.comentarios, req.params.id];
    db.run(sql, params, function(err) {
        if(err) res.status(500).json({error: err.message});
        else res.json({message: "updated", changes: this.changes});
    });
});

app.delete('/api/equipos/:id', (req, res) => {
    db.run('DELETE FROM equipos WHERE id = ?', req.params.id, function(err) {
        res.json({ rows: this.changes });
    });
});

app.post('/api/importar', (req, res) => {
    const equipos = req.body;
    if (!Array.isArray(equipos)) return res.status(400).json({ error: "Datos inválidos" });
    const sql = `INSERT INTO equipos (estado, piso, area, usuario_nombre, usuario_apellido, usuario_user, equipo_nombre_pc, equipo_marca, equipo_modelo, equipo_serie, equipo_c_barras, ip, procesador_nombre, ram_total, disco_capacidad, tarjeta_video, monitor_marca, monitor_modelo, monitor_serie, monitor_c_barras, teclado_marca, teclado_modelo, teclado_serie, teclado_c_barras, mouse_marca, mouse_modelo, mouse_serie, mouse_c_barras, comentarios) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare(sql);
        equipos.forEach(eq => {
            stmt.run([eq.estado || 'operativo', eq.piso, eq.area, eq.usuario_nombre, eq.usuario_apellido, eq.usuario_user, eq.equipo_nombre_pc, eq.equipo_marca, eq.equipo_modelo, eq.equipo_serie, eq.equipo_c_barras, eq.ip, eq.procesador_nombre, eq.ram_total, eq.disco_capacidad, eq.tarjeta_video, eq.monitor_marca, eq.monitor_modelo, eq.monitor_serie, eq.monitor_c_barras, eq.teclado_marca, eq.teclado_modelo, eq.teclado_serie, eq.teclado_c_barras, eq.mouse_marca, eq.mouse_modelo, eq.mouse_serie, eq.mouse_c_barras, eq.comentarios || '']);
        });
        stmt.finalize();
        db.run("COMMIT", (err) => {
            if(err) res.status(500).json({error: err.message});
            else res.json({ message: "Importación exitosa" });
        });
    });
});

app.listen(port, () => console.log(`Servidor USMP listo en puerto ${port}`));