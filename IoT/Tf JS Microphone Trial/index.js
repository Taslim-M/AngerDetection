async function readAudio() {
    const mic = await tf.data.microphone({
        fftSize: 1024,
        columnTruncateLength: 1500,
        numFramesPerSpectrogram: 43,
        sampleRateHz: 48000,
        includeSpectrogram: true,
        includeWaveform: true
    });
    var x1 = Date.now();
    
    setTimeout(async () => {
        const audioData = await mic.capture();
        mic.stop();
        console.log(Date.now()-x1);
        const spectrogramTensor = audioData.spectrogram;
        spectrogramTensor.print();
        console.log("shape", spectrogramTensor.shape)
        const waveformTensor = audioData.waveform;
        waveformTensor.print();
        console.log("shape", waveformTensor.shape)
    }, 1500);
}

readAudio();
