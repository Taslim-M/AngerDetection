const model = tf.loadLayersModel('http://localhost:3456/essentia_v1/model.json');
model.then(() => {
    console.log("Model loaded!");
})

//!!! DEVICE_ID HARDCODED
let DEVICE_ID = 422;

//!!! HYPER PARAMS TO MATCH WITH LIBROSA
let SPECTROGRAM_WIDTH = 151;
let hopSize = 480;
let melNumBands = 128;

//!!! FINAL 2D ARRAY TO CONVERT TO TF TENSOR
// Can safely access final array in stopMicRecordStream() function
let spectrogram = [];



// global var to load essentia.js core instance
let essentiaExtractor;
let isEssentiaInstance = false;
// global var for web audio API AudioContext
let audioCtx;
// buffer size microphone stream (bufferSize is high in order to make PitchYinProbabilistic algo to work)
let bufferSize = 2048;




try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
} catch (e) {
    throw "Could not instantiate AudioContext: " + e.message;
}

// global var getUserMedia mic stream
let gumStream;

// settings for plotting
let plotContainerId = "plotDiv";
let plotSpectrogram;

function getEmotionFromTensor(predicted_tensor) {
    let pred = predicted_tensor.argMax();
    if (pred == 1) {
        return "ANG";
    }
    else {
        return "OTH";
    }
}


// record native microphone input and do further audio processing on each audio buffer using the given callback functions
function startMicRecordStream(
    audioCtx,
    bufferSize,
    onProcessCallback,
    btnCallback
) {
    // cross-browser support for getUserMedia
    navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;
    window.URL =
        window.URL || window.webkitURL || window.mozURL || window.msURL;

    if (navigator.getUserMedia) {
        console.log("Initializing audio...");
        navigator.getUserMedia(
            { audio: true, video: false },
            function (stream) {
                gumStream = stream;
                if (gumStream.active) {
                    console.log(
                        "Audio context sample rate = " + audioCtx.sampleRate
                    );
                    var mic = audioCtx.createMediaStreamSource(stream);

                    // In most platforms where the sample rate is 44.1 kHz or 48 kHz,
                    // and the default bufferSize will be 4096, giving 10-12 updates/sec.
                    if (audioCtx.state == "suspended") {
                        audioCtx.resume();
                    }
                    const scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
                    // onprocess callback (here we can use essentia.js algos)
                    scriptNode.onaudioprocess = onProcessCallback;
                    // It seems necessary to connect the stream to a sink for the pipeline to work, contrary to documentataions.
                    // As a workaround, here we create a gain node with zero gain, and connect temp to the system audio output.
                    const gain = audioCtx.createGain();
                    gain.gain.setValueAtTime(0, audioCtx.currentTime);
                    mic.connect(scriptNode);
                    scriptNode.connect(gain);
                    gain.connect(audioCtx.destination);

                    if (btnCallback) {
                        btnCallback();
                    }
                } else {
                    throw "Mic stream not active";
                }
            },
            function (message) {
                throw "Could not access microphone - " + message;
            }
        );
    } else {
        throw "Could not access microphone - getUserMedia not available";
    }
}

function cutOffSpecAndOutput() {
    console.log("Stopped recording ...");
    //make a deep copy
    // NOW PERFORM INFERENCE
    let spec_tens = tf.tensor(spectrogram);
    model.then((x) => {
        spec_tens = spec_tens.reshape([1, 128, 151, 1]);
        let prediction = x.predict(spec_tens);
        console.log("Predicted array...");
        prediction.print();
        console.log("Predicted emotion...");
        var emotionPredicted = getEmotionFromTensor(prediction);
        console.log(emotionPredicted);
        //reset spectrogram
        spectrogram = [];

        var mqttEmotion = "Anger";

        if (emotionPredicted != "OTH"){
            var mqttObject = {
                device_id: DEVICE_ID,
                incident_time: Date.now(),
                incident_type: mqttEmotion
            };
    
            message = new Paho.MQTT.Message(JSON.stringify(mqttObject));
            message.destinationName = "incidents/"+DEVICE_ID;
            client.send(message);
        }
    });


}

// ScriptNodeProcessor callback function to extract pitchyin feature using essentia.js and plotting it on the front-end
function onRecordEssentiaFeatureExtractor(event) {
    if (spectrogram.length < SPECTROGRAM_WIDTH) {
        let audioBuffer = event.inputBuffer.getChannelData(0);

        // modifying default extractor settings
        essentiaExtractor.frameSize = bufferSize;
        essentiaExtractor.hopSize = hopSize;
        // settings specific to an algorithm
        essentiaExtractor.profile.MelBands.numberBands = melNumBands;
        // compute hpcp for overlapping frames of audio
        let spectrum = essentiaExtractor.melSpectrumExtractor(audioBuffer, audioCtx.sampleRate);
        spectrogram.push(spectrum);

        if (spectrogram.length % 50 == 0){
            console.log("Reached: "+spectrogram.length);
        }
    }
    else if (spectrogram.length >= SPECTROGRAM_WIDTH) {
        console.log(spectrogram.length);
        cutOffSpecAndOutput();
    }

    //   plotChroma.isPlotting = true;
}

$(document).ready(function () {
    // add event listeners to ui objects
    $("#recordButton").click(function () {
        let recording = $(this).hasClass("recording");
        if (!recording) {
            $(this).prop("disabled", true);
            // loads the WASM backend and runs the feature extraction
            EssentiaWASM().then(function (essentiaWASM) {
                if (!isEssentiaInstance) {
                    essentiaExtractor = new EssentiaExtractor(essentiaWASM);
                    isEssentiaInstance = true;
                }
                // start microphone stream using getUserMedia
                startMicRecordStream(
                    audioCtx,
                    bufferSize,
                    onRecordEssentiaFeatureExtractor, // essentia.js feature extractor callback function
                    function () {
                        // called when the promise fulfilled
                        $("#recordButton").prop("disabled", true);
                    }
                );
            });

        } else {
            cutOffSpecAndOutput();
        }
    }); // end recordButton onClick
});

//MQTT

var wsbroker = "192.168.0.100"; //mqtt websocket enabled broker
var wsport = 9001 // port for above

// create client using the Paho library
var client = new Paho.MQTT.Client(wsbroker, wsport,
    "myclientid_" + parseInt(Math.random() * 100, 10));

client.onConnectionLost = function (responseObject) {
    console.log("connection lost: " + responseObject.errorMessage);
};

var options = {
    timeout: 3,
    onSuccess: function () {
        console.log("mqtt connected");
    },
    onFailure: function (message) {
        console.log("Connection failed: " + message.errorMessage);
    }
};

function init() {
    client.connect(options);
}