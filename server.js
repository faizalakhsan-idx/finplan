// server.js - Local Node.js server test
const http = require('http');
const fs = require('fs');
const path = require('path');
const apiHandler = require('./api/index');

const PORT = 3000;

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Route API
    if (url.pathname.startsWith('/api')) {
        req.query = Object.fromEntries(url.searchParams.entries());
        
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            req.body = body ? JSON.parse(body) : {};
            res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
            };
            res.status = (code) => {
                res.statusCode = code;
                return res;
            };
            apiHandler(req, res);
        });
        return;
    }

    // Static files
    let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
    if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const map = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css'
        };
        res.setHeader('Content-Type', map[ext] || 'text/plain');
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.statusCode = 404;
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Test server running at http://localhost:${PORT}`);
});
