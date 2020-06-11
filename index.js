const fs = require('fs');
const path=require('path');
const minimist = require('minimist');
const express = require('express');
const https = require('https');
const socketio = require('socket.io');
const kurento = require('kurento-client');


const key =fs.readFileSync('./key.pem');
const cert = fs.readFileSync('./cert.pem');

const args = minimist(process.argv.slice(2), {
    default: {
        as_uri: 'https://localhost:8443/',
        ws_uri: 'ws://localhost:8888/kurento'
    }
});

const publicDirPath=path.join(__dirname,'./public');

console.log(args)


const app = express();

app.use(express.static(publicDirPath))

const server = https.createServer({key: key, cert: cert }, app);

const io=socketio(server);

// app.get('/', (req, res) => {
//     res.send(); 
// });

let kurentoClient =null;

getKurentoClient(kurentoClient, (error, client)=> {
    if (error!==null){
        return console.log(error)
    }

    kurentoClient = client;
})

io.on('connection', (socket)=> {
    console.log("New web socket");

    let webRtcEndpoint;
    let pipe;
    let queue =[];

    //console.log(socket);
    
    //console.log(kurentoClient)

    kurentoClient.create('MediaPipeline', function(error, pipeline) {
        if (error){
            return console.log(error);
        }

        // console.log(pipeline)
        createMediaElems(pipeline, function(error, webRtc){
            if (error){
                return console.log(error)
            }

            if (queue){
                console.log(queue + '\n' + "queue")
                while (queue.length){
                    let cand = queue.shift();
                    webRtc.addIceCandidate(cand)
                }
            }

            connectMediaElems(webRtc, function(error, webRtcalt){
                if (error){
                    pipeline.release();
                }

                webRtcalt.on('OnIceCandidate', function(event) {
                    let candidate = kurento.getComplexType('IceCandidate')(event.candidate);
                    socket.emit('finalice', candidate)
                })

                webRtcEndpoint=webRtcalt;
                pipe = pipeline;

            })   
            
        });
            
    });

    setTimeout(() => {
        console.log(pipe);
        console.log("------------------------")
        console.log(webRtcEndpoint)
        
    }, 1000);

    socket.on('sdpOffer', (offer) => {
        webRtcEndpoint.processOffer(offer, function(error, answer) {
            if (error){
                pipeline.release()
                console.log(error);
            }

            socket.emit('sdpAnswer', answer)

            webRtcEndpoint.gatherCandidates((error) => {
                if (error){
                    console.log(error)
                }
            })
            
        })
    })

    socket.on('initice', (cand) => {
        let candidate = kurento.getComplexType('IceCandidate')(cand);
        console.log(cand);
        console.log(candidate)

        console.log(queue +'\n' + "queue")

        if (webRtcEndpoint){
            webRtcEndpoint.addIceCandidate(candidate);
        }
        else {
            queue.push(candidate);
        }
        
        // queue.push(candidate)

        // webRtcEndpoint.on('OnIceCandidate', function(event) {
        //     let candidate = kurento.getComplexType('IceCandidate')(event.candidate);
        //     socket.emit('finalice', candidate)
        // })
        // socket.emit('finalice', candidate);
    })

    

})

function getKurentoClient(client, callback){
    if (client!==null) {
        return callback("Already exists", null)
    }

    kurento(args.ws_uri, function (error, tempClient) {
        if (error) {
            return callback("Media server error", null)
        }

        return callback(null, tempClient)
        
    });
}

function createMediaElems(pipeline, callback){
    pipeline.create('WebRtcEndpoint', (error,webRtc) => {
        if (error){
            pipeline.release();
            return callback(error);
        }
        return callback(null, webRtc)
    })    
}

function connectMediaElems(webRtc, callback){
    webRtc.connect(webRtc, function(error){
        if (error){
            return callback(error);
        }
        return callback(null, webRtc)
    });
}

// setTimeout(()=>{
//         console.log('3 sec elapsed')
//         console.log(kurentoClient);
//     }, 3000)

server.listen(8443, () => {
    console.log('listening on 8443'); 
});