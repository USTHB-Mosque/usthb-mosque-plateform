export type SoundEffect = 'appear' | 'click'

export function playSoundEffect(context: AudioContext, sound: SoundEffect, delay = 0) {
  if (context.state === 'closed') return

  const start = context.currentTime + delay

  if (sound === 'appear') {
    const duration = 3.2
    const sr = context.sampleRate

    const noiseFrames = Math.ceil(sr * duration)
    const noiseBuf = context.createBuffer(1, noiseFrames, sr)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < noiseFrames; i++) nd[i] = Math.random() * 2 - 1

    const noiseSource = context.createBufferSource()
    noiseSource.buffer = noiseBuf
    const noiseFilter = context.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.setValueAtTime(600, start)
    noiseFilter.frequency.linearRampToValueAtTime(1800, start + duration * 0.5)
    noiseFilter.frequency.linearRampToValueAtTime(400, start + duration)
    noiseFilter.Q.value = 0.6
    const noiseGain = context.createGain()
    noiseGain.gain.setValueAtTime(0, start)
    noiseGain.gain.linearRampToValueAtTime(0.02, start + 0.6)
    noiseGain.gain.linearRampToValueAtTime(0.014, start + duration * 0.7)
    noiseGain.gain.linearRampToValueAtTime(0, start + duration)
    noiseSource.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(context.destination)
    noiseSource.start(start)
    noiseSource.stop(start + duration)

    const drones: [number, number, number, number][] = [
      [174, 0, 0.4, 0.022],
      [261, -8, 0.7, 0.016],
      [349, 12, 1.0, 0.012],
      [523, -5, 1.4, 0.008],
      [174, 18, 0.2, 0.01],
    ]

    drones.forEach(([freq, detune, attack, vol]) => {
      const osc = context.createOscillator()
      const g = context.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.detune.value = detune
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(vol, start + attack)
      g.gain.linearRampToValueAtTime(vol * 0.8, start + duration * 0.65)
      g.gain.linearRampToValueAtTime(0, start + duration)
      osc.connect(g)
      g.connect(context.destination)
      osc.start(start)
      osc.stop(start + duration + 0.05)
    })

    const shimmer = context.createOscillator()
    const shimmerG = context.createGain()
    shimmer.type = 'sine'
    shimmer.frequency.setValueAtTime(1046, start)
    shimmer.frequency.linearRampToValueAtTime(1320, start + 1.2)
    shimmerG.gain.setValueAtTime(0, start)
    shimmerG.gain.linearRampToValueAtTime(0.006, start + 0.5)
    shimmerG.gain.linearRampToValueAtTime(0, start + 2.0)
    shimmer.connect(shimmerG)
    shimmerG.connect(context.destination)
    shimmer.start(start)
    shimmer.stop(start + 2.2)

    return
  }

  if (sound === 'click') {
    const tapFrames = Math.ceil(context.sampleRate * 0.005)
    const tapBuf = context.createBuffer(1, tapFrames, context.sampleRate)
    const td = tapBuf.getChannelData(0)
    for (let i = 0; i < tapFrames; i++) td[i] = Math.random() * 2 - 1
    const tap = context.createBufferSource()
    const tapFilter = context.createBiquadFilter()
    const tapGain = context.createGain()
    tap.buffer = tapBuf
    tapFilter.type = 'highpass'
    tapFilter.frequency.value = 2200
    tapGain.gain.setValueAtTime(0.12, start)
    tapGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.022)
    tap.connect(tapFilter)
    tapFilter.connect(tapGain)
    tapGain.connect(context.destination)
    tap.start(start)

    const chirp = context.createOscillator()
    const chirpGain = context.createGain()
    chirp.type = 'sine'
    chirp.frequency.setValueAtTime(900, start)
    chirp.frequency.exponentialRampToValueAtTime(600, start + 0.06)
    chirpGain.gain.setValueAtTime(0.0001, start)
    chirpGain.gain.linearRampToValueAtTime(0.035, start + 0.004)
    chirpGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.08)
    chirp.connect(chirpGain)
    chirpGain.connect(context.destination)
    chirp.start(start)
    chirp.stop(start + 0.09)
    return
  }
}
