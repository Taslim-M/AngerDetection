async function readAudio() {
    const mic = await tf.data.microphone({
        fftSize: 1024,
        columnTruncateLength: 232,
        numFramesPerSpectrogram: 43,
        sampleRateHz: 48000,
        includeSpectrogram: true,
        includeWaveform: true
    });
    const audioData = await mic.capture();
    const spectrogramTensor = audioData.spectrogram;
    spectrogramTensor.print();
    console.log("shape", spectrogramTensor.shape)
    const waveformTensor = audioData.waveform;
    waveformTensor.print();
    console.log("shape", spectrogramTensor.shape)
    mic.stop();
}

readAudio();