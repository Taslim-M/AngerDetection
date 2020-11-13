const model = tf.loadLayersModel('http://localhost:3456/essentia_v1/model.json');
model.then(()=>{
    console.log("Model loaded!");
})

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

function getEmotionFromTensor(predicted_tensor){
    let pred = predicted_tensor.argMax();
    if (pred == 1){
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

function stopMicRecordStream() {
    console.log("Stopped recording ...");
    // stop mic stream
    gumStream.getAudioTracks().forEach(function (track) {
        track.stop();
    });
    $("#recordButton").removeClass("recording");
    $("#recordButton").html(
        'Mic &nbsp;&nbsp;<i class="microphone icon"></i>'
    );
    isPlotting = false;
    audioCtx.suspend();

    // NOW PERFORM INFERENCE
    let spec_tens = tf.tensor(spectrogram);
    model.then((x) => {
        spec_tens = spec_tens.reshape([1, 128, 151, 1]);
        let prediction = x.predict(spec_tens);
        console.log("Predicted array...");
        prediction.print();
        console.log("Predicted emotion...");
        console.log(getEmotionFromTensor(prediction));
    });
    

}

// ScriptNodeProcessor callback function to extract pitchyin feature using essentia.js and plotting it on the front-end
function onRecordEssentiaFeatureExtractor(event) {

    let audioBuffer = event.inputBuffer.getChannelData(0);

    // modifying default extractor settings
    essentiaExtractor.frameSize = bufferSize;
    essentiaExtractor.hopSize = hopSize;
    // settings specific to an algorithm
    essentiaExtractor.profile.MelBands.numberBands = melNumBands;
    // compute hpcp for overlapping frames of audio
    let spectrum = essentiaExtractor.melSpectrumExtractor(audioBuffer, audioCtx.sampleRate);
    let plot_spec = []
    spectrogram.push(spectrum);
    plot_spec.push(spectrum);

    // here we call the plotting function to display realtime feature extraction results
    plotSpectrogram.create(
        plot_spec,
        "Log-scaled MelSpectrogram",
        bufferSize,
        audioCtx.sampleRate,
        hopSize
    );
    if (spectrogram.length >= SPECTROGRAM_WIDTH) {
        stopMicRecordStream();
    }

    //   plotChroma.isPlotting = true;
}

$(document).ready(function () {
    // add event listeners to ui objects
    $("#recordButton").click(function () {
        let recording = $(this).hasClass("recording");
        if (!recording) {
            $(this).prop("disabled", true);

            // create essentia plot instance
            plotSpectrogram = new EssentiaPlot.PlotHeatmap(
                Plotly,
                plotContainerId,
                'spectrogram',
                EssentiaPlot.LayoutSpectrogramPlot // layout settings
            );

            plotSpectrogram.plotLayout.yaxis.range = [0, melNumBands];
            plotSpectrogram.plotLayout.yaxis.autorange = false;

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
                        $("#recordButton").addClass("recording");
                        $("#recordButton").html(
                            'Stop &nbsp;&nbsp;<i class="stop icon"></i>'
                        );
                        $("#recordButton").prop("disabled", false);
                    }
                );
            });

        } else {
            stopMicRecordStream();
        }
    }); // end recordButton onClick
});