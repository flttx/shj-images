interface VoiceProfile {
  root: number;
  formant: number;
  breath: number;
  waveform: OscillatorType;
}

const profiles: Record<string, VoiceProfile> = {
  神祇: { root: 65, formant: 520, breath: 0.055, waveform: "triangle" },
  龙蛇: { root: 48, formant: 780, breath: 0.12, waveform: "sawtooth" },
  翼兽: { root: 180, formant: 1600, breath: 0.085, waveform: "triangle" },
  灵兽: { root: 94, formant: 690, breath: 0.07, waveform: "sawtooth" },
  水族: { root: 76, formant: 360, breath: 0.045, waveform: "sine" },
};

const sampleNames: Record<string, string> = {
  神祇: "deity",
  龙蛇: "dragon",
  翼兽: "winged",
  灵兽: "spirit",
  水族: "aquatic",
};

const beastSamples: Record<string, string> = {
  zhulong: "dragon",
  yinglong: "dragon",
  xiangliu: "serpent",
  bashe: "serpent",
  bifang: "bird",
  gudiao: "bird",
  fuzhu: "deer",
  xingtian: "giant",
  paoxiao: "goat",
  shuhu: "horse",
  bingfeng: "boar",
  xiwangmu: "goddess",
  qiongqi: "winged",
  kaiming: "winged",
  luwu: "winged",
  yayu: "winged",
  "nine-tailed-fox": "spirit",
  heluoyu: "aquatic",
  ranyiyu: "aquatic",
  dijiang: "deity",
};

/** User-initiated local samples with synthesized fallback; never autoplays. */
export class Soundscape {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private drones: OscillatorNode[] = [];
  private sources: AudioScheduledSourceNode[] = [];
  private nodes: AudioNode[] = [];
  private noise: AudioBuffer | null = null;
  private ambience: AudioBufferSourceNode | null = null;
  private ambientGains: GainNode[] = [];
  private samples = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private readonly requests = new AbortController();
  private voices = new Set<() => void>();
  private enabled = false;
  private disposed = false;
  private volume = 0.45;
  private category = "神祇";
  private beastId = "";
  private seed = 0;
  private transition = 0;
  private suspendTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly onVisibility = (): void => {
    if (document.hidden) {
      this.transition += 1;
      this.pauseAudio();
    } else if (this.enabled) {
      void this.enable().catch((error: unknown) => {
        console.warn("声音恢复未完成", error);
      });
    }
  };

  async enable(): Promise<void> {
    if (this.disposed) throw new Error("声音引擎已关闭");
    if (typeof AudioContext === "undefined")
      throw new Error("当前浏览器不支持声音播放");
    this.clearSuspendTimer();
    this.enabled = true;
    const transition = ++this.transition;
    try {
      if (!this.context) this.initialize();
      const context = this.context;
      if (!context) throw new Error("声音初始化未完成");
      await context.resume();
      if (transition !== this.transition || this.disposed) return;
      if (document.hidden) {
        this.pauseAudio();
        return;
      }
      this.fade(this.master?.gain, this.volume, 0.3);
      void this.loadSample("ambience")
        .then((buffer) => {
          if (
            !buffer ||
            !this.enabled ||
            document.hidden ||
            this.disposed ||
            this.ambience ||
            this.context !== context
          )
            return;
          const ambience = context.createBufferSource();
          const gain = context.createGain();
          ambience.buffer = buffer;
          ambience.loop = true;
          gain.gain.value = 0.24;
          ambience.connect(gain).connect(this.bus ?? context.destination);
          ambience.start();
          this.ambience = ambience;
          this.sources.push(ambience);
          this.nodes.push(ambience, gain);
          this.ambientGains.forEach((ambientGain) =>
            this.fade(ambientGain.gain, 0, 0.5),
          );
        })
        .catch((error: unknown) => {
          console.warn("环境声音暂时使用合成声场", error);
        });
      void this.loadSample(this.sampleName);
    } catch (error: unknown) {
      if (transition === this.transition) this.enabled = false;
      throw error instanceof Error ? error : new Error("声音播放暂时不可用");
    }
  }

  disable(): void {
    this.enabled = false;
    this.transition += 1;
    this.pauseAudio();
  }

  private pauseAudio(): void {
    this.clearSuspendTimer();
    this.fade(this.master?.gain, 0, 0.045);
    for (const cleanup of this.voices) cleanup();
    const context = this.context;
    if (!context || context.state === "closed") return;
    this.suspendTimer = setTimeout(() => {
      this.suspendTimer = null;
      if ((!this.enabled || document.hidden) && context.state !== "closed") {
        void context.suspend().catch((error: unknown) => {
          console.warn("声音暂停未完成", error);
        });
      }
    }, 240);
  }

  setVolume(value: number): void {
    if (!Number.isFinite(value)) return;
    this.volume = Math.min(1, Math.max(0, value));
    // An exact zero is scheduled after the short fade, so mute never leaks a residual gain.
    this.fade(
      this.master?.gain,
      this.enabled && !document.hidden ? this.volume : 0,
      0.05,
    );
  }

