const {app, session, BrowserWindow, BrowserView} = require('electron');

const debugOutput = true;
const Requests = {};
let win, gameView;

const winWidth = 1300, winHeight = 900;
const clientWidth = 1200, clientHeight = 800;

function createWindow() {

    win = new BrowserWindow({width: winWidth, height: winHeight});

    //https://electronjs.org/docs/api/cookies
    function writeCookie(name, value, domain, path){
        const cookie = { url: 'https://dmm.com', name, value, domain, path, expirationDate: parseInt((new Date().getTime()+500000000)/1000)};
        session.defaultSession.cookies.set(cookie, (error) => {
            if (error) console.error(error)
        })
    }
    writeCookie("cklg", "welcome", ".dmm.com", "/");
    writeCookie("cklg", "welcome", ".dmm.com", "/netgame/");
    writeCookie("cklg", "welcome", ".dmm.com", "/netgame_s/");
    writeCookie("cklg", "welcome", ".dmm.com", "/play/");
    writeCookie("ckcy", "1", ".dmm.com", "/");
    writeCookie("ckcy", "1", ".dmm.com", "/netgame/");
    writeCookie("ckcy", "1", ".dmm.com", "/netgame_s/");
    writeCookie("ckcy", "1", ".dmm.com", "/play/");


    // https://electronjs.org/docs/api/browser-view
    gameView = new BrowserView({
        webPreferences:{
            nodeIntegration: false
        }
    });

    win.setBrowserView(gameView);

    //nice resize
    gameView.setBounds({x: (parseInt(winWidth - clientWidth) / 2), y: 0, width: clientWidth, height: clientHeight});
    win.on('resize', () => {
        const winBounds = win.getBounds();
        const newBounds ={
            x: parseInt((winBounds.width - clientWidth) / 2),
            y: 0,
            width: clientWidth,
            height: clientHeight
        };
        //apparently somehow you can get "-0" here and it cause errors
        if(newBounds.x<1) newBounds.x=0;
        gameView.setBounds(newBounds);
    });

    //attaching debugger
    try {
        gameView.webContents.debugger.attach('1.1')
    } catch (err) {
        console.log('Debugger attach failed : ', err)
    }

    gameView.webContents.debugger.on('message', (event, method, params) => {
        // check this page https://chromedevtools.github.io/devtools-protocol/tot/Network
        if (method === 'Network.requestWillBeSent') {
            Requests[params.requestId] = {
                method: params.request.method.toLowerCase(),
                url: params.request.url
            };
            if (Requests[params.requestId].method === "post") {
                //reading and saving post data here. too lazy to do now
            }
            if (debugOutput) console.log(`::requestWillBeSent::${params.requestId}\t${JSON.stringify(Requests[params.requestId])}`);
        } else if (method === 'Network.loadingFinished') {
            if (typeof Requests[params.requestId] === "undefined") return;
            gameView.webContents.debugger.sendCommand('Network.getResponseBody', {requestId: params.requestId}, (err, result) => {
                if(debugOutput){
                   if(typeof result.body!=="undefined"){
                       console.log(`::loadingFinished:getResponseBody:${params.requestId}\t ${JSON.stringify(result.body.substr(0, 20))}...`);
                   } else{
                       console.log(`::loadingFinished:getResponseBody:${params.requestId}\t ...`);
                   }
                }
                delete Requests[params.requestId];
            });
        } else {
            //console.log(`method::${method}`);
        }
    });
    gameView.webContents.debugger.sendCommand('Network.enable');
    //gameView.webContents.loadURL('https://www.dmm.com/netgame/social/-/gadgets/=/app_id=854854/');
    gameView.webContents.loadURL('https://google.com');
    gameView.webContents.openDevTools({ mode: 'detach' });
    win.setBackgroundColor("#ccc");


    // now this is stupid....
    win.on('closed', () => {
        win = null;
        app.exit();
    });
}

app.on('ready', createWindow);
