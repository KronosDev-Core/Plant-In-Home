let cors = require("cors"),
    helmet = require("helmet"),
    cookieParser = require("cookie-parser"),
    parser = require("body-parser"),
    morgan = require("morgan"),
    express = require("express"),
    app = express(),
    session = require("express-session"),
    path = require("path"),
    fs = require("fs"),
    https = require("https"),
    http = require('http'),
    open = require('open');
require('dotenv').config();

var privateKey = fs.readFileSync(`${process.env.HOST_LISTEN}-key.pem`, "utf8"),
    certificate = fs.readFileSync(`${process.env.HOST_LISTEN}.pem`, "utf8"),
    credentials = { key: privateKey, cert: certificate };


// Configuration Express Server

app.set('trust proxy', 1);
app.use(session({
    secret: 'KronosDevPro',
    name: 'SessionID',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, maxAge: 60000 }
}));
app.use(morgan('combined'));
app.use(cookieParser());
app.use(cors());
app.use(helmet());
app.disable('x-powered-by');
app.use(express.json());
app.use(parser.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'node_modules')));


app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('https://192.168.137.1/', (_req, _res) => {
    res.sendFile(path.join(__dirname + '/index.html'))
})

app.post('/data', (_req, _res) => {

    const options = {
        hostname: '192.168.137.200',
        port: 80,
        path: '/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
            _res.send(chunk);
        });
        res.on('end', () => {
            console.log('No more data in response.');
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });
    req.end();
});

app.post('/file', (_req, _res) => {
    _res.send({ data: fs.readFileSync('../NOTE.txt', 'utf8') });
})

app.post('/SetFile', (_req, _res) => {
    console.log(fs.writeFileSync('../NOTE.txt', _req.body.data, 'utf8'));

    _res.send({ status: "Finnish" });
})

var httpsServer = https.createServer(credentials, app);
httpsServer.listen(process.env.PORT_LISTEN, process.env.HOST_LISTEN);
console.info(`[*] Listen on https://${process.env.HOST_LISTEN}/`);

open(`https://${process.env.HOST_LISTEN}/`);