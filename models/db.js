const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'npakkret_user', 
    password: '8REaM3nkmmt^t@m2',
    database: 'pkc_nodeweb_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();