  setBeast(id: string, category: string): void {
    this.beastId = id;
    this.category = Object.prototype.hasOwnProperty.call(profiles, category)
      ? category
      : "神祇";
    this.seed = [...id].reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    );
    const root = 38 + (this.seed % 11) * 1.8;
    this.drones.forEach((drone, index) =>
      this.fade(drone.frequency, root * (index ? 1.502 : 1), 0.7),
    );
    this.fade(this.windFilter?.frequency, this.profile.formant * 0.6, 0.7);
    if (this.enabled) void this.loadSample(this.sampleName);
  }

  cue(kind: "select" | "roar" | "awaken"): void {
    const context = this.context;
    const bus = this.bus;
    if (
      !context ||
      !bus ||
      !this.enabled ||
      document.hidden ||
      this.volume === 0 ||
      context.state !== "running"
    )
      return;
    if (kind === "roar") {
      const transition = this.transition;
      const beastId = this.beastId;
      void this.loadSample(this.sampleName)
        .then((buffer) => {
          if (
            transition !== this.transition ||
            beastId !== this.beastId ||
            !this.enabled ||
            document.hidden ||
            this.volume === 0 ||
            this.disposed
          )
            return;
          if (buffer) this.playSample(buffer);
          else this.synthesize("roar");
        })
        .catch((error: unknown) => {
          console.warn("异兽声音播放未完成", error);
        });
      return;
    }
    this.synthesize(kind);
  }

  private synthesize(kind: "select" | "roar" | "awaken"): void {
    const context = this.context;
    const bus = this.bus;
    if (
      !context ||
      !bus ||
      !this.enabled ||
      this.volume === 0 ||
      context.state !== "running"
    )
      return;
    if (this.voices.size >= 5) this.voices.values().next().value?.();
    const now = context.currentTime;
    const duration = kind === "select" ? 0.6 : kind === "awaken" ? 3.2 : 2.4;
    const profile = this.profile;
    const root =
      kind === "select" ? 440 : profile.root * (1 + (this.seed % 7) * 0.025);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(
      kind === "select" ? 0.055 : 0.2,
      now + (kind === "select" ? 0.015 : 0.35),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    envelope.connect(bus);
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(
      kind === "select" ? 1500 : profile.formant,
      now,
    );
    filter.frequency.exponentialRampToValueAtTime(
      kind === "select" ? 600 : profile.formant * 0.45,
      now + duration,
    );
    filter.Q.value = 0.8;
    filter.connect(envelope);
    const nodes: AudioNode[] = [envelope, filter];
    const sources: AudioScheduledSourceNode[] = [];
    const count = kind === "select" ? 2 : 3;
    for (let index = 0; index < count; index += 1) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "select" ? "sine" : profile.waveform;
      const frequency =
        root * (kind === "select" ? [1, 1.5][index] : [1, 1.006, 0.5][index]);
      oscillator.frequency.setValueAtTime(
        frequency * (kind === "awaken" ? 0.65 : 1.3),
        now,
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency,
        now + duration * 0.28,
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 0.7,
        now + duration,
      );
      gain.gain.value = index === 0 ? 0.4 : 0.2;
      oscillator.connect(gain).connect(filter);
      oscillator.start(now);
      oscillator.stop(now + duration);
      sources.push(oscillator);
      nodes.push(oscillator, gain);
    }
    if (kind !== "select" && this.noise) {
      const breath = context.createBufferSource();
      const breathGain = context.createGain();
      breath.buffer = this.noise;
      breath.loop = true;
      breathGain.gain.value = profile.breath;
      breath.connect(breathGain).connect(filter);
      breath.start(now);
      breath.stop(now + duration);
      sources.push(breath);
      nodes.push(breath, breathGain);
    }
    let cleaned = false;
    const cleanup = (): void => {
      if (cleaned) return;
      cleaned = true;
      for (const source of sources) {
        source.onended = null;
        source.stop();
      }
      for (const node of nodes) node.disconnect();
      this.voices.delete(cleanup);
    };
    this.voices.add(cleanup);
    sources[0].onended = cleanup;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.enabled = false;
    this.transition += 1;
    this.clearSuspendTimer();
    this.requests.abort();
    if (typeof document !== "undefined")
      document.removeEventListener("visibilitychange", this.onVisibility);
    for (const cleanup of this.voices) cleanup();
    for (const source of this.sources) source.stop();
    for (const node of this.nodes) node.disconnect();
    const context = this.context;
    this.context = null;
    this.master = null;
    this.bus = null;
    this.windFilter = null;
    this.noise = null;
    this.ambience = null;
    this.ambientGains = [];
    this.samples.clear();
    this.loading.clear();
    this.nodes = [];
    this.sources = [];
    this.drones = [];
    if (context && context.state !== "closed") {
      void context.close().catch((error: unknown) => {
        console.warn("声音资源关闭未完成", error);
      });
    }
  }

  private get profile(): VoiceProfile {
    return profiles[this.category];
  }

  private get sampleName(): string {
    return Object.prototype.hasOwnProperty.call(beastSamples, this.beastId)
      ? beastSamples[this.beastId]
      : sampleNames[this.category];
  }

  private async loadSample(name: string): Promise<AudioBuffer | null> {
    const cached = this.samples.get(name);
    if (cached) return cached;
    const pending = this.loading.get(name);
    if (pending) return pending;
    const context = this.context;
    if (!context || this.disposed) return null;
    const request = (async (): Promise<AudioBuffer | null> => {
      try {
        const response = await fetch(`/audio/${name}.mp3`, {
          signal: this.requests.signal,
        });
        if (!response.ok) return null;
        const buffer = await context.decodeAudioData(
          await response.arrayBuffer(),
        );
        if (this.disposed) return null;
        this.samples.set(name, buffer);
        return buffer;
      } catch (error: unknown) {
        if (!this.requests.signal.aborted)
          console.warn("采样不可用，使用合成声音", error);
        return null;
      } finally {
        this.loading.delete(name);
      }
    })();
    this.loading.set(name, request);
    return request;
  }

  private playSample(buffer: AudioBuffer): void {
    const context = this.context;
    const bus = this.bus;
    if (!context || !bus || !this.enabled || context.state !== "running")
      return;
    if (this.voices.size >= 5) this.voices.values().next().value?.();
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    const massive = ["dragon", "serpent", "giant", "deity"].includes(
      this.sampleName,
    );
    source.playbackRate.value = massive ? 0.8 : 1;
    const duration = buffer.duration / source.playbackRate.value;
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.48, now + Math.min(0.06, duration / 4));
    gain.gain.setValueAtTime(0.48, now + Math.max(0.06, duration - 0.15));
    gain.gain.linearRampToValueAtTime(0, now + duration);
    source.connect(gain).connect(bus);
    let cleaned = false;
    const cleanup = (): void => {
      if (cleaned) return;
      cleaned = true;
      source.onended = null;
      source.stop();
      source.disconnect();
      gain.disconnect();
      this.voices.delete(cleanup);
    };
    this.voices.add(cleanup);
    source.onended = cleanup;
    source.start();
  }

  private clearSuspendTimer(): void {
    if (this.suspendTimer !== null) clearTimeout(this.suspendTimer);
    this.suspendTimer = null;
  }

  private fade(
    parameter: AudioParam | undefined,
    target: number,
    time: number,
  ): void {
    if (!parameter || !this.context) return;
    const now = this.context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setTargetAtTime(target, now, time);
    if (target === 0) parameter.setValueAtTime(0, now + time * 5);
  }

  private initialize(): void {
    const context = new AudioContext();
    this.context = context;
    const master = context.createGain();
    master.gain.value = 0;
    const bus = context.createGain();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 16;
    compressor.ratio.value = 5;
    const reverb = context.createConvolver();
    const wet = context.createGain();
    wet.gain.value = 0.23;
    const impulse = context.createBuffer(
      2,
      Math.ceil(context.sampleRate * 2.4),
      context.sampleRate,
    );
    for (let channel = 0; channel < 2; channel += 1) {
      const samples = impulse.getChannelData(channel);
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] =
          (Math.random() * 2 - 1) * Math.pow(1 - index / samples.length, 3);
      }
    }
    reverb.buffer = impulse;
    bus.connect(master);
    bus.connect(reverb).connect(wet).connect(master);
    master.connect(compressor).connect(context.destination);
    this.master = master;
    this.bus = bus;
    this.nodes.push(master, bus, compressor, reverb, wet);

    const noise = context.createBuffer(
      1,
      context.sampleRate * 3,
      context.sampleRate,
    );
    const samples = noise.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < samples.length; index += 1) {
      previous = (previous + Math.random() * 0.04 - 0.02) / 1.02;
      samples[index] = previous * 3.5;
    }
    this.noise = noise;
    const wind = context.createBufferSource();
    wind.buffer = noise;
    wind.loop = true;
    const windFilter = context.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = this.profile.formant * 0.6;
    windFilter.Q.value = 0.4;
    const windGain = context.createGain();
    windGain.gain.value = 0.09;
    wind.connect(windFilter).connect(windGain).connect(bus);
    wind.start();
    this.windFilter = windFilter;
    this.sources.push(wind);
    this.nodes.push(wind, windFilter, windGain);
    this.ambientGains.push(windGain);
    for (let index = 0; index < 2; index += 1) {
      const drone = context.createOscillator();
      const gain = context.createGain();
      drone.type = "sine";
      drone.frequency.value =
        (38 + (this.seed % 11) * 1.8) * (index ? 1.502 : 1);
      gain.gain.value = index ? 0.024 : 0.045;
      drone.connect(gain).connect(bus);
      drone.start();
      this.drones.push(drone);
      this.sources.push(drone);
      this.nodes.push(drone, gain);
      this.ambientGains.push(gain);
    }
    document.addEventListener("visibilitychange", this.onVisibility);
  }
}
