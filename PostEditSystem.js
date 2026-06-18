const POST_EDIT_TIMELINE_SECONDS = 120; 
const POST_EDIT_MAX_TIMELINE_SECONDS = 240;
const POST_EDIT_SNAP_DIVISION = 4; 
const POST_EDIT_FALLBACK_CLIP_SECONDS = 2.0;

let POST_EDIT_MASTER_BUS = null;

function createPostEditReverbImpulse(context){
  const duration = 1.15;
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for(let channel = 0; channel < impulse.numberOfChannels; channel++){
    const data = impulse.getChannelData(channel);
    for(let i = 0; i < length; i++){
      const envelope = Math.pow(1 - i / length, 2.6);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }
  return impulse;
}

function getPostEditMasterBus(){
  if(POST_EDIT_MASTER_BUS) return POST_EDIT_MASTER_BUS;

  try{
    const context = typeof getAudioContext === "function" ? getAudioContext() : null;
    if(!context) return null;

    const input = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const limiter = context.createDynamicsCompressor();

    input.gain.value = 0.72;
    compressor.threshold.value = -20;
    compressor.knee.value = 24;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.22;

    limiter.threshold.value = -2.5;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.08;

    const delayInput = context.createGain();
    const delayNode = context.createDelay(2.0);
    const delayFeedback = context.createGain();
    const delayOutput = context.createGain();
    delayNode.delayTime.value = 0.22;
    delayFeedback.gain.value = 0.18;
    delayOutput.gain.value = 0.42;

    const reverbInput = context.createGain();
    const convolver = context.createConvolver();
    const reverbOutput = context.createGain();
    convolver.buffer = createPostEditReverbImpulse(context);
    reverbOutput.gain.value = 0.38;

    input.connect(compressor);
    compressor.connect(limiter);
    limiter.connect(context.destination);

    delayInput.connect(delayNode);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayOutput);
    delayOutput.connect(input);

    reverbInput.connect(convolver);
    convolver.connect(reverbOutput);
    reverbOutput.connect(input);

    POST_EDIT_MASTER_BUS = {
      context,
      input,
      compressor,
      limiter,
      delayInput,
      reverbInput
    };
    return POST_EDIT_MASTER_BUS;
  } catch(error){
    console.warn("후편집 마스터 오디오 버스를 만들지 못했습니다.", error);
    return null;
  }
}

const POST_EDIT_CUTE_BGM_PATH = "Resources/Sounds/final/cuteBgm.mp3";

function registerPostEditBundledBgm(soundManager){
  if(!soundManager || !Array.isArray(soundManager.bgmOptions)) return;
  if(soundManager.bgmOptions.some(option => option && option.id === "cute_bgm_source")) return;

  const option = {
    id: "cute_bgm_source",
    name: "귀여운 BGM",
    sceneName: "귀여운 BGM",
    file: POST_EDIT_CUTE_BGM_PATH,
    color: [220, 142, 122],
    volume: 0.24,
    masterVolume: 0.78,
    rate: 1.0,
    panValue: 0,
    lowPassFreq: 9400,
    delayWet: 0,
    reverbWet: 0.05,
    soundFile: null,
    loading: true,
    loadError: false
  };

  soundManager.bgmOptions.push(option);
  if(soundManager.bgmTrack) soundManager.bgmTrack.bgmOptions = soundManager.bgmOptions;

  try{
    option.soundFile = loadSound(
      POST_EDIT_CUTE_BGM_PATH,
      () => {
        option.loading = false;
        option.loadError = false;
        soundManager.flashMessage("귀여운 BGM을 불러왔습니다.");
      },
      () => {
        option.loading = false;
        option.loadError = true;
        soundManager.flashMessage("cuteBgm.mp3 파일 위치를 확인해주세요.");
      }
    );
  } catch(error){
    option.loading = false;
    option.loadError = true;
    console.warn("귀여운 BGM을 불러오지 못했습니다.", error);
  }
}

class SoundManager{
  constructor(){
    this.tracks = [];
    this.message = "";
    this.messageUntil = 0;
    this.bgmTrack = null;
    this.bgmOptions = [];
    this.selectedBgmIndex = 0;
  }

  get bgmStorageKey(){
    return "re_summer_selected_bgm_final_main_v1";
  }

  loadSelectedBgmIndex(){
    try{
      const raw = localStorage.getItem(this.bgmStorageKey);
      const parsed = Number(raw);
      if(Number.isFinite(parsed)) this.selectedBgmIndex = int(parsed);
    } catch(error){}
  }

  registerBgmOptions(options){
    if(!Array.isArray(options) || options.length === 0) return null;
    this.bgmOptions = options;
    this.loadSelectedBgmIndex();
    this.selectedBgmIndex = clamp(this.selectedBgmIndex, 0, this.bgmOptions.length - 1);
    const selected = this.bgmOptions[this.selectedBgmIndex];
    const bgmConfig = {
      ...selected,
      id: "main_bgm",
      name: "배경음악",
      sceneName: selected.name || `BGM ${this.selectedBgmIndex + 1}`,
      isBgm: true,
      bgmOptions: this.bgmOptions,
      selectedBgmIndex: this.selectedBgmIndex
    };
    this.bgmTrack = new MixTrack(bgmConfig);
    this.bgmTrack.applyBgmOption(selected, this.selectedBgmIndex);
    this.bgmTrack.ensureMainBgmClip(null, true);
    this.tracks.unshift(this.bgmTrack);
    return this.bgmTrack;
  }

  selectBgmOption(index){
    if(!this.bgmTrack || this.bgmOptions.length === 0) return null;
    const safeIndex = int(clamp(index, 0, this.bgmOptions.length - 1));
    const option = this.bgmOptions[safeIndex];
    if(!option || !option.soundFile){
      this.flashMessage("선택한 BGM을 아직 불러오지 못했습니다.");
      return null;
    }
    if(typeof option.soundFile.isLoaded === "function" && !option.soundFile.isLoaded()){
      this.flashMessage(option.loadError ? "BGM 파일 위치를 확인해주세요." : "BGM을 불러오는 중입니다.");
      return null;
    }
    this.selectedBgmIndex = safeIndex;
    try{ localStorage.setItem(this.bgmStorageKey, String(safeIndex)); } catch(error){}
    this.stopAll();
    this.bgmTrack.applyBgmOption(option, safeIndex);
    this.bgmTrack.ensureMainBgmClip(null, true);
    return this.bgmTrack;
  }

  getSelectedBgmOption(){
    if(this.bgmOptions.length === 0) return null;
    return this.bgmOptions[this.selectedBgmIndex] || this.bgmOptions[0];
  }

  collect(config){
    const existing = this.tracks.find(track => track.id === config.id);
    if(existing) return existing;

    const track = new MixTrack(config);
    this.tracks.push(track);
    return track;
  }

  collectMany(configs){
    for(const config of configs) this.collect(config);
  }

  flashMessage(message){
    this.message = message;
    this.messageUntil = millis() + 1200;
  }

  stopAll(){
    for(const track of this.tracks) track.stop();
  }
}

class ClipInstance{
  constructor(track, startTimeSec, values = {}){
    this.trackId = track.id;
    this.startTimeSec = values.startTimeSec ?? startTimeSec;
    this.uid = values.uid || `${track.id}_${nf(this.startTimeSec, 1, 2)}_${Date.now()}_${int(random(10000))}`;

    this.volume = values.volume ?? track.defaultVolume;
    this.rate = values.rate ?? track.defaultRate;
    this.panValue = values.panValue ?? track.defaultPanValue;
    this.lowPassFreq = values.lowPassFreq ?? track.defaultLowPassFreq;
    this.delayWet = values.delayWet ?? track.defaultDelayWet;
    this.reverbWet = values.reverbWet ?? track.defaultReverbWet;
    this.reverseMode = values.reverseMode ?? false;
    this.zIndex = values.zIndex ?? 0;

    this.trimStartSec = Math.max(0, Number(values.trimStartSec) || 0);
    this.trimEndSec = Math.max(0, Number(values.trimEndSec) || 0);
    this.lengthSeconds = values.lengthSeconds ?? track.getDefaultClipLengthSeconds();

    if(!track.isBgm){
      const hasSavedTrim = values.trimStartSec !== undefined || values.trimEndSec !== undefined;
      if(!hasSavedTrim && values.lengthSeconds !== undefined){
        const fileDuration = track.getSourceDurationSeconds();
        const safeRate = Math.max(0.1, Math.abs(this.rate || 1));
        const desiredSourceDuration = clamp(Number(values.lengthSeconds) * safeRate, track.getMinimumTrimmedSourceSeconds(), fileDuration);
        this.trimEndSec = Math.max(0, fileDuration - desiredSourceDuration);
      }
      track.normalizeClipTrim(this);
    }
  }

  get endTimeSec(){
    return this.startTimeSec + this.lengthSeconds;
  }

  toJSON(){
    return {
      uid: this.uid,
      startTimeSec: this.startTimeSec,
      lengthSeconds: this.lengthSeconds,
      trimStartSec: this.trimStartSec,
      trimEndSec: this.trimEndSec,
      volume: this.volume,
      rate: this.rate,
      panValue: this.panValue,
      lowPassFreq: this.lowPassFreq,
      delayWet: this.delayWet,
      reverbWet: this.reverbWet,
      reverseMode: this.reverseMode,
      zIndex: this.zIndex
    };
  }
}

class MixTrack{
  constructor(config){
    this.id = config.id;
    this.name = config.name;
    this.sceneName = config.sceneName || "";
    this.color = config.color || [190, 130, 80];
    this.soundFile = config.soundFile;
    this.isBgm = !!config.isBgm;
    this.bgmOptions = config.bgmOptions || [];
    this.selectedBgmIndex = config.selectedBgmIndex ?? 0;
    this.bgmOptionName = config.optionName || config.sceneName || "";

    this.defaultMasterVolume = config.masterVolume ?? 1.0;
    this.masterVolume = this.defaultMasterVolume;
    this.muted = config.muted ?? false;
    this.solo = config.solo ?? false;
    this.loadTrackSettings();

    this.defaultVolume = config.volume ?? 0.65;
    this.defaultRate = config.rate ?? 1.0;
    this.defaultPanValue = config.panValue ?? 0;
    this.defaultLowPassFreq = config.lowPassFreq ?? 9000;
    this.defaultDelayWet = config.delayWet ?? 0;
    this.defaultDelayTime = config.delayTime ?? 0.22;
    this.defaultReverbWet = config.reverbWet ?? 0;

    this.clips = [];
    this.nextZIndex = 1;
    this.peakCache = {};

    this.filter = null;
    this.delay = null;
    this.reverb = null;
    this.audioReady = false;
    this.currentReverseState = false;
    this.lastTriggerMillis = -Infinity;
    this.nativeVoices = new Set();
    this.nativeReverseBuffer = null;
    this.nativeReverseSourceBuffer = null;

    this.loadSavedClips();
  }

  applyBgmOption(option, index = 0){
    if(!option) return;
    this.selectedBgmIndex = index;
    this.bgmOptionName = option.name || `BGM ${index + 1}`;
    this.sceneName = this.bgmOptionName;
    this.soundFile = option.soundFile || this.soundFile;
    this.color = option.color || this.color;

    this.defaultVolume = option.volume ?? this.defaultVolume ?? 0.65;
    this.defaultRate = option.rate ?? 1.0;
    this.defaultPanValue = option.panValue ?? 0;
    this.defaultLowPassFreq = option.lowPassFreq ?? 9000;
    this.defaultDelayWet = option.delayWet ?? 0;
    this.defaultDelayTime = option.delayTime ?? 0.22;
    this.defaultReverbWet = option.reverbWet ?? 0;

    this.stop();
    this.peakCache = {};
    this.audioReady = false;
    this.currentReverseState = false;
    this.nativeReverseBuffer = null;
    this.nativeReverseSourceBuffer = null;
    this.filter = null;
    this.delay = null;
    this.reverb = null;
  }

  ensureMainBgmClip(totalSeconds = null, resetMix = false){
    if(!this.isBgm) return;
    let clip = this.clips[0];
    const created = !clip;
    if(!clip){
      clip = new ClipInstance(this, 0, {
        uid: `${this.id}_main_${Date.now()}_${int(random(10000))}`,
        zIndex: 0
      });
    }

    if(created || resetMix){
      clip.volume = this.defaultVolume;
      clip.rate = this.defaultRate;
      clip.panValue = this.defaultPanValue;
      clip.lowPassFreq = this.defaultLowPassFreq;
      clip.delayWet = this.defaultDelayWet;
      clip.reverbWet = this.defaultReverbWet;
      clip.reverseMode = false;
    }

    clip.startTimeSec = 0;
    clip.trimStartSec = 0;
    clip.trimEndSec = 0;
    clip.lengthSeconds = this.getMainBgmDurationSeconds(clip.rate);
    clip.zIndex = 0;
    this.clips = [clip];
    this.nextZIndex = 1;
    this.saveClips();
  }

  get settingsStorageKey(){
    return `re_summer_track_settings_final_main_v1_${this.id}`;
  }

  loadTrackSettings(){
    try{
      const raw = localStorage.getItem(this.settingsStorageKey);
      if(!raw) return;
      const saved = JSON.parse(raw);
      if(Number.isFinite(saved.masterVolume)) this.masterVolume = clamp(saved.masterVolume, 0, 1);
      if(typeof saved.muted === "boolean") this.muted = saved.muted;
      if(typeof saved.solo === "boolean") this.solo = saved.solo;
    } catch(error){
      console.warn("트랙 설정을 불러오지 못했습니다.", error);
    }
  }

  saveTrackSettings(){
    try{
      localStorage.setItem(this.settingsStorageKey, JSON.stringify({
        masterVolume: this.masterVolume,
        muted: this.muted,
        solo: this.solo
      }));
    } catch(error){
      console.warn("트랙 설정 저장을 건너뜁니다.", error);
    }
  }

  setMasterVolume(value){
    this.masterVolume = clamp(value, 0, 1);
    this.saveTrackSettings();
  }

  toggleMute(){
    this.muted = !this.muted;
    if(this.muted){
      this.solo = false;
      this.stop();
    }
    this.saveTrackSettings();
  }

  toggleSolo(){
    this.solo = !this.solo;
    if(this.solo) this.muted = false;
    this.saveTrackSettings();
  }

  get storageKey(){
    return `re_summer_arrangement_final_main_v1_${this.id}`;
  }

  getSourceDurationSeconds(){
    if(this.soundFile && typeof this.soundFile.duration === "function"){
      const d = this.soundFile.duration();
      if(Number.isFinite(d) && d > 0) return d;
    }
    return POST_EDIT_FALLBACK_CLIP_SECONDS;
  }

  getMainBgmDurationSeconds(rate = this.defaultRate){
    const sourceDuration = this.getSourceDurationSeconds();
    const safeRate = Math.max(0.1, Math.abs(rate || 1));
    return clamp(sourceDuration / safeRate, 1, POST_EDIT_MAX_TIMELINE_SECONDS);
  }

  getDefaultClipLengthSeconds(){
    if(this.isBgm) return this.getMainBgmDurationSeconds(this.defaultRate);
    if(this.soundFile && typeof this.soundFile.duration === "function"){
      const d = this.soundFile.duration();
      const safeRate = Math.max(0.1, Math.abs(this.defaultRate || 1));
      if(Number.isFinite(d) && d > 0) return clamp(d / safeRate, 0.08, POST_EDIT_MAX_TIMELINE_SECONDS);
    }
    return POST_EDIT_FALLBACK_CLIP_SECONDS;
  }

  getMinimumTrimmedSourceSeconds(){
    const duration = this.getSourceDurationSeconds();
    return Math.min(0.08, Math.max(0.02, duration));
  }

  getClipSourceBounds(clip){
    const fileDuration = Math.max(0.02, this.getSourceDurationSeconds());
    const minimum = Math.min(this.getMinimumTrimmedSourceSeconds(), fileDuration);
    let startSec = clamp(Number(clip && clip.trimStartSec) || 0, 0, Math.max(0, fileDuration - minimum));
    let endTrimSec = clamp(Number(clip && clip.trimEndSec) || 0, 0, Math.max(0, fileDuration - minimum));

    if(startSec + endTrimSec > fileDuration - minimum){
      endTrimSec = Math.max(0, fileDuration - minimum - startSec);
    }

    const endSec = Math.max(startSec + minimum, fileDuration - endTrimSec);
    return {
      fileDuration,
      minimum,
      startSec,
      endSec,
      endTrimSec: Math.max(0, fileDuration - endSec),
      durationSec: Math.max(minimum, endSec - startSec)
    };
  }

  normalizeClipTrim(clip){
    if(!clip || this.isBgm) return clip;
    const bounds = this.getClipSourceBounds(clip);
    clip.trimStartSec = bounds.startSec;
    clip.trimEndSec = bounds.endTrimSec;
    const safeRate = Math.max(0.1, Math.abs(clip.rate || 1));
    clip.lengthSeconds = clamp(bounds.durationSec / safeRate, bounds.minimum / safeRate, POST_EDIT_MAX_TIMELINE_SECONDS);
    return clip;
  }

  setClipTrimValue(uid, prop, value){
    const clip = this.getClipByUid(uid);
    if(!clip || this.isBgm) return;
    const fileDuration = Math.max(0.02, this.getSourceDurationSeconds());
    const minimum = Math.min(this.getMinimumTrimmedSourceSeconds(), fileDuration);

    if(prop === "trimStartSec"){
      clip.trimStartSec = clamp(Number(value) || 0, 0, Math.max(0, fileDuration - clip.trimEndSec - minimum));
    } else if(prop === "trimEndSec"){
      clip.trimEndSec = clamp(Number(value) || 0, 0, Math.max(0, fileDuration - clip.trimStartSec - minimum));
    } else {
      return;
    }

    this.normalizeClipTrim(clip);
    this.saveClips();
  }

  resetClipTrim(uid){
    const clip = this.getClipByUid(uid);
    if(!clip || this.isBgm) return;
    clip.trimStartSec = 0;
    clip.trimEndSec = 0;
    this.normalizeClipTrim(clip);
    this.saveClips();
  }

  splitClipAtTimelineTime(uid, cutTimeSec){
    const clip = this.getClipByUid(uid);
    if(!clip || this.isBgm) return null;

    const safeRate = Math.max(0.1, Math.abs(clip.rate || 1));
    const minimumTimeline = this.getMinimumTrimmedSourceSeconds() / safeRate;
    const cutTime = Number(cutTimeSec);
    const localCutTime = cutTime - clip.startTimeSec;

    if(!Number.isFinite(cutTime)) return null;
    if(localCutTime <= minimumTimeline || localCutTime >= clip.lengthSeconds - minimumTimeline) return null;

    const bounds = this.getClipSourceBounds(clip);
    const consumedSource = clamp(localCutTime * safeRate, bounds.minimum, bounds.durationSec - bounds.minimum);
    const sourceBoundary = clip.reverseMode
      ? bounds.endSec - consumedSource
      : bounds.startSec + consumedSource;

    const originalStartTime = clip.startTimeSec;
    const originalValues = {
      volume: clip.volume,
      rate: clip.rate,
      panValue: clip.panValue,
      lowPassFreq: clip.lowPassFreq,
      delayWet: clip.delayWet,
      reverbWet: clip.reverbWet,
      reverseMode: clip.reverseMode
    };

    let leftTrimStart;
    let leftTrimEnd;
    let rightTrimStart;
    let rightTrimEnd;

    if(clip.reverseMode){
      leftTrimStart = sourceBoundary;
      leftTrimEnd = bounds.endTrimSec;
      rightTrimStart = bounds.startSec;
      rightTrimEnd = Math.max(0, bounds.fileDuration - sourceBoundary);
    } else {
      leftTrimStart = bounds.startSec;
      leftTrimEnd = Math.max(0, bounds.fileDuration - sourceBoundary);
      rightTrimStart = sourceBoundary;
      rightTrimEnd = bounds.endTrimSec;
    }

    clip.trimStartSec = leftTrimStart;
    clip.trimEndSec = leftTrimEnd;
    this.normalizeClipTrim(clip);
    clip.startTimeSec = originalStartTime;

    const rightClip = new ClipInstance(this, cutTime, {
      ...originalValues,
      startTimeSec: cutTime,
      trimStartSec: rightTrimStart,
      trimEndSec: rightTrimEnd,
      zIndex: this.nextZIndex++
    });
    rightClip.startTimeSec = cutTime;

    this.clips.push(rightClip);
    this.clips.sort((a, b) => a.startTimeSec - b.startTimeSec || a.zIndex - b.zIndex);
    this.saveClips();

    return { leftClip: clip, rightClip };
  }

  loadSavedClips(){
    try{
      const raw = localStorage.getItem(this.storageKey);
      if(!raw) return;
      const saved = JSON.parse(raw);
      if(!Array.isArray(saved.clips)) return;
      this.clips = saved.clips.map(data => new ClipInstance(this, data.startTimeSec ?? 0, data));
      const maxZ = this.clips.reduce((maxValue, clip) => Math.max(maxValue, clip.zIndex || 0), 0);
      this.nextZIndex = maxZ + 1;
    } catch(error){
      console.warn("저장된 arrangement를 불러오지 못했습니다.", error);
    }
  }

  saveClips(){
    try{
      localStorage.setItem(this.storageKey, JSON.stringify({
        clips: this.clips.map(clip => clip.toJSON())
      }));
    } catch(error){
      console.warn("arrangement 저장을 건너뜁니다.", error);
    }
  }

  ensureAudio(){
    if(this.audioReady || !this.soundFile) return;

    this.filter = new p5.LowPass();
    this.delay = new p5.Delay();
    this.reverb = new p5.Reverb();

    try{
      if(typeof this.soundFile.playMode === "function") this.soundFile.playMode("sustain");
    } catch(error){}

    this.soundFile.disconnect();
    this.soundFile.connect(this.filter);
    this.filter.disconnect();

    const masterBus = getPostEditMasterBus();
    if(masterBus && masterBus.input) this.filter.connect(masterBus.input);
    else this.filter.connect();

    this.delay.process(this.filter, this.defaultDelayTime, 0.24, 2300);
    this.reverb.process(this.filter, 2.4, 2.0);

    this.audioReady = true;
  }

  createClip(startTimeSec){
    if(this.isBgm){
      this.ensureMainBgmClip(null);
      return this.clips[0];
    }
    const length = this.getDefaultClipLengthSeconds();
    const safeStartTime = clamp(startTimeSec, 0, Math.max(0, POST_EDIT_TIMELINE_SECONDS - 0.05));
    const clip = new ClipInstance(this, safeStartTime, { lengthSeconds: length });
    clip.zIndex = this.nextZIndex++;
    this.clips.push(clip);
    this.clips.sort((a, b) => a.startTimeSec - b.startTimeSec || a.zIndex - b.zIndex);
    this.saveClips();
    return clip;
  }

  removeClip(uid){
    const before = this.clips.length;
    this.clips = this.clips.filter(clip => clip.uid !== uid);
    if(this.clips.length !== before) this.saveClips();
  }

  getClipByUid(uid){
    return this.clips.find(clip => clip.uid === uid) || null;
  }

  setClipValue(uid, prop, value){
    const clip = this.getClipByUid(uid);
    if(!clip) return;
    clip[prop] = value;
    if(prop === "rate" && !this.isBgm) this.normalizeClipTrim(clip);
    this.saveClips();
  }

  getNativeAudioBuffer(reverseMode = false){
    const buffer = this.soundFile && this.soundFile.buffer;
    if(!buffer || typeof buffer.getChannelData !== "function") return null;
    if(!reverseMode) return buffer;

    if(this.nativeReverseBuffer && this.nativeReverseSourceBuffer === buffer){
      return this.nativeReverseBuffer;
    }

    try{
      const context = typeof getAudioContext === "function" ? getAudioContext() : null;
      if(!context) return null;
      const reversed = context.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
      for(let channel = 0; channel < buffer.numberOfChannels; channel++){
        const sourceData = buffer.getChannelData(channel);
        const targetData = reversed.getChannelData(channel);
        for(let left = 0, right = sourceData.length - 1; left < sourceData.length; left++, right--){
          targetData[left] = sourceData[right];
        }
      }
      this.nativeReverseSourceBuffer = buffer;
      this.nativeReverseBuffer = reversed;
      return reversed;
    } catch(error){
      console.warn(`${this.name} 역재생 버퍼 생성 실패`, error);
      return null;
    }
  }

  cleanupNativeVoice(voice){
    if(!voice) return;
    this.nativeVoices.delete(voice);
    const nodes = voice.nodes || [];
    for(const node of nodes){
      try{ node.disconnect(); } catch(error){}
    }
  }

  stopNativeVoices(){
    const voices = [...this.nativeVoices];
    this.nativeVoices.clear();
    for(const voice of voices){
      try{ voice.source.onended = null; } catch(error){}
      try{ voice.source.stop(); } catch(error){}
      const nodes = voice.nodes || [];
      for(const node of nodes){
        try{ node.disconnect(); } catch(error){}
      }
    }
  }

  isAnyVoicePlaying(){
    if(this.nativeVoices.size > 0) return true;
    try{
      return !!(this.soundFile && typeof this.soundFile.isPlaying === "function" && this.soundFile.isPlaying());
    } catch(error){
      return false;
    }
  }

  playNativeClipVoice(clip, offsetWithinClipSec = 0, gainScale = 1){
    if(!clip || !this.soundFile) return false;
    const masterBus = getPostEditMasterBus();
    if(!masterBus || !masterBus.context || !masterBus.input) return false;

    const context = masterBus.context;
    try{
      if(context.state === "suspended") context.resume();
    } catch(error){}

    const audioBuffer = this.getNativeAudioBuffer(!!clip.reverseMode);
    if(!audioBuffer) return false;

    const bounds = this.getClipSourceBounds(clip);
    const safeRate = Math.max(0.1, Math.abs(Number(clip.rate) || 1));
    const timelineOffset = clamp(Number(offsetWithinClipSec) || 0, 0, Math.max(0, clip.lengthSeconds - 0.005));
    const sourceOffsetWithinSelection = timelineOffset * safeRate;
    const cueBase = clip.reverseMode ? bounds.endTrimSec : bounds.startSec;
    const sourceOffset = clamp(cueBase + sourceOffsetWithinSelection, 0, Math.max(0, audioBuffer.duration - 0.005));
    const remainingTimeline = Math.max(0.005, clip.lengthSeconds - timelineOffset);
    const remainingSource = Math.max(0.005, bounds.durationSec - sourceOffsetWithinSelection);
    const sourceDuration = Math.min(remainingSource, remainingTimeline * safeRate, audioBuffer.duration - sourceOffset);
    if(!Number.isFinite(sourceDuration) || sourceDuration <= 0.004) return false;

    try{
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = safeRate;

      let currentNode = source;
      const nodes = [source];

      const lowPassFreq = clamp(Number(clip.lowPassFreq) || 10000, 120, Math.min(20000, context.sampleRate * 0.48));
      if(lowPassFreq < Math.min(18000, context.sampleRate * 0.45)){
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = lowPassFreq;
        filter.Q.value = 0.7;
        currentNode.connect(filter);
        currentNode = filter;
        nodes.push(filter);
      }

      if(typeof context.createStereoPanner === "function"){
        const panner = context.createStereoPanner();
        panner.pan.value = clamp(Number(clip.panValue) || 0, -1, 1);
        currentNode.connect(panner);
        currentNode = panner;
        nodes.push(panner);
      }

      const voiceGain = context.createGain();
      const baseVolume = clamp((Number(clip.volume) || 0) * this.masterVolume, 0, 1.15);
      voiceGain.gain.value = clamp(baseVolume * clamp(Number(gainScale) || 1, 0, 1), 0, 1.15);
      currentNode.connect(voiceGain);
      voiceGain.connect(masterBus.input);
      nodes.push(voiceGain);

      const delayWet = clamp(Number(clip.delayWet) || 0, 0, 0.72);
      if(delayWet > 0.005 && masterBus.delayInput){
        const delaySend = context.createGain();
        delaySend.gain.value = delayWet * 0.55;
        voiceGain.connect(delaySend);
        delaySend.connect(masterBus.delayInput);
        nodes.push(delaySend);
      }

      const reverbWet = clamp(Number(clip.reverbWet) || 0, 0, 0.72);
      if(reverbWet > 0.005 && masterBus.reverbInput){
        const reverbSend = context.createGain();
        reverbSend.gain.value = reverbWet * 0.52;
        voiceGain.connect(reverbSend);
        reverbSend.connect(masterBus.reverbInput);
        nodes.push(reverbSend);
      }

      const voice = { source, nodes };
      this.nativeVoices.add(voice);
      source.onended = () => this.cleanupNativeVoice(voice);
      source.start(context.currentTime + 0.003, sourceOffset, sourceDuration);
      this.lastTriggerMillis = typeof millis === "function" ? millis() : Date.now();
      return true;
    } catch(error){
      console.warn(`${this.name} 네이티브 오디오 재생 실패`, error);
      return false;
    }
  }

  applyClipMix(clip, gainScale = 1){
    if(!this.soundFile || !clip) return;
    this.ensureAudio();
    this.ensureReverseState(clip.reverseMode);

    const outputGain = clamp(gainScale, 0.08, 1);
    this.soundFile.setVolume(outputGain, 0.02);
    this.soundFile.rate(clip.rate);
    this.soundFile.pan(clip.panValue);

    if(this.filter){
      this.filter.freq(clip.lowPassFreq);
      this.filter.res(6);
    }
    if(this.delay) this.delay.drywet(clamp(clip.delayWet, 0, 0.72));
    if(this.reverb) this.reverb.drywet(clamp(clip.reverbWet, 0, 0.72));
  }

  ensureReverseState(shouldBeReversed){
    if(!this.soundFile || typeof this.soundFile.reverseBuffer !== "function") return;
    if(this.currentReverseState === shouldBeReversed) return;

    try{
      this.soundFile.reverseBuffer();
      this.currentReverseState = shouldBeReversed;
    } catch(error){
      console.warn(`${this.name} reverseBuffer 실패`, error);
    }
  }

  triggerClip(clip, offsetWithinClipSec = 0, gainScale = 1){
    if(!clip || !this.soundFile) return false;

    if(this.playNativeClipVoice(clip, offsetWithinClipSec, gainScale)) return true;

    if(this.currentReverseState !== clip.reverseMode){
      try{
        if(this.soundFile.isPlaying()) this.soundFile.stop();
      } catch(error){}
    }

    this.applyClipMix(clip, gainScale);
    const bounds = this.getClipSourceBounds(clip);
    const safeRate = Math.max(0.1, Math.abs(clip.rate || 1));
    const timelineOffset = clamp(offsetWithinClipSec, 0, Math.max(0, clip.lengthSeconds - 0.01));
    const sourceOffsetWithinSelection = timelineOffset * safeRate;
    const cueBase = clip.reverseMode ? bounds.endTrimSec : bounds.startSec;
    const sourceOffset = clamp(cueBase + sourceOffsetWithinSelection, 0, Math.max(0, bounds.fileDuration - 0.01));
    const remainingTimeline = Math.max(0.01, clip.lengthSeconds - timelineOffset);
    const remainingSource = Math.max(0.01, bounds.durationSec - sourceOffsetWithinSelection);
    const sourceDuration = Math.min(remainingSource, remainingTimeline * safeRate);
    if(sourceDuration <= 0.005) return false;

    const voiceVolume = clamp(clip.volume * this.masterVolume, 0, 0.96);
    this.soundFile.play(0, clip.rate, voiceVolume, sourceOffset, sourceDuration);
    this.lastTriggerMillis = typeof millis === "function" ? millis() : Date.now();
    return true;
  }

  previewClip(clip){
    if(!clip || !this.soundFile) return;
    this.stop();
    if(this.playNativeClipVoice(clip, 0, 1)) return;

    this.ensureAudio();
    this.ensureReverseState(clip.reverseMode);

    const previewVolume = clamp(clip.volume, 0, 1);
    this.soundFile.setVolume(previewVolume);
    this.soundFile.rate(clip.rate);
    this.soundFile.pan(clip.panValue);

    if(this.filter){
      this.filter.freq(clip.lowPassFreq);
      this.filter.res(6);
    }
    if(this.delay) this.delay.drywet(clip.delayWet);
    if(this.reverb) this.reverb.drywet(clip.reverbWet);

    const bounds = this.getClipSourceBounds(clip);
    const cueStart = clip.reverseMode ? bounds.endTrimSec : bounds.startSec;
    this.soundFile.play(0, clip.rate, previewVolume, cueStart, bounds.durationSec);
  }

  previewSourceOnce(){
    if(!this.soundFile) return;
    this.stop();
    const fileDuration = this.soundFile.duration ? this.soundFile.duration() : this.getDefaultClipLengthSeconds();
    const previewClip = {
      volume: this.defaultVolume,
      rate: this.defaultRate,
      panValue: this.defaultPanValue,
      lowPassFreq: this.defaultLowPassFreq,
      delayWet: this.defaultDelayWet,
      reverbWet: this.defaultReverbWet,
      reverseMode: false,
      trimStartSec: 0,
      trimEndSec: 0,
      lengthSeconds: fileDuration / Math.max(0.1, Math.abs(this.defaultRate || 1))
    };
    if(this.playNativeClipVoice(previewClip, 0, 1)) return;
    this.applyClipMix(previewClip);
    this.soundFile.play(0, this.defaultRate, clamp(this.defaultVolume * this.masterVolume, 0, 1), 0, fileDuration);
  }

  stop(){
    this.stopNativeVoices();
    if(!this.soundFile) return;
    try{ this.soundFile.stop(); } catch(error){}
  }

  getPeaks(count = 48){
    if(!this.soundFile || typeof this.soundFile.getPeaks !== "function") return [];
    const safeCount = Math.max(8, int(count));
    if(this.peakCache[safeCount]) return this.peakCache[safeCount];
    try{
      const peaks = this.soundFile.getPeaks(safeCount) || [];
      this.peakCache[safeCount] = peaks;
      return peaks;
    }
    catch(error){ return []; }
  }
}

class MixerUI {
constructor(soundManager){
    this.soundManager = soundManager;
    registerPostEditBundledBgm(this.soundManager);

    this.totalSeconds = this.getBgmTimelineSeconds();
    this.snapDivision = POST_EDIT_SNAP_DIVISION;
    this.bpm = 92;

    this.pixelsPerSecond = 34;
    this.minPixelsPerSecond = 10;
    this.maxPixelsPerSecond = 150;
    this.timelineScrollSec = 0;

    this.trackRowH = 68;
    this.minTrackRowH = 42;
    this.maxTrackRowH = 132;
    this.verticalScrollPx = 0;

    this.draggingScrollbar = null;
    this.horizontalScrollbarRect = null;
    this.verticalScrollbarRect = null;

    this.isPlaying = false;
    this.playStartMillis = 0;
    this.playStartTimeSec = 0;
    this.lastTimePositionSec = 0;
    this.playedClipIds = new Set();
    this.activeEffectTracks = new Map();
    this.currentTimePositionSec = 0;

    this.metronomeEnabled = false;
    this.lastMetronomeBeatIndex = -1;

    this.selectedTrackIndex = 0;
    this.selectedClipUid = null;
    this.selectedClipUids = [];
    this.editingTrackIndex = -1;
    this.editingClipUid = null;

    this.draggingSlider = null;
    this.draggingTrackVolume = null;
    this.draggingClips = null;
    this.sliderDefs = [];

    this.draggingPlayhead = false;
    this.lastPlayheadEdgeScrollMillis = 0;
    this.selectionBox = null;
    this.isSelectingBox = false;

    this.bgmButtonRects = [];
    this.bpmInput = null;
    this.bpmDraft = String(this.bpm);
    this.showGuideBanner = true;
    this.guideCloseRect = null;
    this.showFinishConfirm = false;
    this.finishConfirmYesRect = null;
    this.finishConfirmNoRect = null;
    this.showResetConfirm = false;
    this.resetConfirmYesRect = null;
    this.resetConfirmNoRect = null;
    this.editingSessionPrepared = false;
    this.undoHistory = [];
    this.undoLimit = 40;
    this.isRestoringUndo = false;

    this.syncTimelineToBgm(true);
  }
}

Object.defineProperty(MixerUI.prototype, 'selectedTrack', { get: function() {
    if(this.soundManager.tracks.length === 0) return null;
    this.selectedTrackIndex = clamp(this.selectedTrackIndex, 0, this.soundManager.tracks.length - 1);
    return this.soundManager.tracks[this.selectedTrackIndex];
  }, configurable: true });
Object.defineProperty(MixerUI.prototype, 'selectedClip', { get: function() {
    if(!this.selectedClipUid && this.selectedClipUids.length > 0){
      this.selectedClipUid = this.selectedClipUids[this.selectedClipUids.length - 1];
    }
    if(!this.selectedClipUid) return null;
    for(const track of this.soundManager.tracks){
      const clip = track.getClipByUid(this.selectedClipUid);
      if(clip) return { track, clip };
    }
    return null;
  }, configurable: true });
Object.defineProperty(MixerUI.prototype, 'editingTrack', { get: function() {
    if(this.editingTrackIndex < 0 || this.editingTrackIndex >= this.soundManager.tracks.length) return null;
    return this.soundManager.tracks[this.editingTrackIndex];
  }, configurable: true });
Object.defineProperty(MixerUI.prototype, 'editingClip', { get: function() {
    const track = this.editingTrack;
    if(!track || !this.editingClipUid) return null;
    return track.getClipByUid(this.editingClipUid);
  }, configurable: true });

MixerUI.prototype.ensureGuideMix = function() {
  };

MixerUI.prototype.captureUndoState = function() {
    return {
      selectedTrackIndex: this.selectedTrackIndex,
      selectedClipUid: this.selectedClipUid,
      selectedClipUids: [...this.selectedClipUids],
      tracks: this.soundManager.tracks.map(track => ({
        id: track.id,
        masterVolume: track.masterVolume,
        muted: track.muted,
        solo: track.solo,
        nextZIndex: track.nextZIndex,
        clips: track.clips.map(clip => clip.toJSON())
      }))
    };
  };

MixerUI.prototype.pushUndoState = function(label = "edit", state = null) {
    if(this.isRestoringUndo) return;
    const snapshot = state || this.captureUndoState();
    let serialized = "";
    try{ serialized = JSON.stringify(snapshot); } catch(error){}
    const previous = this.undoHistory.length > 0 ? this.undoHistory[this.undoHistory.length - 1] : null;
    if(previous && serialized && previous.serialized === serialized) return;
    this.undoHistory.push({ label, state: snapshot, serialized });
    if(this.undoHistory.length > this.undoLimit){
      this.undoHistory.splice(0, this.undoHistory.length - this.undoLimit);
    }
  };

MixerUI.prototype.restoreUndoState = function(state) {
    if(!state || !Array.isArray(state.tracks)) return false;
    this.isRestoringUndo = true;
    try{
      this.stopTransport(false);
      this.soundManager.stopAll();
      this.closeClipEditWindow();

      for(const savedTrack of state.tracks){
        const track = this.soundManager.tracks.find(item => item.id === savedTrack.id);
        if(!track) continue;
        track.masterVolume = clamp(Number(savedTrack.masterVolume), 0, 1);
        if(!Number.isFinite(track.masterVolume)) track.masterVolume = track.defaultMasterVolume ?? 1.0;
        track.muted = !!savedTrack.muted;
        track.solo = !!savedTrack.solo;
        track.clips = Array.isArray(savedTrack.clips)
          ? savedTrack.clips.map(data => new ClipInstance(track, data.startTimeSec ?? 0, data))
          : [];
        const maxZ = track.clips.reduce((value, clip) => Math.max(value, Number(clip.zIndex) || 0), 0);
        track.nextZIndex = Math.max(Number(savedTrack.nextZIndex) || 1, maxZ + 1);
        if(track.isBgm && track.clips.length === 0){
          track.ensureMainBgmClip(null, true);
        } else {
          track.saveClips();
        }
        track.saveTrackSettings();
      }

      const existingUids = new Set();
      for(const track of this.soundManager.tracks){
        for(const clip of track.clips) existingUids.add(clip.uid);
      }
      this.selectedTrackIndex = clamp(Number(state.selectedTrackIndex) || 0, 0, Math.max(0, this.soundManager.tracks.length - 1));
      this.selectedClipUids = Array.isArray(state.selectedClipUids)
        ? state.selectedClipUids.filter(uid => existingUids.has(uid))
        : [];
      this.selectedClipUid = existingUids.has(state.selectedClipUid)
        ? state.selectedClipUid
        : (this.selectedClipUids.length > 0 ? this.selectedClipUids[this.selectedClipUids.length - 1] : null);
      this.editingTrackIndex = -1;
      this.editingClipUid = null;
      this.draggingSlider = null;
      this.draggingTrackVolume = null;
      this.draggingPlayhead = false;
      this.draggingScrollbar = null;
      this.selectionBox = null;
      this.isSelectingBox = false;
      this.playedClipIds.clear();
      this.activeEffectTracks.clear();
      this.showFinishConfirm = false;
      this.showResetConfirm = false;
      this.syncTimelineToBgm(false);
      this.currentTimePositionSec = clamp(this.currentTimePositionSec, 0, Math.max(0, this.totalSeconds - 0.01));
      this.lastTimePositionSec = this.currentTimePositionSec;
      return true;
    } finally {
      this.isRestoringUndo = false;
    }
  };

MixerUI.prototype.undoLastAction = function() {
    if(!this.undoHistory || this.undoHistory.length === 0){
      this.soundManager.flashMessage("되돌릴 작업이 없습니다.");
      return false;
    }
    const entry = this.undoHistory.pop();
    if(!entry || !this.restoreUndoState(entry.state)){
      this.soundManager.flashMessage("이전 작업을 복원하지 못했습니다.");
      return false;
    }
    this.soundManager.flashMessage("이전 작업으로 되돌렸습니다.");
    return true;
  };

MixerUI.prototype.clearStoredMixState = function() {
    try{
      const keysToRemove = [];
      for(let i = 0; i < localStorage.length; i++){
        const key = localStorage.key(i);
        if(!key) continue;
        if(
          key.startsWith("re_summer_arrangement_") ||
          key.startsWith("re_summer_track_settings_") ||
          key.startsWith("re_summer_guide_mix_")
        ){
          keysToRemove.push(key);
        }
      }
      for(const key of keysToRemove) localStorage.removeItem(key);
    } catch(error){}
  };

MixerUI.prototype.prepareFreshEditingSession = function() {
    this.stopTransport(true);
    this.soundManager.stopAll();
    this.clearStoredMixState();

    if (typeof player !== "undefined" && player.inventory) {
        // 1. BGM 트랙은 유지하고, 기존 효과음 트랙은 비웁니다.
        const bgmTrack = this.soundManager.bgmTrack;
        this.soundManager.tracks = bgmTrack ? [bgmTrack] : [];

        // 2. 플레이어 인벤토리에 들어있는 soundId 목록을 가져옵니다.
        const collectedIds = player.inventory.getAllIds(); // ['cricket', 'fan_hum', ...]

        // 3. 수집된 오디오 소스만 SoundManager에 다시 등록합니다.
        for (const soundId of collectedIds) {
            const libraryData = SOUND_LIBRARY[soundId];
            if (libraryData && libraryData.audio) {
                // 기존에 메인에서 등록하던 포맷과 동일하게 config를 생성하여 수집
                this.soundManager.collect({
                    id: soundId,
                    name: libraryData.name,
                    sceneName: "수집된 소리",
                    soundFile: libraryData.audio,
                    volume: 0.65,
                    rate: 1.0
                });
            }
        }
    }

    for(const track of this.soundManager.tracks){
      track.stop();
      track.masterVolume = track.defaultMasterVolume ?? 1.0;
      track.muted = false;
      track.solo = false;

      if(track.isBgm){
        track.clips = [];
        track.nextZIndex = 1;
        track.ensureMainBgmClip(null, true);
      } else {
        track.clips = [];
        track.nextZIndex = 1;
        track.saveClips();
      }

      track.saveTrackSettings();
    }

    this.playedClipIds.clear();
    this.activeEffectTracks.clear();
    this.selectedTrackIndex = 0;
    this.selectedClipUid = null;
    this.selectedClipUids = [];
    this.editingTrackIndex = -1;
    this.editingClipUid = null;
    this.draggingSlider = null;
    this.draggingTrackVolume = null;
    this.draggingClips = null;
    this.draggingPlayhead = false;
    this.draggingScrollbar = null;
    this.selectionBox = null;
    this.isSelectingBox = false;
    this.currentTimePositionSec = 0;
    this.lastTimePositionSec = 0;
    this.timelineScrollSec = 0;
    this.verticalScrollPx = 0;
    this.showGuideBanner = true;
    this.showFinishConfirm = false;
    this.finishConfirmYesRect = null;
    this.finishConfirmNoRect = null;
    this.showResetConfirm = false;
    this.resetConfirmYesRect = null;
    this.resetConfirmNoRect = null;
    this.syncTimelineToBgm(true);
    this.undoHistory = [];
    this.editingSessionPrepared = true;
  };

MixerUI.prototype.resetMix = function() {
    this.stopTransport(true);
    this.soundManager.stopAll();

    if (typeof player !== "undefined" && player.inventory) {
        const bgmTrack = this.soundManager.bgmTrack;
        const collectedIds = player.inventory.getAllIds();
        
        // BGM과 현재 수집된 아이템에 해당하는 트랙만 필터링하여 남깁니다.
        this.soundManager.tracks = this.soundManager.tracks.filter(track => {
            return track.isBgm || collectedIds.includes(track.id);
        });
    }

    for(const track of this.soundManager.tracks){
      track.masterVolume = track.defaultMasterVolume ?? 1.0;
      track.muted = false;
      track.solo = false;
      track.saveTrackSettings();

      if(track.isBgm){
        track.ensureMainBgmClip(null, true);
      } else {
        track.clips = [];
        track.nextZIndex = 1;
        track.saveClips();
      }
    }

    try{ localStorage.setItem("re_summer_guide_mix_initialized_v1", "1"); } catch(error){}

    this.selectedTrackIndex = 0;
    this.selectedClipUid = null;
    this.selectedClipUids = [];
    this.editingTrackIndex = -1;
    this.editingClipUid = null;
    this.draggingSlider = null;
    this.draggingTrackVolume = null;
    this.draggingPlayhead = false;
    this.selectionBox = null;
    this.isSelectingBox = false;
    this.currentTimePositionSec = 0;
    this.lastTimePositionSec = 0;
    this.timelineScrollSec = 0;
    this.verticalScrollPx = 0;
    this.showFinishConfirm = false;
    this.finishConfirmYesRect = null;
    this.finishConfirmNoRect = null;
    this.showResetConfirm = false;
    this.resetConfirmYesRect = null;
    this.resetConfirmNoRect = null;
    this.syncTimelineToBgm(true);
    this.soundManager.flashMessage("믹싱 조건을 초기화했습니다.");
  };

MixerUI.prototype.getBgmTimelineSeconds = function() {
    const bgmTrack = this.soundManager && this.soundManager.bgmTrack;
    if(bgmTrack && bgmTrack.clips && bgmTrack.clips[0]){
      return bgmTrack.getMainBgmDurationSeconds(bgmTrack.clips[0].rate);
    }
    if(bgmTrack) return bgmTrack.getMainBgmDurationSeconds(bgmTrack.defaultRate);
    return POST_EDIT_TIMELINE_SECONDS;
  };

MixerUI.prototype.syncTimelineToBgm = function(resetPlayhead = false) {
    const bgmTrack = this.soundManager && this.soundManager.bgmTrack;
    if(!bgmTrack) return;

    bgmTrack.ensureMainBgmClip(null, false);
    const bgmClip = bgmTrack.clips[0];
    if(!bgmClip) return;

    const nextTotalSeconds = bgmTrack.getMainBgmDurationSeconds(bgmClip.rate);
    bgmClip.startTimeSec = 0;
    bgmClip.lengthSeconds = nextTotalSeconds;
    bgmTrack.saveClips();

    this.totalSeconds = nextTotalSeconds;
    if(resetPlayhead) this.currentTimePositionSec = 0;
    else this.currentTimePositionSec = clamp(this.currentTimePositionSec, 0, Math.max(0, this.totalSeconds - 0.01));
    this.lastTimePositionSec = clamp(this.lastTimePositionSec, 0, this.totalSeconds);
    this.timelineScrollSec = clamp(this.timelineScrollSec, 0, Math.max(0, this.totalSeconds - this.visibleSeconds(this.getGridLayout())));
    this.clampScroll();
  };

MixerUI.prototype.createBpmInput = function() {
  };

MixerUI.prototype.commitBpmInput = function() {
  };

MixerUI.prototype.setBpm = function(value) {
    if(!Number.isFinite(value)) return;
    this.bpm = int(clamp(value, 40, 220));
  };

MixerUI.prototype.updateBpmInputPosition = function() {
  };

MixerUI.prototype.hideBpmInput = function() {
    if(this.bpmInput) this.bpmInput.hide();
  };

MixerUI.prototype.isClipSelected = function(uid) {
    return this.selectedClipUids.includes(uid) || this.selectedClipUid === uid;
  };

MixerUI.prototype.setSingleSelection = function(trackIndex, clipUid) {
    this.selectedTrackIndex = trackIndex;
    this.selectedClipUid = clipUid;
    this.selectedClipUids = clipUid ? [clipUid] : [];
  };

MixerUI.prototype.setMultiSelection = function(items) {
    this.selectedClipUids = items.map(item => item.clip.uid);
    if(items.length > 0){
      const last = items[items.length - 1];
      this.selectedTrackIndex = last.trackIndex;
      this.selectedClipUid = last.clip.uid;
    } else {
      this.selectedClipUid = null;
    }
  };

MixerUI.prototype.update = function() {
    if(!this.editingSessionPrepared) this.prepareFreshEditingSession();
    this.updateBpmInputPosition();
    this.drawBackground();
    this.updateTransport();
    if(this.draggingPlayhead) this.updatePlayheadDrag(true);

    if(this.soundManager.tracks.length === 0){
      this.drawEmptyState();
      return;
    }

    this.clampScroll();
    this.clampVerticalScroll();
    this.drawLayout();
    if(this.editingClip) this.drawClipEditWindow();
    if(this.showGuideBanner) this.drawGuideBanner();
    if(this.showFinishConfirm) this.drawFinishConfirmation();
    if(this.showResetConfirm) this.drawResetConfirmation();
  };

MixerUI.prototype.beatDurationSec = function() {
    return 60 / this.bpm;
  };

MixerUI.prototype.snapStepSec = function() {
    return this.beatDurationSec() / this.snapDivision;
  };

MixerUI.prototype.hasSoloTrack = function() {
    return this.soundManager.tracks.some(track => track.solo);
  };

MixerUI.prototype.isTrackAudible = function(track) {
    if(!track || track.muted) return false;
    if(this.hasSoloTrack()) return !!track.solo;
    return true;
  };

MixerUI.prototype.refreshTrackAudibility = function() {
    if(!this.isPlaying){
      for(const track of this.soundManager.tracks){
        if(!this.isTrackAudible(track)) track.stop();
      }
      return;
    }

    const resumeTime = clamp(this.currentTimePositionSec || 0, 0, Math.max(0, this.totalSeconds - 0.01));
    this.soundManager.stopAll();
    this.playedClipIds.clear();
    this.activeEffectTracks.clear();
    this.currentTimePositionSec = resumeTime;
    this.lastTimePositionSec = resumeTime;
    this.playStartTimeSec = resumeTime;
    this.playStartMillis = millis();
    this.triggerClipsAlreadyUnderPlayhead(resumeTime);
  };

MixerUI.prototype.getLayout = function() {
    const margin = 28;
    const top = 86;
    const leftW = 0;
    const timelineX = margin;
    const timelineW = width - margin * 2;
    const panelH = 560;
    return { margin, top, leftW, timelineX, timelineW, panelH };
  };

MixerUI.prototype.getGridLayout = function() {
    const layout = this.getLayout();
    const labelW = 172;
    const cellStartX = layout.timelineX + labelW;
    const timelineEndX = layout.timelineX + layout.timelineW - 38;
    const timelineInnerW = timelineEndX - cellStartX;
    const laneStartY = layout.top + 112;
    const scrollBarY = layout.top + layout.panelH - 26;
    const laneBottomY = scrollBarY - 16;
    return {
      x: layout.timelineX,
      y: layout.top,
      w: layout.timelineW,
      headerY: layout.top + 76,
      playheadHandleY: layout.top + 50,
      playheadHandleH: 20,
      laneStartY,
      laneBottomY,
      rowH: this.trackRowH,
      labelW,
      cellStartX,
      timelineEndX,
      timelineInnerW,
      laneH: Math.max(24, this.trackRowH - 10),
      scrollBarY,
      verticalBarX: layout.timelineX + layout.timelineW - 24,
      verticalBarY: laneStartY,
      verticalBarH: Math.max(40, laneBottomY - laneStartY)
    };
  };

MixerUI.prototype.visibleSeconds = function(grid = this.getGridLayout()) {
    return grid.timelineInnerW / this.pixelsPerSecond;
  };

MixerUI.prototype.trackContentHeight = function() {
    return this.soundManager.tracks.length * this.trackRowH;
  };

MixerUI.prototype.visibleTrackHeight = function(grid = this.getGridLayout()) {
    return Math.max(1, grid.laneBottomY - grid.laneStartY);
  };

MixerUI.prototype.timeToX = function(timeSec, grid = this.getGridLayout()) {
    return grid.cellStartX + (timeSec - this.timelineScrollSec) * this.pixelsPerSecond;
  };

MixerUI.prototype.xToTime = function(x, grid = this.getGridLayout()) {
    return this.timelineScrollSec + ((x - grid.cellStartX) / this.pixelsPerSecond);
  };

MixerUI.prototype.snapTime = function(timeSec) {
    const step = this.snapStepSec();
    return clamp(round(timeSec / step) * step, 0, this.totalSeconds);
  };

MixerUI.prototype.clampScroll = function() {
    const grid = this.getGridLayout();
    const maxScroll = Math.max(0, this.totalSeconds - this.visibleSeconds(grid));
    this.timelineScrollSec = clamp(this.timelineScrollSec, 0, maxScroll);
  };

MixerUI.prototype.clampVerticalScroll = function() {
    const grid = this.getGridLayout();
    const maxScroll = Math.max(0, this.trackContentHeight() - this.visibleTrackHeight(grid));
    this.verticalScrollPx = clamp(this.verticalScrollPx, 0, maxScroll);
  };

MixerUI.prototype.formatTime = function(sec) {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const remain = Math.floor(s % 60);
    return `${m}:${String(remain).padStart(2, "0")}`;
  };

MixerUI.prototype.pickMajorStep = function() {
    if(this.pixelsPerSecond >= 110) return 1;
    if(this.pixelsPerSecond >= 70) return 2;
    if(this.pixelsPerSecond >= 36) return 5;
    if(this.pixelsPerSecond >= 20) return 10;
    return 15;
  };

MixerUI.prototype.clipRectToVisible = function(rectInfo, grid) {
    const x1 = max(rectInfo.x, grid.cellStartX);
    const x2 = min(rectInfo.x + rectInfo.w, grid.timelineEndX);
    const y1 = max(rectInfo.y, grid.laneStartY);
    const y2 = min(rectInfo.y + rectInfo.h, grid.laneBottomY);
    return { x: x1, y: y1, w: max(1, x2 - x1), h: max(1, y2 - y1) };
  };

MixerUI.prototype.getClipHeight = function(grid = this.getGridLayout()) {
    return clamp(grid.rowH - 16, 20, this.maxTrackRowH - 14);
  };

MixerUI.prototype.getClipRect = function(trackIndex, clip, grid = this.getGridLayout()) {
    const rowY = grid.laneStartY + trackIndex * grid.rowH - this.verticalScrollPx;
    const x = this.timeToX(clip.startTimeSec, grid);
    const endTime = Math.min(clip.endTimeSec, this.totalSeconds);
    const w = Math.max(28, this.timeToX(endTime, grid) - x);
    const h = this.getClipHeight(grid);
    const y = rowY + Math.max(6, (grid.rowH - 10 - h) * 0.5);
    return { x, y, w, h };
  };

MixerUI.prototype.getPreviewClipRect = function(trackIndex, startTimeSec, lengthSeconds, grid = this.getGridLayout()) {
    const rowY = grid.laneStartY + trackIndex * grid.rowH - this.verticalScrollPx;
    const x = this.timeToX(startTimeSec, grid);
    const endTime = Math.min(startTimeSec + lengthSeconds, this.totalSeconds);
    const w = Math.max(28, this.timeToX(endTime, grid) - x);
    const h = this.getClipHeight(grid);
    const y = rowY + Math.max(6, (grid.rowH - 10 - h) * 0.5);
    return { x, y, w, h };
  };

MixerUI.prototype.getSourceIndexAtMouse = function() {
    const grid = this.getGridLayout();
    if(mouseX < grid.x + 14 || mouseX >= grid.cellStartX) return -1;
    if(mouseY < grid.laneStartY || mouseY > grid.laneBottomY) return -1;
    const contentY = mouseY - grid.laneStartY + this.verticalScrollPx;
    const index = Math.floor(contentY / grid.rowH);
    if(index < 0 || index >= this.soundManager.tracks.length) return -1;
    return index;
  };

MixerUI.prototype.getTrackControlAtMouse = function() {
    const grid = this.getGridLayout();
    for(let i = 0; i < this.soundManager.tracks.length; i++){
      const rowY = grid.laneStartY + i * grid.rowH - this.verticalScrollPx;
      if(rowY + grid.rowH < grid.laneStartY || rowY > grid.laneBottomY) continue;
      const nameY = rowY + Math.min(18, Math.max(13, grid.rowH * 0.28));
      const buttonSize = clamp(grid.rowH * 0.24, 16, 21);
      const buttonY = nameY - buttonSize / 2;
      const muteX = grid.x + grid.labelW - 62;
      const soloX = grid.x + grid.labelW - 36;
      if(pointInRect(mouseX, mouseY, muteX, buttonY, buttonSize, buttonSize)) return { type: "mute", trackIndex: i };
      if(pointInRect(mouseX, mouseY, soloX, buttonY, buttonSize, buttonSize)) return { type: "solo", trackIndex: i };
      if(grid.rowH >= 46){
        const slider = this.getTrackVolumeSliderRect(i, grid);
        if(pointInRect(mouseX, mouseY, slider.x - 8, slider.y - 8, slider.w + 16, slider.h + 16)) return { type: "volume", trackIndex: i, slider };
      }
    }
    return null;
  };

MixerUI.prototype.getLaneIndexAtMouse = function() {
    const grid = this.getGridLayout();
    if(mouseX < grid.cellStartX || mouseX > grid.timelineEndX) return -1;
    if(mouseY < grid.laneStartY || mouseY > grid.laneBottomY) return -1;
    const contentY = mouseY - grid.laneStartY + this.verticalScrollPx;
    const index = Math.floor(contentY / grid.rowH);
    if(index < 0 || index >= this.soundManager.tracks.length) return -1;
    return index;
  };

MixerUI.prototype.getTimeAtMouse = function() {
    const grid = this.getGridLayout();
    if(mouseX < grid.cellStartX || mouseX > grid.timelineEndX) return null;
    return this.xToTime(mouseX, grid);
  };

MixerUI.prototype.getClipAtMouse = function() {
    const grid = this.getGridLayout();
    for(let i = this.soundManager.tracks.length - 1; i >= 0; i--){
      const track = this.soundManager.tracks[i];
      const clips = [...track.clips].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
      for(const clip of clips){
        const rectInfo = this.clipRectToVisible(this.getClipRect(i, clip, grid), grid);
        if(pointInRect(mouseX, mouseY, rectInfo.x, rectInfo.y, rectInfo.w, rectInfo.h)){
          return { trackIndex: i, track, clip };
        }
      }
    }
    return null;
  };

MixerUI.prototype.pruneActiveEffectTracks = function(timeSec) {
    this.activeEffectTracks.clear();
  };

MixerUI.prototype.effectHeadroomGain = function(effectCount) {
    return 1;
  };

MixerUI.prototype.rebalanceActiveEffectGain = function(targetGain = null) {
  };

MixerUI.prototype.triggerClipEvents = function(events, timelineTimeSec) {
    if(!Array.isArray(events) || events.length === 0) return;

    for(const event of events){
      if(!event || !event.track || !event.clip) continue;
      const offset = Math.max(0, Number(event.offset) || 0);
      event.track.triggerClip(event.clip, offset, 1);
      this.playedClipIds.add(event.clip.uid);
    }
  };


MixerUI.prototype.updateTransport = function() {
    if(!this.isPlaying) return;

    const elapsedRealSec = (millis() - this.playStartMillis) / 1000;
    const timePosition = this.playStartTimeSec + elapsedRealSec * this.transportSpeedMultiplier();

    if(timePosition >= this.totalSeconds){
      if(this.totalSeconds <= 0.01){
        this.stopTransport(true);
        return;
      }
      this.stopTransport(true);
      this.timelineScrollSec = 0;
      this.lastTimePositionSec = 0;
      this.startTransport();
      return;
    }

    const prevPosition = this.lastTimePositionSec;
    this.currentTimePositionSec = timePosition;
    const events = [];

    for(const track of this.soundManager.tracks){
      if(!this.isTrackAudible(track)) continue;
      for(const clip of track.clips){
        if(this.playedClipIds.has(clip.uid)) continue;
        if(clip.startTimeSec >= prevPosition && clip.startTimeSec < timePosition + 0.006){
          events.push({ track, clip, offset: 0 });
        }
      }
    }

    this.triggerClipEvents(events, timePosition);
    this.updateMetronomeClicks(prevPosition, timePosition);

    this.lastTimePositionSec = timePosition;
    this.autoScrollDuringPlayback();
  };

MixerUI.prototype.transportSpeedMultiplier = function() {
    return 1;
  };

MixerUI.prototype.toggleMetronome = function() {
    this.metronomeEnabled = false;
  };

MixerUI.prototype.updateMetronomeClicks = function(prevPosition, timePosition) {
  };

MixerUI.prototype.playMetronomeClick = function(isDownbeat = false) {
  };

MixerUI.prototype.autoScrollDuringPlayback = function() {
    const grid = this.getGridLayout();
    const visibleEnd = this.timelineScrollSec + this.visibleSeconds(grid);
    if(this.currentTimePositionSec > visibleEnd - 1.5){
      this.timelineScrollSec = this.currentTimePositionSec - this.visibleSeconds(grid) * 0.35;
      this.clampScroll();
    }
  };

MixerUI.prototype.startTransport = function() {
    this.soundManager.stopAll();
    this.activeEffectTracks.clear();
    for(const track of this.soundManager.tracks){
      if(track.isBgm || !track.soundFile) continue;
      try{ track.soundFile.setVolume(1, 0.01); } catch(error){}
    }

    const startTime = clamp(this.currentTimePositionSec || 0, 0, Math.max(0, this.totalSeconds - 0.01));
    this.currentTimePositionSec = startTime;
    this.lastTimePositionSec = startTime;
    this.playStartTimeSec = startTime;
    this.timelineScrollSec = startTime;
    this.clampScroll();

    this.isPlaying = true;
    this.playStartMillis = millis();
    this.playedClipIds.clear();
    this.triggerClipsAlreadyUnderPlayhead(startTime);
    this.lastMetronomeBeatIndex = -1;
  };

MixerUI.prototype.triggerClipsAlreadyUnderPlayhead = function(timeSec) {
    const events = [];
    for(const track of this.soundManager.tracks){
      if(!this.isTrackAudible(track)) continue;
      for(const clip of track.clips){
        if(clip.startTimeSec <= timeSec && clip.endTimeSec > timeSec){
          events.push({ track, clip, offset: timeSec - clip.startTimeSec });
        }
      }
    }
    this.triggerClipEvents(events, timeSec);
  };

MixerUI.prototype.stopTransport = function(resetToStart = false) {
    this.isPlaying = false;
    if(resetToStart) this.currentTimePositionSec = 0;
    this.lastTimePositionSec = this.currentTimePositionSec || 0;
    this.playedClipIds.clear();
    this.activeEffectTracks.clear();
    this.lastMetronomeBeatIndex = Math.floor(this.lastTimePositionSec / this.beatDurationSec());
    this.soundManager.stopAll();
    for(const track of this.soundManager.tracks){
      if(track.isBgm || !track.soundFile) continue;
      try{ track.soundFile.setVolume(1, 0.02); } catch(error){}
    }
  };

MixerUI.prototype.toggleTransport = function() {
    this.isPlaying ? this.stopTransport(false) : this.startTransport();
  };

MixerUI.prototype.drawBackground = function() {
    background(29, 28, 34);
  };

MixerUI.prototype.drawEmptyState = function() {
    drawPanel(380, 230, 520, 220, "사운드 편집");
    push();
    fill(70, 50, 33);
    textAlign(CENTER, CENTER);
    textSize(17);
    text("등록된 사운드가 없습니다.", width / 2, height / 2);
    pop();
  };

MixerUI.prototype.drawLayout = function() {
    const layout = this.getLayout();
    this.drawHeader();
    drawPanel(layout.timelineX, layout.top, layout.timelineW, layout.panelH, "사운드 편집");
    this.drawArrangement(layout.timelineX, layout.top, layout.timelineW, layout.panelH);
  };

MixerUI.prototype.drawHeader = function() {
    push();
    noStroke();
    fill(44, 40, 52);
    rect(0, 0, width, 68);
    pop();

    drawSoftButton(28, 18, 80, 34, "재생", this.isPlaying);
    drawSoftButton(116, 18, 80, 34, "정지");
    drawSoftButton(208, 18, 98, 34, "삭제", !!this.selectedClip);
    drawSoftButton(318, 18, 100, 34, "확정");
    drawSoftButton(430, 18, 92, 34, "초기화");
    drawSoftButton(534, 18, 82, 34, "안내", this.showGuideBanner);
    this.drawBgmSelector();

    push();
    fill(255, 236, 199);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(12.5);
    text("가로", 1038, 34);
    text("세로", 1144, 34);
    pop();

    drawSoftButton(1068, 19, 32, 30, "−");
    drawSoftButton(1104, 19, 32, 30, "+");
    drawSoftButton(1176, 19, 32, 30, "−");
    drawSoftButton(1212, 19, 32, 30, "+");
  };

MixerUI.prototype.getGuidePanelRect = function() {
    return { x: 154, y: 78, w: 972, h: 558 };
  };

MixerUI.prototype.drawGuideBanner = function() {
    const panel = this.getGuidePanelRect();
    push();
    noStroke();
    fill(0, 166);
    rect(0, 0, width, height);
    pop();

    drawPanel(panel.x, panel.y, panel.w, panel.h, "인터페이스 안내");

    push();
    fill(62, 43, 29);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(22);
    text("할머니댁의 소리를 배치하고 편집해 나만의 음악을 만들어보세요.", panel.x + 34, panel.y + 54);

    const leftX = panel.x + 36;
    const rightX = panel.x + 506;
    const sectionY = panel.y + 112;
    const lineGap = 31;

    const drawGuideSection = (x, y, title, lines) => {
      fill(226, 137, 61);
      textStyle(BOLD);
      textSize(16);
      text(title, x, y);
      textStyle(NORMAL);
      textSize(13.5);
      textLeading(20);
      fill(82, 58, 39);
      for(let i = 0; i < lines.length; i++){
        const item = lines[i];
        fill(226, 137, 61);
        circle(x + 6, y + 38 + i * lineGap + 7, 6);
        fill(82, 58, 39);
        text(item, x + 18, y + 34 + i * lineGap, 400, 28);
      }
    };

    drawGuideSection(leftX, sectionY, "클립 배치와 선택", [
      "트랙 빈 공간 더블클릭: 해당 효과음 클립 추가",
      "클립 한 번 클릭: 선택 · 빈 공간 드래그: 여러 클립 선택",
      "클립을 왼쪽 버튼으로 누른 채 좌우로 끌어 위치 이동",
      "클립 오른쪽 클릭: 개별 효과 편집창 열기",
      "트랙 이름 클릭: 원본 사운드 한 번 미리듣기",
      "Delete / Backspace: 선택한 효과음 클립 삭제"
    ]);

    drawGuideSection(rightX, sectionY, "재생과 타임라인", [
      "상단 BGM 버튼: 기본 BGM과 귀여운 BGM 중 하나 선택",
      "시간 눈금 클릭: 재생바를 해당 위치로 즉시 이동",
      "재생 또는 Space: 재생 · 정지: 현재 위치에서 멈춤",
      "마우스 휠: 트랙 위아래 이동",
      "Shift + 휠 또는 가로 −/+: 시간 확대·축소",
      "세로 −/+: 트랙 높이 확대·축소"
    ]);

    drawGuideSection(leftX, sectionY + 230, "편집과 자르기", [
      "선택한 클립 위에 재생바를 놓고 Ctrl + C: 두 클립으로 자르기",
      "Ctrl + Z: 직전의 배치·이동·삭제·자르기·효과·음소거/솔로 작업 되돌리기",
      "M: 해당 트랙 음소거 · S: 해당 트랙만 듣기",
      "트랙 볼륨 슬라이더: 트랙 전체 소리 크기 조절"
    ]);

    drawGuideSection(rightX, sectionY + 230, "완성과 초기화", [
      "확정: 현재 만든 소리를 나만의 음악으로 최종 확정",
      "확인창에서 예: 마지막 감상 화면 · 아니오: 계속 편집",
      "초기화: BGM을 제외한 클립·음소거·솔로·볼륨 초기화",
      "안내 버튼: 이 안내 화면 다시 열기"
    ]);
    pop();

    this.guideCloseRect = { x: panel.x + panel.w - 150, y: panel.y + panel.h - 54, w: 116, h: 34 };
    drawSoftButton(this.guideCloseRect.x, this.guideCloseRect.y, this.guideCloseRect.w, this.guideCloseRect.h, "닫기");
  };

MixerUI.prototype.handleGuideMousePressed = function() {
    if(this.guideCloseRect && pointInRect(mouseX, mouseY, this.guideCloseRect.x, this.guideCloseRect.y, this.guideCloseRect.w, this.guideCloseRect.h)){
      this.showGuideBanner = false;
    }
    return false;
  };


MixerUI.prototype.requestFinishConfirmation = function() {
    this.stopTransport(false);
    this.soundManager.stopAll();
    this.showFinishConfirm = true;
    this.finishConfirmYesRect = null;
    this.finishConfirmNoRect = null;
  };

MixerUI.prototype.cancelFinishConfirmation = function() {
    this.showFinishConfirm = false;
    this.finishConfirmYesRect = null;
    this.finishConfirmNoRect = null;
  };

MixerUI.prototype.drawFinishConfirmation = function() {
    push();
    noStroke();
    fill(0, 178);
    rect(0, 0, width, height);
    pop();

    const panel = { x: width / 2 - 270, y: height / 2 - 145, w: 540, h: 290 };
    drawPanel(panel.x, panel.y, panel.w, panel.h, "FINAL CONFIRM");

    push();
    fill(67, 45, 29);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(23);
    text("나만의 음악으로 확정하시겠습니까?", width / 2, panel.y + 94);
    textStyle(NORMAL);
    textSize(14);
    fill(103, 72, 47);
    text("예를 누르면 마지막 감상 화면으로 이동합니다.", width / 2, panel.y + 137);
    text("아니오를 누르면 현재 편집 화면으로 돌아갑니다.", width / 2, panel.y + 162);
    pop();

    this.finishConfirmYesRect = { x: panel.x + 94, y: panel.y + 210, w: 150, h: 42 };
    this.finishConfirmNoRect = { x: panel.x + panel.w - 244, y: panel.y + 210, w: 150, h: 42 };
    drawSoftButton(this.finishConfirmYesRect.x, this.finishConfirmYesRect.y, this.finishConfirmYesRect.w, this.finishConfirmYesRect.h, "예", false);
    drawSoftButton(this.finishConfirmNoRect.x, this.finishConfirmNoRect.y, this.finishConfirmNoRect.w, this.finishConfirmNoRect.h, "아니오", false);
  };

MixerUI.prototype.handleFinishConfirmationMousePressed = function() {
    if(this.finishConfirmYesRect && pointInRect(mouseX, mouseY, this.finishConfirmYesRect.x, this.finishConfirmYesRect.y, this.finishConfirmYesRect.w, this.finishConfirmYesRect.h)){
      this.cancelFinishConfirmation();
      this.finishMix();
      return true;
    }
    if(this.finishConfirmNoRect && pointInRect(mouseX, mouseY, this.finishConfirmNoRect.x, this.finishConfirmNoRect.y, this.finishConfirmNoRect.w, this.finishConfirmNoRect.h)){
      this.cancelFinishConfirmation();
      return true;
    }
    return true;
  };

MixerUI.prototype.requestResetConfirmation = function() {
    this.stopTransport(false);
    this.soundManager.stopAll();
    this.showResetConfirm = true;
    this.resetConfirmYesRect = null;
    this.resetConfirmNoRect = null;
  };

MixerUI.prototype.cancelResetConfirmation = function() {
    this.showResetConfirm = false;
    this.resetConfirmYesRect = null;
    this.resetConfirmNoRect = null;
  };

MixerUI.prototype.drawResetConfirmation = function() {
    push();
    noStroke();
    fill(0, 158);
    rect(0, 0, width, height);
    pop();

    const panel = { x: width / 2 - 230, y: height / 2 - 112, w: 460, h: 224 };
    drawPanel(panel.x, panel.y, panel.w, panel.h, "RESET CONFIRM");

    push();
    fill(67, 45, 29);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(21);
    text("리셋하시겠습니까?", width / 2, panel.y + 76);
    textStyle(NORMAL);
    textSize(14);
    fill(103, 72, 47);
    text("BGM을 제외한 모든 사운드 요소가 삭제됩니다.", width / 2, panel.y + 116);
    pop();

    this.resetConfirmYesRect = { x: panel.x + 74, y: panel.y + 158, w: 132, h: 38 };
    this.resetConfirmNoRect = { x: panel.x + panel.w - 206, y: panel.y + 158, w: 132, h: 38 };
    drawSoftButton(this.resetConfirmYesRect.x, this.resetConfirmYesRect.y, this.resetConfirmYesRect.w, this.resetConfirmYesRect.h, "예", false);
    drawSoftButton(this.resetConfirmNoRect.x, this.resetConfirmNoRect.y, this.resetConfirmNoRect.w, this.resetConfirmNoRect.h, "아니오", false);
  };

MixerUI.prototype.handleResetConfirmationMousePressed = function() {
    if(this.resetConfirmYesRect && pointInRect(mouseX, mouseY, this.resetConfirmYesRect.x, this.resetConfirmYesRect.y, this.resetConfirmYesRect.w, this.resetConfirmYesRect.h)){
      this.cancelResetConfirmation();
      this.pushUndoState("reset");
      this.resetMix();
      return true;
    }
    if(this.resetConfirmNoRect && pointInRect(mouseX, mouseY, this.resetConfirmNoRect.x, this.resetConfirmNoRect.y, this.resetConfirmNoRect.w, this.resetConfirmNoRect.h)){
      this.cancelResetConfirmation();
      return true;
    }
    return true;
  };

MixerUI.prototype.drawBgmSelector = function() {
    this.bgmButtonRects = [];
    const options = this.soundManager && Array.isArray(this.soundManager.bgmOptions) ? this.soundManager.bgmOptions : [];
    const labels = ["기본 BGM", "귀여운 BGM"];
    const x = 630;
    const y = 18;
    const w = 142;
    const h = 34;
    const gap = 8;

    for(let i = 0; i < Math.min(options.length, 2); i++){
      const rectInfo = { x: x + i * (w + gap), y, w, h };
      this.bgmButtonRects.push(rectInfo);
      const active = this.soundManager.selectedBgmIndex === i;
      const option = options[i];
      const label = option && option.loading ? `${labels[i]} 로딩 중` : labels[i];
      drawSoftButton(rectInfo.x, rectInfo.y, rectInfo.w, rectInfo.h, label, active);
    }
  };

MixerUI.prototype.fitText = function(value, maxWidthValue) {
    let textValue = String(value || "");
    if(textWidth(textValue) <= maxWidthValue) return textValue;
    while(textValue.length > 1 && textWidth(textValue + "…") > maxWidthValue){
      textValue = textValue.slice(0, -1);
    }
    return textValue + "…";
  };

MixerUI.prototype.drawSourceList = function(x, y, w, h) {
    const rowH = 70;
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(x + 8, y + 42, w - 16, h - 54);
    drawingContext.clip();

    for(let i = 0; i < this.soundManager.tracks.length; i++){
      const track = this.soundManager.tracks[i];
      const rowY = y + 58 + i * rowH;
      if(rowY > y + h - 6 || rowY + rowH < y + 42) continue;
      const selected = i === this.selectedTrackIndex;

      noStroke();
      fill(selected ? color(255, 239, 198) : color(250, 241, 221));
      rect(x + 12, rowY, w - 24, rowH - 12, 12);
      fill(track.color[0], track.color[1], track.color[2]);
      rect(x + 24, rowY + 15, 34, 30, 8);

      fill(58, 40, 26);
      textAlign(LEFT, CENTER);
      textStyle(BOLD);
      textSize(12.5);
      text(this.fitText(track.name, w - 96), x + 70, rowY + 21);

      textStyle(NORMAL);
      textSize(10.5);
      fill(106, 78, 52);
      text(this.fitText(track.sceneName, w - 96), x + 70, rowY + 42);

      stroke(112, 82, 55, 70);
      strokeWeight(1);
      const dividerY = rowY + rowH - 6;
      line(x + 26, dividerY, x + w - 26, dividerY);
    }

    drawingContext.restore();
    pop();
  };

MixerUI.prototype.drawArrangement = function(x, y, w, h) {
    const grid = this.getGridLayout();

    this.drawPlayheadClickStrip(grid);
    this.drawTimeRuler(grid);
    this.drawTimelineGrid(grid);

    for(let i = 0; i < this.soundManager.tracks.length; i++){
      this.drawTrackLane(i, grid);
    }

    this.drawHorizontalScrollbar(grid);
    this.drawVerticalScrollbar(grid);

    if(this.currentTimePositionSec >= 0){
      this.drawPlayhead(grid);
    }

    if(this.isSelectingBox && this.selectionBox){
      this.drawSelectionBox();
    }
  };

MixerUI.prototype.drawPlayheadClickStrip = function(grid) {
    push();
    noStroke();
    fill(57, 48, 55, 170);
    rect(grid.cellStartX, grid.playheadHandleY, grid.timelineInnerW, grid.playheadHandleH, 8);

    const x = this.timeToX(this.currentTimePositionSec, grid);
    if(x >= grid.cellStartX && x <= grid.timelineEndX){
      fill(255, 201, 86);
      triangle(x - 7, grid.playheadHandleY + 2, x + 7, grid.playheadHandleY + 2, x, grid.playheadHandleY + 13);
    }
    pop();
  };

MixerUI.prototype.drawTimeRuler = function(grid) {
    const visibleStart = this.timelineScrollSec;
    const visibleEnd = this.timelineScrollSec + this.visibleSeconds(grid);
    const majorStep = this.pickMajorStep();
    const firstMajor = Math.floor(visibleStart / majorStep) * majorStep;

    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(grid.cellStartX, grid.headerY, grid.timelineInnerW, grid.laneBottomY - grid.headerY);
    drawingContext.clip();

    noStroke();
    fill(63, 54, 57, 190);
    rect(grid.cellStartX, grid.headerY, grid.timelineInnerW, 28);

    textAlign(CENTER, CENTER);
    textSize(10.5);
    for(let t = firstMajor; t <= visibleEnd + majorStep; t += majorStep){
      if(t < 0 || t > this.totalSeconds) continue;
      const x = this.timeToX(t, grid);
      stroke(255, 224, 145, 145);
      strokeWeight(1);
      line(x, grid.headerY, x, grid.headerY + 28);
      noStroke();
      fill(239, 221, 186);
      text(this.formatTime(t), x + 24, grid.headerY + 14);
    }

    drawingContext.restore();
    pop();
  };

MixerUI.prototype.drawTimelineGrid = function(grid) {
    const visibleStart = this.timelineScrollSec;
    const visibleEnd = this.timelineScrollSec + this.visibleSeconds(grid);
    const beatSec = this.beatDurationSec();
    const barSec = beatSec * 4;          
    const fourBarSec = barSec * 4;       
    const beatPx = beatSec * this.pixelsPerSecond;
    const barPx = barSec * this.pixelsPerSecond;
    const fourBarPx = fourBarSec * this.pixelsPerSecond;

    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(grid.cellStartX, grid.headerY + 28, grid.timelineInnerW, grid.laneBottomY - (grid.headerY + 28));
    drawingContext.clip();

    
    noStroke();
    fill(255, 245, 222, 10);
    rect(grid.cellStartX, grid.headerY + 28, grid.timelineInnerW, grid.laneBottomY - (grid.headerY + 28));

    const firstBeatIndex = Math.floor(visibleStart / beatSec) - 1;
    const lastBeatIndex = Math.ceil(visibleEnd / beatSec) + 1;

    for(let beatIndex = firstBeatIndex; beatIndex <= lastBeatIndex; beatIndex++){
      if(beatIndex < 0) continue;
      const t = beatIndex * beatSec;
      if(t < 0 || t > this.totalSeconds) continue;
      const x = this.timeToX(t, grid);

      const isFourBar = beatIndex % 16 === 0;
      const isBar = beatIndex % 4 === 0;

      if(isFourBar){
        if(fourBarPx < 16) continue;
        stroke(48, 35, 32, 190);
        strokeWeight(2.7);
      } else if(isBar){
        if(barPx < 14) continue;
        stroke(70, 48, 39, 146);
        strokeWeight(1.55);
      } else {
        if(beatPx < 8) continue;
        stroke(86, 63, 49, 78);
        strokeWeight(0.72);
      }
      line(x, grid.headerY + 28, x, grid.laneBottomY);
    }

    
    if(fourBarPx > 48){
      noStroke();
      fill(58, 42, 34, 190);
      textAlign(LEFT, CENTER);
      textSize(9.5);
      const firstFourBarIndex = Math.floor(visibleStart / fourBarSec) - 1;
      const lastFourBarIndex = Math.ceil(visibleEnd / fourBarSec) + 1;
      for(let fourIndex = firstFourBarIndex; fourIndex <= lastFourBarIndex; fourIndex++){
        if(fourIndex < 0) continue;
        const t = fourIndex * fourBarSec;
        if(t < 0 || t > this.totalSeconds) continue;
        const x = this.timeToX(t, grid);
        const barNumber = fourIndex * 4 + 1;
        text(`bar ${barNumber}`, x + 5, grid.headerY + 42);
      }
    }

    drawingContext.restore();
    pop();
  };

MixerUI.prototype.drawTrackLane = function(trackIndex, grid) {
    const track = this.soundManager.tracks[trackIndex];
    const rowY = grid.laneStartY + trackIndex * grid.rowH - this.verticalScrollPx;
    if(rowY + grid.rowH < grid.laneStartY || rowY > grid.laneBottomY) return;

    const selectedLane = trackIndex === this.selectedTrackIndex;
    const laneHover = this.getLaneIndexAtMouse() === trackIndex;
    const visibleY = Math.max(rowY, grid.laneStartY);
    const visibleBottom = Math.min(rowY + grid.rowH - 10, grid.laneBottomY);
    const visibleH = Math.max(1, visibleBottom - visibleY);

    push();
    noStroke();
    fill(selectedLane || laneHover ? color(255, 239, 202, 235) : color(249, 239, 219, 224));
    rect(grid.x + 14, visibleY, grid.w - 42, visibleH, 10);

    
    stroke(93, 68, 45, 58);
    strokeWeight(1);
    const topDividerY = max(rowY, grid.laneStartY);
    line(grid.x + 18, topDividerY, grid.timelineEndX, topDividerY);
    noStroke();

    this.drawTrackHeaderControls(trackIndex, track, grid, rowY);

    stroke(142, 111, 78, 80);
    strokeWeight(1);
    const lineY = Math.min(rowY + grid.rowH - 10, grid.laneBottomY);
    if(lineY >= grid.laneStartY) line(grid.cellStartX, lineY, grid.timelineEndX, lineY);

    const clips = [...track.clips].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    for(const clip of clips){
      this.drawClip(trackIndex, track, clip, grid, rowY);
    }

    const timeUnderMouse = this.getTimeAtMouse();
    if(laneHover && timeUnderMouse !== null){
      const snap = this.snapTime(timeUnderMouse);
      const previewRect = this.getPreviewClipRect(trackIndex, snap, track.getDefaultClipLengthSeconds(), grid);
      const clippedPreview = this.clipRectToVisible(previewRect, grid);
      if(clippedPreview.w > 2 && clippedPreview.h > 2){
        noFill();
        stroke(92, 61, 36, 150);
        strokeWeight(2);
        rect(clippedPreview.x + 0.5, clippedPreview.y + 0.5, clippedPreview.w - 1, clippedPreview.h - 1, 6);
      }
    }
    pop();
  };

MixerUI.prototype.drawTrackHeaderControls = function(trackIndex, track, grid, rowY) {
    const labelTop = rowY + 10;
    const labelBottom = rowY + grid.rowH - 16;
    if(labelBottom < grid.laneStartY || labelTop > grid.laneBottomY) return;

    const nameY = rowY + Math.min(18, Math.max(13, grid.rowH * 0.28));
    const textSizeValue = clamp(grid.rowH * 0.17, 8.5, 12.5);
    const buttonSize = clamp(grid.rowH * 0.24, 16, 21);
    const buttonY = nameY - buttonSize / 2;
    const muteX = grid.x + grid.labelW - 62;
    const soloX = grid.x + grid.labelW - 36;
    const nameX = grid.x + 28;
    const nameMaxW = Math.max(44, muteX - nameX - 8);

    push();
    if(nameY >= grid.laneStartY && nameY <= grid.laneBottomY){
      fill(63, 45, 30);
      textAlign(LEFT, CENTER);
      textStyle(BOLD);
      textSize(textSizeValue);
      text(this.fitText(track.name, nameMaxW), nameX, nameY);
      if(track.isBgm && grid.rowH >= 58){
        textStyle(NORMAL);
        textSize(clamp(grid.rowH * 0.13, 7.5, 10));
        fill(100, 72, 46);
        text(this.fitText(track.sceneName, grid.labelW - 52), nameX, nameY + clamp(grid.rowH * 0.24, 12, 18));
        fill(63, 45, 30);
        textStyle(BOLD);
      }

      this.drawSmallTrackButton(muteX, buttonY, buttonSize, buttonSize, "M", track.muted);
      this.drawSmallTrackButton(soloX, buttonY, buttonSize, buttonSize, "S", track.solo);
    }

    if(grid.rowH >= 46){
      const slider = this.getTrackVolumeSliderRect(trackIndex, grid);
      const knobX = slider.x + track.masterVolume * slider.w;
      if(slider.y >= grid.laneStartY && slider.y + slider.h <= grid.laneBottomY){
        stroke(111, 82, 55, 120);
        strokeWeight(3);
        line(slider.x, slider.y + slider.h / 2, slider.x + slider.w, slider.y + slider.h / 2);
        stroke(232, 157, 70, 230);
        line(slider.x, slider.y + slider.h / 2, knobX, slider.y + slider.h / 2);
        noStroke();
        fill(255, 236, 163);
        circle(knobX, slider.y + slider.h / 2, clamp(grid.rowH * 0.24, 12, 18));
        fill(74, 52, 33);
        circle(knobX, slider.y + slider.h / 2, clamp(grid.rowH * 0.09, 4, 7));
      }
    }

    if(track.muted || (this.hasSoloTrack() && !track.solo)){
      noStroke();
      fill(28, 24, 27, 82);
      rect(grid.x + 14, Math.max(rowY, grid.laneStartY), grid.w - 42, Math.max(1, Math.min(rowY + grid.rowH - 10, grid.laneBottomY) - Math.max(rowY, grid.laneStartY)), 10);
    }
    pop();
  };

MixerUI.prototype.drawSmallTrackButton = function(x, y, w, h, label, active) {
    const hover = pointInRect(mouseX, mouseY, x, y, w, h);
    push();
    noStroke();
    fill(active ? color(238, 158, 68) : hover ? color(255, 228, 174) : color(228, 211, 184));
    rect(x, y, w, h, 5);
    fill(active ? color(255, 248, 220) : color(70, 49, 32));
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(clamp(h * 0.55, 9, 12));
    text(label, x + w / 2, y + h / 2 + 0.5);
    pop();
  };

MixerUI.prototype.drawClip = function(trackIndex, track, clip, grid, rowY) {
    const rectInfo = this.getClipRect(trackIndex, clip, grid);
    if(rectInfo.x + rectInfo.w < grid.cellStartX || rectInfo.x > grid.timelineEndX) return;

    const clipped = this.clipRectToVisible(rectInfo, grid);
    const selectedClip = this.isClipSelected(clip.uid);
    const hover = pointInRect(mouseX, mouseY, clipped.x, clipped.y, clipped.w, clipped.h);

    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(grid.cellStartX, grid.laneStartY, grid.timelineInnerW, grid.laneBottomY - grid.laneStartY);
    drawingContext.clip();

    noStroke();
    fill(track.color[0], track.color[1], track.color[2], selectedClip || hover ? 255 : 232);
    rect(rectInfo.x, rectInfo.y, rectInfo.w, rectInfo.h, 8);

    noFill();
    stroke(48, 34, 24, 170);
    strokeWeight(1.4);
    rect(rectInfo.x + 0.5, rectInfo.y + 0.5, rectInfo.w - 1, rectInfo.h - 1, 8);

    this.drawClipWaveform(track, clip, rectInfo, grid);

    if(clip.delayWet > 0.05 || clip.reverbWet > 0.05 || clip.reverseMode || abs(clip.rate - 1) > 0.02){
      noStroke();
      fill(255, 231, 128);
      circle(min(rectInfo.x + rectInfo.w - 12, grid.timelineEndX - 12), rectInfo.y + 11, 8);
    }

    if(selectedClip){
      noFill();
      stroke(255, 248, 203);
      strokeWeight(2);
      rect(rectInfo.x + 1, rectInfo.y + 1, rectInfo.w - 2, rectInfo.h - 2, 8);
    }
    drawingContext.restore();
    pop();
  };

MixerUI.prototype.drawClipWaveform = function(track, clip, rectInfo, grid) {
    const visibleX1 = max(rectInfo.x + 2, grid.cellStartX + 1);
    const visibleX2 = min(rectInfo.x + rectInfo.w - 2, grid.timelineEndX - 1);
    const visibleY1 = max(rectInfo.y + 1, grid.laneStartY + 1);
    const visibleY2 = min(rectInfo.y + rectInfo.h - 1, grid.laneBottomY - 1);
    if(visibleX2 <= visibleX1 || visibleY2 <= visibleY1) return;

    const bounds = track.getClipSourceBounds ? track.getClipSourceBounds(clip) : {
      fileDuration: Math.max(0.02, clip.lengthSeconds),
      startSec: 0,
      endSec: Math.max(0.02, clip.lengthSeconds)
    };
    const sourceStartRatio = clamp(bounds.startSec / Math.max(0.001, bounds.fileDuration), 0, 1);
    const sourceEndRatio = clamp(bounds.endSec / Math.max(0.001, bounds.fileDuration), 0, 1);
    const peakCount = Math.max(256, int(rectInfo.w * 2.6));
    const peaks = track.getPeaks(peakCount);

    const padX = clamp(rectInfo.w * 0.018, 2, 5);
    const padY = clamp(rectInfo.h * 0.025, 1, 3.5);
    const left = rectInfo.x + padX;
    const right = rectInfo.x + rectInfo.w - padX;
    const top = rectInfo.y + padY;
    const bottom = rectInfo.y + rectInfo.h - padY;
    const midY = (top + bottom) * 0.5;
    const ampMax = Math.max(2, (bottom - top) * 0.485);

    const maxPeak = peaks.length > 0 ? peaks.reduce((m, v) => Math.max(m, abs(v)), 0) : 0;
    const samplePeak = x => {
      if(peaks.length <= 1 || maxPeak <= 0.0001 || right <= left) return 0;
      const timelineRatio = clamp((x - left) / (right - left), 0, 1);
      const sourceRatio = clip.reverseMode
        ? lerp(sourceEndRatio, sourceStartRatio, timelineRatio)
        : lerp(sourceStartRatio, sourceEndRatio, timelineRatio);
      const rawIndex = clamp(sourceRatio * (peaks.length - 1), 0, peaks.length - 1);
      const indexA = Math.floor(rawIndex);
      const indexB = Math.min(peaks.length - 1, indexA + 1);
      const mix = rawIndex - indexA;
      const peakValue = lerp(abs(peaks[indexA]), abs(peaks[indexB]), mix);
      return Math.pow(clamp(peakValue / maxPeak, 0, 1), 0.55);
    };

    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(visibleX1, visibleY1, visibleX2 - visibleX1, visibleY2 - visibleY1);
    drawingContext.clip();

    stroke(255, 246, 214, 92);
    strokeWeight(1);
    line(visibleX1, midY, visibleX2, midY);

    if(peaks.length > 1 && right > left){
      const step = max(1, int((visibleX2 - visibleX1) / 180));
      noStroke();
      fill(255, 247, 220, 218);
      beginShape();
      for(let x = visibleX1; x <= visibleX2; x += step){
        const amp = samplePeak(x);
        vertex(x, midY - Math.max(1.4, amp * ampMax));
      }
      vertex(visibleX2, midY - Math.max(1.4, samplePeak(visibleX2) * ampMax));
      vertex(visibleX2, midY + Math.max(1.4, samplePeak(visibleX2) * ampMax));
      for(let x = visibleX2; x >= visibleX1; x -= step){
        const amp = samplePeak(x);
        vertex(x, midY + Math.max(1.4, amp * ampMax));
      }
      endShape(CLOSE);

      stroke(255, 255, 238, 242);
      strokeWeight(clamp(rectInfo.h / 62, 1.15, 3.1));
      noFill();
      beginShape();
      for(let x = visibleX1; x <= visibleX2; x += step){
        const amp = samplePeak(x);
        vertex(x, midY - Math.max(1.4, amp * ampMax));
      }
      endShape();
      beginShape();
      for(let x = visibleX1; x <= visibleX2; x += step){
        const amp = samplePeak(x);
        vertex(x, midY + Math.max(1.4, amp * ampMax));
      }
      endShape();
    } else {
      stroke(255, 247, 220, 220);
      strokeWeight(1.4);
      line(visibleX1, midY, visibleX2, midY);
    }
    drawingContext.restore();
    pop();
  };

MixerUI.prototype.drawPlayhead = function(grid) {
    const x = this.timeToX(this.currentTimePositionSec, grid);
    if(x < grid.cellStartX || x > grid.timelineEndX) return;
    const y1 = grid.headerY - 6;
    const y2 = grid.laneBottomY;
    push();
    stroke(255, 201, 86);
    strokeWeight(3);
    line(x, y1, x, y2);
    noStroke();
    fill(255, 201, 86);
    triangle(x - 7, y1 - 1, x + 7, y1 - 1, x, y1 + 10);
    pop();
  };

MixerUI.prototype.drawHorizontalScrollbar = function(grid) {
    const barX = grid.cellStartX;
    const barY = grid.scrollBarY;
    const barW = grid.timelineInnerW;
    const visible = this.visibleSeconds(grid);
    const ratio = clamp(visible / this.totalSeconds, 0.04, 1);
    const knobW = max(36, barW * ratio);
    const maxScroll = max(0, this.totalSeconds - visible);
    const knobX = maxScroll === 0 ? barX : barX + (this.timelineScrollSec / maxScroll) * (barW - knobW);

    this.horizontalScrollbarRect = { barX, barY, barW, barH: 10, knobX, knobY: barY - 1, knobW, knobH: 10, maxScroll };

    push();
    noStroke();
    fill(120, 95, 66, 90);
    rect(barX, barY, barW, 8, 6);
    fill(245, 185, 93, 220);
    rect(knobX, barY - 1, knobW, 10, 6);
    pop();
  };

MixerUI.prototype.drawVerticalScrollbar = function(grid) {
    const barX = grid.verticalBarX;
    const barY = grid.verticalBarY;
    const barW = 10;
    const barH = grid.verticalBarH;
    const contentH = this.trackContentHeight();
    const visibleH = this.visibleTrackHeight(grid);
    const ratio = clamp(visibleH / Math.max(1, contentH), 0.08, 1);
    const knobH = max(34, barH * ratio);
    const maxScroll = max(0, contentH - visibleH);
    const knobY = maxScroll === 0 ? barY : barY + (this.verticalScrollPx / maxScroll) * (barH - knobH);

    this.verticalScrollbarRect = { barX, barY, barW, barH, knobX: barX, knobY, knobW: barW, knobH, maxScroll };

    push();
    noStroke();
    fill(120, 95, 66, 90);
    rect(barX, barY, barW, barH, 6);
    fill(245, 185, 93, 220);
    rect(barX, knobY, barW, knobH, 6);
    pop();
  };

MixerUI.prototype.drawMiniWaveform = function(track, x, y, w, h) {
    const safeH = Math.max(4, h);
    const peaks = track.getPeaks(28);
    push();
    stroke(115, 83, 55, 105);
    strokeWeight(1);
    noFill();
    rect(x, y, w, safeH, 4);
    const midY = y + safeH / 2;
    if(peaks.length > 0){
      stroke(track.color[0], track.color[1], track.color[2], 210);
      strokeWeight(1);
      for(let i = 0; i < peaks.length; i++){
        const px = map(i, 0, peaks.length - 1, x + 3, x + w - 3);
        const amp = Math.pow(clamp(abs(peaks[i]), 0, 1), 0.75);
        const halfH = Math.max(1, amp * safeH * 0.43);
        line(px, midY - halfH, px, midY + halfH);
      }
    }
    pop();
  };

MixerUI.prototype.drawClipEditWindow = function() {
    const track = this.editingTrack;
    const clip = this.editingClip;
    if(!track || !clip) return;

    const modal = this.getClipEditWindowRect();
    const controlW = 500;
    const helpX = modal.x + 600;
    const helpW = modal.w - 636;
    push();
    noStroke();
    fill(0, 155);
    rect(0, 0, width, height);
    pop();

    drawPanel(modal.x, modal.y, modal.w, modal.h, "클립 편집");

    push();
    fill(61, 42, 28);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(19);
    text(`${track.name} · ${this.formatTime(clip.startTimeSec)}`, modal.x + 28, modal.y + 62);
    fill(track.color[0], track.color[1], track.color[2]);
    rect(modal.x + modal.w - 112, modal.y + 58, 62, 28, 8);
    pop();

    this.sliderDefs = [
      { label: "볼륨", prop: "volume", min: 0, max: 1, x: modal.x + 44, y: modal.y + 116, w: controlW },
      { label: track.isBgm ? "BGM 속도 / 음높이" : "속도 / 음높이", prop: "rate", min: 0.5, max: 1.8, x: modal.x + 44, y: modal.y + 158, w: controlW },
      { label: "좌우 위치", prop: "panValue", min: -1, max: 1, x: modal.x + 44, y: modal.y + 200, w: controlW },
      { label: "저역 통과 필터", prop: "lowPassFreq", min: 400, max: 10000, x: modal.x + 44, y: modal.y + 242, w: controlW },
      { label: "딜레이", prop: "delayWet", min: 0, max: 0.85, x: modal.x + 44, y: modal.y + 284, w: controlW },
      { label: "리버브", prop: "reverbWet", min: 0, max: 0.85, x: modal.x + 44, y: modal.y + 326, w: controlW }
    ];

    for(const def of this.sliderDefs){
      this.drawSlider(def, clip[def.prop]);
    }

    this.drawToggle(modal.x + 44, modal.y + 386, controlW, 34, "역재생", clip.reverseMode);

    if(!track.isBgm){
      push();
      fill(92, 65, 43);
      textAlign(LEFT, CENTER);
      textStyle(BOLD);
      textSize(12.5);
      text(`클립 길이  ${nf(clip.lengthSeconds, 1, 2)} s`, modal.x + 44, modal.y + 444);
      textStyle(NORMAL);
      fill(112, 82, 55);
      textSize(11.5);
      text("메인 화면에서 클립 선택 → 재생바 이동 → Ctrl + C로 자르기", modal.x + 44, modal.y + 470);
      pop();
    }

    push();
    noStroke();
    fill(247, 235, 214);
    rect(helpX, modal.y + 96, helpW, 452, 14);
    fill(69, 48, 32);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(15);
    text("효과 설명", helpX + 18, modal.y + 112);

    const helpItems = [
      ["볼륨", "선택한 클립의 소리 크기를 조절합니다."],
      ["속도 / 음높이", "재생 속도와 음높이를 함께 바꿉니다. 1.00이 원본입니다."],
      ["좌우 위치", "소리가 들리는 위치를 왼쪽(-) 또는 오른쪽(+)으로 이동합니다."],
      ["저역 통과 필터", "고음역을 줄여 소리를 부드럽거나 먹먹하게 만듭니다."],
      ["딜레이", "원래 소리 뒤에 시간차를 둔 반복음을 추가합니다."],
      ["리버브", "방이나 공간에서 울리는 듯한 잔향을 추가합니다."],
      ["역재생", "소리를 뒤에서 앞으로 재생합니다."],
      ["자르기", "메인 화면에서 Ctrl + C를 눌러 재생바 위치에서 클립을 나눕니다."]
    ];

    let helpY = modal.y + 144;
    for(const item of helpItems){
      fill(101, 67, 41);
      textStyle(BOLD);
      textSize(12.5);
      text(item[0], helpX + 18, helpY);
      fill(92, 70, 51);
      textStyle(NORMAL);
      textSize(11.3);
      textLeading(15);
      text(item[1], helpX + 18, helpY + 17, helpW - 36, 36);
      helpY += 50;
    }
    pop();

    const previewing = track && typeof track.isAnyVoicePlaying === "function" && track.isAnyVoicePlaying();
    drawSoftButton(modal.x + 44, modal.y + modal.h - 50, 148, 34, previewing ? "미리듣기 정지" : "미리듣기");
    drawSoftButton(modal.x + modal.w - 140, modal.y + modal.h - 50, 96, 34, "닫기");
  };

MixerUI.prototype.drawSlider = function(def, value) {
    const ratio = clamp((value - def.min) / (def.max - def.min), 0, 1);
    const knobX = def.x + ratio * def.w;

    push();
    fill(66, 47, 32);
    textAlign(LEFT, CENTER);
    textSize(13);
    text(def.label, def.x, def.y - 17);
    textAlign(RIGHT, CENTER);
    textSize(12);
    text(this.formatValue(def, value), def.x + def.w, def.y - 17);

    stroke(139, 103, 70);
    strokeWeight(4);
    line(def.x, def.y, def.x + def.w, def.y);
    stroke(237, 158, 76);
    line(def.x, def.y, knobX, def.y);
    noStroke();
    fill(255, 232, 153);
    circle(knobX, def.y, 18);
    fill(91, 64, 41);
    circle(knobX, def.y, 6);
    pop();
  };

MixerUI.prototype.drawToggle = function(x, y, w, h, label, active) {
    const hover = pointInRect(mouseX, mouseY, x, y, w, h);
    push();
    noStroke();
    fill(active ? color(244, 177, 88) : hover ? color(255, 232, 180) : color(240, 226, 202));
    rect(x, y, w, h, 10);
    fill(64, 43, 28);
    textAlign(LEFT, CENTER);
    textSize(13);
    text(`${label}: ${active ? "ON" : "OFF"}`, x + 16, y + h / 2);
    pop();
  };

MixerUI.prototype.formatValue = function(def, value) {
    if(def.prop === "rate") return `${nf(value, 1, 2)} x`;
    if(def.prop === "lowPassFreq") return `${int(value)} Hz`;
    if(def.prop === "panValue") return nf(value, 1, 2);
    if(def.prop === "lengthSeconds" || def.prop === "trimStartSec" || def.prop === "trimEndSec") return `${nf(value, 1, 2)} s`;
    return nf(value, 1, 2);
  };

MixerUI.prototype.drawSelectionBox = function() {
    const box = this.getNormalizedSelectionBox();
    push();
    noStroke();
    fill(255, 201, 86, 38);
    rect(box.x, box.y, box.w, box.h, 3);
    noFill();
    stroke(255, 201, 86, 210);
    strokeWeight(1.5);
    rect(box.x, box.y, box.w, box.h, 3);
    pop();
  };

MixerUI.prototype.getTrackVolumeSliderRect = function(trackIndex, grid = this.getGridLayout()) {
    const rowY = grid.laneStartY + trackIndex * grid.rowH - this.verticalScrollPx;
    const y = rowY + Math.max(29, grid.rowH * 0.62);
    return { x: grid.x + 28, y, w: Math.max(90, grid.labelW - 56), h: 16 };
  };

MixerUI.prototype.getClipEditWindowRect = function() {
    return { x: 150, y: 24, w: 980, h: 672 };
  };

MixerUI.prototype.mousePressed = function() {
    if(this.soundManager.tracks.length === 0) return;

    if(this.showFinishConfirm){
      this.handleFinishConfirmationMousePressed();
      return false;
    }

    if(this.showResetConfirm){
      this.handleResetConfirmationMousePressed();
      return false;
    }

    if(this.showGuideBanner){
      this.handleGuideMousePressed();
      return false;
    }

    if(mouseButton === RIGHT){
      this.handleRightClick();
      return false;
    }

    if(this.editingClip){
      this.handleEditWindowMousePressed();
      return;
    }

    if(pointInRect(mouseX, mouseY, 28, 18, 80, 34)){
      if(!this.isPlaying) this.startTransport();
      return;
    }
    if(pointInRect(mouseX, mouseY, 116, 18, 80, 34)){
      this.stopTransport(false);
      return;
    }
    if(pointInRect(mouseX, mouseY, 208, 18, 98, 34)){
      this.removeSelectedClip();
      return;
    }
    if(pointInRect(mouseX, mouseY, 318, 18, 100, 34)){
      this.requestFinishConfirmation();
      return;
    }
    if(pointInRect(mouseX, mouseY, 430, 18, 92, 34)){
      this.requestResetConfirmation();
      return;
    }
    if(pointInRect(mouseX, mouseY, 534, 18, 82, 34)){
      this.showGuideBanner = true;
      return;
    }
    const bgmButtonIndex = this.getBgmButtonIndexAtMouse();
    if(bgmButtonIndex !== -1){
      this.selectBgmOption(bgmButtonIndex);
      return;
    }
    if(pointInRect(mouseX, mouseY, 1068, 19, 32, 30)){
      this.zoomBy(0.78);
      return;
    }
    if(pointInRect(mouseX, mouseY, 1104, 19, 32, 30)){
      this.zoomBy(1.28);
      return;
    }
    if(pointInRect(mouseX, mouseY, 1176, 19, 32, 30)){
      this.zoomVerticalBy(0.82);
      return;
    }
    if(pointInRect(mouseX, mouseY, 1212, 19, 32, 30)){
      this.zoomVerticalBy(1.22);
      return;
    }

    if(this.beginScrollbarDrag()) return;

    const trackControl = this.getTrackControlAtMouse();
    if(trackControl){
      this.handleTrackControlMousePressed(trackControl);
      return;
    }

    const clipHit = this.getClipAtMouse();
    if(clipHit){
      if(clipHit.track.isBgm){
        this.setSingleSelection(clipHit.trackIndex, clipHit.clip.uid);
      } else {
        this.beginClipDrag(clipHit);
      }
      return;
    }

    if(this.beginPlayheadDrag()) return;

    const sourceIndex = this.getSourceIndexAtMouse();
    if(sourceIndex !== -1){
      this.focusTrackInArrangement(sourceIndex);
      this.previewSourceAt(sourceIndex);
      return;
    }

    if(this.beginMarqueeSelection()) return;
  };

MixerUI.prototype.getBgmButtonIndexAtMouse = function() {
    if(!this.bgmButtonRects) return -1;
    for(let i = 0; i < this.bgmButtonRects.length; i++){
      const r = this.bgmButtonRects[i];
      if(pointInRect(mouseX, mouseY, r.x, r.y, r.w, r.h)) return i;
    }
    return -1;
  };

MixerUI.prototype.selectBgmOption = function(index) {
    if(index === this.soundManager.selectedBgmIndex) return;
    const undoState = this.captureUndoState();
    const wasPlaying = this.isPlaying;
    const resumeTime = this.currentTimePositionSec;
    if(wasPlaying) this.stopTransport(false);
    const track = this.soundManager.selectBgmOption(index);
    if(track){
      this.pushUndoState("bgm-change", undoState);
      this.syncTimelineToBgm(true);
      this.selectedTrackIndex = 0;
      this.selectedClipUid = track.clips[0] ? track.clips[0].uid : null;
      this.selectedClipUids = this.selectedClipUid ? [this.selectedClipUid] : [];
      this.verticalScrollPx = 0;
      this.soundManager.flashMessage(index === 1 ? "귀여운 BGM을 선택했습니다." : "기본 BGM을 선택했습니다.");
      if(wasPlaying){
        this.currentTimePositionSec = clamp(resumeTime, 0, Math.max(0, this.totalSeconds - 0.01));
        this.startTransport();
      }
    } else if(wasPlaying){
      this.currentTimePositionSec = resumeTime;
      this.startTransport();
    }
  };

MixerUI.prototype.handleTrackControlMousePressed = function(control) {
    const track = this.soundManager.tracks[control.trackIndex];
    if(!track) return;
    this.selectedTrackIndex = control.trackIndex;

    if(control.type === "mute"){
      this.pushUndoState("mute");
      track.toggleMute();
      this.refreshTrackAudibility();
      return;
    }
    if(control.type === "solo"){
      this.pushUndoState("solo");
      track.toggleSolo();
      this.refreshTrackAudibility();
      return;
    }
    if(control.type === "volume"){
      this.pushUndoState("track-volume");
      this.draggingTrackVolume = { trackIndex: control.trackIndex };
      this.updateTrackVolumeByMouse(control.trackIndex);
    }
  };

MixerUI.prototype.beginClipDrag = function(clipHit) {
    if(!clipHit || !clipHit.track || !clipHit.clip || clipHit.track.isBgm) return false;

    if(!this.isClipSelected(clipHit.clip.uid)){
      this.setSingleSelection(clipHit.trackIndex, clipHit.clip.uid);
    }

    const selectedIds = this.selectedClipUids.length > 0 ? [...this.selectedClipUids] : [clipHit.clip.uid];
    const items = [];
    for(let trackIndex = 0; trackIndex < this.soundManager.tracks.length; trackIndex++){
      const track = this.soundManager.tracks[trackIndex];
      if(track.isBgm) continue;
      for(const uid of selectedIds){
        const clip = track.getClipByUid(uid);
        if(clip){
          items.push({ trackIndex, track, clip, originalStartTimeSec: clip.startTimeSec });
        }
      }
    }
    if(items.length === 0) return false;

    this.draggingClips = {
      startMouseX: mouseX,
      anchorOriginalStartTimeSec: clipHit.clip.startTimeSec,
      items,
      undoState: this.captureUndoState(),
      moved: false
    };
    return true;
  };

MixerUI.prototype.updateClipDrag = function() {
    const drag = this.draggingClips;
    if(!drag || !Array.isArray(drag.items) || drag.items.length === 0) return;

    const pixelDelta = mouseX - drag.startMouseX;
    if(!drag.moved && Math.abs(pixelDelta) < 4) return;
    drag.moved = true;

    const rawAnchor = drag.anchorOriginalStartTimeSec + pixelDelta / Math.max(1, this.pixelsPerSecond);
    const snappedAnchor = this.snapTime(rawAnchor);
    let delta = snappedAnchor - drag.anchorOriginalStartTimeSec;
    const minStart = Math.min(...drag.items.map(item => item.originalStartTimeSec));
    const maxEnd = Math.max(...drag.items.map(item => item.originalStartTimeSec + item.clip.lengthSeconds));
    delta = clamp(delta, -minStart, Math.max(-minStart, this.totalSeconds - maxEnd));

    for(const item of drag.items){
      item.clip.startTimeSec = item.originalStartTimeSec + delta;
    }
  };

MixerUI.prototype.finishClipDrag = function() {
    const drag = this.draggingClips;
    this.draggingClips = null;
    if(!drag || !drag.moved) return false;

    const touchedTracks = new Set();
    for(const item of drag.items){
      touchedTracks.add(item.track);
    }
    for(const track of touchedTracks){
      track.clips.sort((a, b) => a.startTimeSec - b.startTimeSec || (a.zIndex || 0) - (b.zIndex || 0));
      track.saveClips();
    }

    this.pushUndoState("clip-move", drag.undoState);
    if(this.isPlaying) this.refreshTransportAfterTimelineEdit();
    this.soundManager.flashMessage("선택한 클립의 위치를 옮겼습니다.");
    return true;
  };

MixerUI.prototype.refreshTransportAfterTimelineEdit = function() {
    if(!this.isPlaying) return;
    const resumeTime = clamp(this.currentTimePositionSec, 0, Math.max(0, this.totalSeconds - 0.01));
    this.soundManager.stopAll();
    this.playedClipIds.clear();
    this.activeEffectTracks.clear();
    this.currentTimePositionSec = resumeTime;
    this.lastTimePositionSec = resumeTime;
    this.playStartTimeSec = resumeTime;
    this.playStartMillis = millis();
    this.triggerClipsAlreadyUnderPlayhead(resumeTime);
  };

MixerUI.prototype.handleClipAddedDuringPlayback = function(track, clip) {
    if(!this.isPlaying || !track || !clip || !this.isTrackAudible(track)) return;
    const now = this.currentTimePositionSec;
    this.playedClipIds.delete(clip.uid);
    if(clip.startTimeSec <= now && clip.endTimeSec > now){
      this.triggerClipEvents([{ track, clip, offset: now - clip.startTimeSec }], now);
    }
  };

MixerUI.prototype.doubleClicked = function() {
    if(this.editingClip) return;

    const sourceIndex = this.getSourceIndexAtMouse();
    if(sourceIndex !== -1){
      this.focusTrackInArrangement(sourceIndex);
      this.previewSourceAt(sourceIndex);
      return false;
    }

    let laneIndex = this.getLaneIndexAtMouse();
    if(laneIndex === -1){
      const clipHit = this.getClipAtMouse();
      if(clipHit) laneIndex = clipHit.trackIndex;
    }
    if(laneIndex === -1) return;

    const rawTime = this.getTimeAtMouse();
    if(rawTime === null) return;
    const track = this.soundManager.tracks[laneIndex];
    if(track.isBgm){
      if(track.clips[0]) this.setSingleSelection(laneIndex, track.clips[0].uid);
      return false;
    }
    this.pushUndoState("clip-add");
    const clip = track.createClip(this.snapTime(rawTime));
    this.setSingleSelection(laneIndex, clip.uid);
    this.handleClipAddedDuringPlayback(track, clip);
    return false;
  };

MixerUI.prototype.handleRightClick = function() {
    if(this.editingClip) return false;
    const clipHit = this.getClipAtMouse();
    if(!clipHit) return false;
    this.setSingleSelection(clipHit.trackIndex, clipHit.clip.uid);
    this.openClipEditWindow(clipHit.trackIndex, clipHit.clip.uid);
    return false;
  };

MixerUI.prototype.removeSelectedClip = function() {
    const ids = this.selectedClipUids.length > 0 ? [...this.selectedClipUids] : (this.selectedClipUid ? [this.selectedClipUid] : []);
    if(ids.length === 0) return;
    const hasRemovableClip = ids.some(uid => this.soundManager.tracks.some(track => !track.isBgm && !!track.getClipByUid(uid)));
    if(!hasRemovableClip) return;
    this.pushUndoState("clip-delete");

    for(const uid of ids){
      for(const track of this.soundManager.tracks){
        if(track.getClipByUid(uid)){
          if(!track.isBgm) track.removeClip(uid);
          break;
        }
      }
    }

    if(ids.includes(this.editingClipUid)) this.closeClipEditWindow();
    this.selectedClipUid = null;
    this.selectedClipUids = [];
  };

MixerUI.prototype.toggleEditingClipPreview = function() {
    const track = this.editingTrack;
    const clip = this.editingClip;
    if(!track || !clip || !track.soundFile) return;

    const isPreviewing = typeof track.isAnyVoicePlaying === "function" && track.isAnyVoicePlaying();
    if(isPreviewing){
      track.stop();
      return;
    }

    if(this.isPlaying) this.stopTransport(false);
    else this.soundManager.stopAll();
    track.previewClip(clip);
  };

MixerUI.prototype.handleEditWindowMousePressed = function() {
    const track = this.editingTrack;
    const clip = this.editingClip;
    const modal = this.getClipEditWindowRect();
    if(!track || !clip) return;

    if(!pointInRect(mouseX, mouseY, modal.x, modal.y, modal.w, modal.h)){
      this.closeClipEditWindow();
      return;
    }

    if(pointInRect(mouseX, mouseY, modal.x + 44, modal.y + modal.h - 50, 148, 34)){
      this.toggleEditingClipPreview();
      return;
    }

    if(pointInRect(mouseX, mouseY, modal.x + modal.w - 140, modal.y + modal.h - 50, 96, 34)){
      this.closeClipEditWindow();
      return;
    }

    for(const def of this.sliderDefs){
      if(dist(mouseX, mouseY, clamp(mouseX, def.x, def.x + def.w), def.y) <= 20){
        this.pushUndoState(`clip-${def.prop}`);
        this.draggingSlider = def;
        this.updateSliderByMouse(def);
        return;
      }
    }

    if(pointInRect(mouseX, mouseY, modal.x + 44, modal.y + 386, 500, 34)){
      this.pushUndoState("clip-reverse");
      clip.reverseMode = !clip.reverseMode;
      track.saveClips();
      track.previewClip(clip);
    }
  };

MixerUI.prototype.mouseDragged = function() {
    if(this.draggingClips){
      this.updateClipDrag();
      return;
    }
    if(this.draggingSlider){
      this.updateSliderByMouse(this.draggingSlider);
      return;
    }
    if(this.draggingTrackVolume){
      this.updateTrackVolumeByMouse(this.draggingTrackVolume.trackIndex);
      return;
    }
    if(this.draggingPlayhead){
      this.updatePlayheadDrag();
      return;
    }
    if(this.draggingScrollbar){
      this.updateScrollbarDrag();
      return;
    }
    if(this.isSelectingBox){
      this.updateMarqueeSelection();
    }
  };

MixerUI.prototype.mouseReleased = function() {
    if(this.draggingClips){
      this.finishClipDrag();
    }
    if(this.isSelectingBox){
      this.finishMarqueeSelection();
    }
    this.draggingSlider = null;
    this.draggingTrackVolume = null;
    this.draggingScrollbar = null;
    this.draggingPlayhead = false;
  };

MixerUI.prototype.updateSliderByMouse = function(def) {
    const track = this.editingTrack;
    const clip = this.editingClip;
    if(!track || !clip) return;

    const ratio = clamp((mouseX - def.x) / def.w, 0, 1);
    const value = def.min + ratio * (def.max - def.min);

    if(def.prop === "trimStartSec" || def.prop === "trimEndSec"){
      track.setClipTrimValue(clip.uid, def.prop, value);
    } else {
      track.setClipValue(clip.uid, def.prop, value);
    }

    if(def.prop === "rate"){
      if(track.isBgm) this.syncTimelineToBgm(false);
    }

    if(def.prop === "rate" || def.prop === "trimStartSec" || def.prop === "trimEndSec"){
      if(this.isPlaying){
        this.soundManager.stopAll();
        this.playedClipIds.clear();
        this.triggerClipsAlreadyUnderPlayhead(this.currentTimePositionSec);
      }
    }
  };

MixerUI.prototype.updateTrackVolumeByMouse = function(trackIndex) {
    const track = this.soundManager.tracks[trackIndex];
    if(!track) return;
    const grid = this.getGridLayout();
    const slider = this.getTrackVolumeSliderRect(trackIndex, grid);
    const ratio = clamp((mouseX - slider.x) / slider.w, 0, 1);
    track.setMasterVolume(ratio);
  };

MixerUI.prototype.getEditingPreviewSourcePosition = function() {
    const track = this.editingTrack;
    const clip = this.editingClip;
    if(!track || !clip || track.isBgm || !track.soundFile) return null;
    if(typeof track.soundFile.isPlaying !== "function" || !track.soundFile.isPlaying()) return null;
    if(typeof track.soundFile.currentTime !== "function") return null;

    const fileDuration = Math.max(0.02, track.getSourceDurationSeconds());
    const bufferPosition = clamp(Number(track.soundFile.currentTime()) || 0, 0, fileDuration);
    return clip.reverseMode ? fileDuration - bufferPosition : bufferPosition;
  };

MixerUI.prototype.setEditingTrimFromPreview = function(boundary) {
    const track = this.editingTrack;
    const clip = this.editingClip;
    if(!track || !clip || track.isBgm) return false;

    const sourcePosition = this.getEditingPreviewSourcePosition();
    if(sourcePosition === null){
      this.soundManager.flashMessage("PREVIEW 재생 중에 단축키를 사용하세요.");
      return false;
    }

    const fileDuration = Math.max(0.02, track.getSourceDurationSeconds());
    if(boundary === "start"){
      track.setClipTrimValue(clip.uid, "trimStartSec", sourcePosition);
      this.soundManager.flashMessage("현재 위치를 시작점으로 설정했습니다.");
    } else {
      track.setClipTrimValue(clip.uid, "trimEndSec", fileDuration - sourcePosition);
      this.soundManager.flashMessage("현재 위치를 끝점으로 설정했습니다.");
    }
    track.stop();
    return true;
  };

MixerUI.prototype.resetEditingClipTrim = function() {
    const track = this.editingTrack;
    const clip = this.editingClip;
    if(!track || !clip || track.isBgm) return false;
    track.stop();
    track.resetClipTrim(clip.uid);
    this.soundManager.flashMessage("클립 자르기를 초기화했습니다.");
    return true;
  };

MixerUI.prototype.splitSelectedClipAtPlayhead = function() {
    const targetUid = this.selectedClipUid || (this.selectedClipUids.length > 0 ? this.selectedClipUids[this.selectedClipUids.length - 1] : null);
    if(!targetUid){
      this.soundManager.flashMessage("자를 효과음 클립을 먼저 선택하세요.");
      return false;
    }

    let targetTrack = null;
    let targetTrackIndex = -1;
    let targetClip = null;

    for(let i = 0; i < this.soundManager.tracks.length; i++){
      const clip = this.soundManager.tracks[i].getClipByUid(targetUid);
      if(clip){
        targetTrack = this.soundManager.tracks[i];
        targetTrackIndex = i;
        targetClip = clip;
        break;
      }
    }

    if(!targetTrack || !targetClip){
      this.soundManager.flashMessage("선택한 클립을 찾을 수 없습니다.");
      return false;
    }
    if(targetTrack.isBgm){
      this.soundManager.flashMessage("BGM은 자를 수 없습니다.");
      return false;
    }

    if(this.isPlaying) this.stopTransport(false);

    const undoState = this.captureUndoState();
    const result = targetTrack.splitClipAtTimelineTime(targetClip.uid, this.currentTimePositionSec);
    if(!result){
      this.soundManager.flashMessage("재생바를 선택한 클립의 안쪽에 놓아주세요.");
      return false;
    }

    this.pushUndoState("clip-cut", undoState);
    this.setSingleSelection(targetTrackIndex, result.rightClip.uid);
    this.soundManager.flashMessage("재생바 위치에서 클립을 잘랐습니다.");
    return true;
  };

MixerUI.prototype.keyPressed = function() {
    if(this.bpmInput && document.activeElement === this.bpmInput.elt){
      return true;
    }
    const controlPressed = keyIsDown(CONTROL);
    if(controlPressed && (key === "z" || key === "Z" || keyCode === 90)){
      if(this.showFinishConfirm) this.cancelFinishConfirmation();
      if(this.showResetConfirm) this.cancelResetConfirmation();
      this.undoLastAction();
      return false;
    }
    if(keyCode === ESCAPE){
      if(this.showFinishConfirm){
        this.cancelFinishConfirmation();
        return false;
      }
      if(this.showResetConfirm){
        this.cancelResetConfirmation();
        return false;
      }
      if(this.showGuideBanner){
        this.showGuideBanner = false;
        return false;
      }
      if(this.editingClip) this.closeClipEditWindow();
      return false;
    }
    if(!this.editingClip && controlPressed && (key === "c" || key === "C" || keyCode === 67)){
      this.splitSelectedClipAtPlayhead();
      return false;
    }
    if(key === " "){
      this.toggleTransport();
      return false;
    }
    if(key === "p" || key === "P"){
      this.toggleTransport();
      return false;
    }
    if(this.isZoomInKey()){
      this.zoomBy(1.35, this.getKeyboardZoomAnchorX());
      return false;
    }
    if(this.isZoomOutKey()){
      this.zoomBy(0.74, this.getKeyboardZoomAnchorX());
      return false;
    }
    if(keyCode === DELETE || keyCode === BACKSPACE){
      this.removeSelectedClip();
      return;
    }

  };

MixerUI.prototype.isZoomInKey = function() {
    return key === "+" || key === "=" || keyCode === 187 || keyCode === 107;
  };

MixerUI.prototype.isZoomOutKey = function() {
    return key === "-" || key === "_" || keyCode === 189 || keyCode === 109;
  };

MixerUI.prototype.getKeyboardZoomAnchorX = function() {
    const grid = this.getGridLayout();
    const overTimeline = pointInRect(mouseX, mouseY, grid.cellStartX, grid.playheadHandleY, grid.timelineInnerW, grid.scrollBarY - grid.playheadHandleY + 16);
    return overTimeline ? mouseX : null;
  };

MixerUI.prototype.mouseWheel = function(event) {
    const grid = this.getGridLayout();
    const overArrangement = pointInRect(mouseX, mouseY, grid.x + 14, grid.playheadHandleY, grid.w - 42, grid.scrollBarY - grid.playheadHandleY + 16);
    if(!overArrangement) return true;

    const nativeEvent = event && event.srcEvent ? event.srcEvent : event;
    const delta = nativeEvent && Number.isFinite(nativeEvent.deltaY) ? nativeEvent.deltaY : (event && Number.isFinite(event.delta) ? event.delta : 0);
    const isTrackpadPinch = !!(nativeEvent && (nativeEvent.ctrlKey || nativeEvent.metaKey));

    if(isTrackpadPinch){
      const multiplier = delta > 0 ? 0.88 : 1.12;
      this.zoomBy(multiplier, clamp(mouseX, grid.cellStartX, grid.timelineEndX));
      if(nativeEvent && typeof nativeEvent.preventDefault === "function") nativeEvent.preventDefault();
      return false;
    }

    if(keyIsDown(SHIFT)){
      this.zoomBy(delta > 0 ? 0.9 : 1.1, clamp(mouseX, grid.cellStartX, grid.timelineEndX));
    } else {
      this.verticalScrollPx += delta * 0.85;
      this.clampVerticalScroll();
    }

    if(nativeEvent && typeof nativeEvent.preventDefault === "function") nativeEvent.preventDefault();
    return false;
  };

MixerUI.prototype.beginScrollbarDrag = function() {
    if(this.horizontalScrollbarRect){
      const r = this.horizontalScrollbarRect;
      if(pointInRect(mouseX, mouseY, r.knobX, r.knobY - 3, r.knobW, r.knobH + 6)){
        this.draggingScrollbar = { type: "horizontal", offset: mouseX - r.knobX };
        return true;
      }
    }
    if(this.verticalScrollbarRect){
      const r = this.verticalScrollbarRect;
      if(pointInRect(mouseX, mouseY, r.knobX - 3, r.knobY, r.knobW + 6, r.knobH)){
        this.draggingScrollbar = { type: "vertical", offset: mouseY - r.knobY };
        return true;
      }
    }
    return false;
  };

MixerUI.prototype.updateScrollbarDrag = function() {
    if(!this.draggingScrollbar) return;
    if(this.draggingScrollbar.type === "horizontal" && this.horizontalScrollbarRect){
      const r = this.horizontalScrollbarRect;
      const denom = Math.max(1, r.barW - r.knobW);
      const ratio = clamp((mouseX - this.draggingScrollbar.offset - r.barX) / denom, 0, 1);
      this.timelineScrollSec = ratio * r.maxScroll;
      this.clampScroll();
    }
    if(this.draggingScrollbar.type === "vertical" && this.verticalScrollbarRect){
      const r = this.verticalScrollbarRect;
      const denom = Math.max(1, r.barH - r.knobH);
      const ratio = clamp((mouseY - this.draggingScrollbar.offset - r.barY) / denom, 0, 1);
      this.verticalScrollPx = ratio * r.maxScroll;
      this.clampVerticalScroll();
    }
  };

MixerUI.prototype.beginPlayheadDrag = function() {
    const grid = this.getGridLayout();
    const x = this.timeToX(this.currentTimePositionSec, grid);
    const onPlayheadHandle = pointInRect(mouseX, mouseY, grid.cellStartX, grid.playheadHandleY, grid.timelineInnerW, grid.playheadHandleH);
    const nearPlayhead = abs(mouseX - x) <= 9 && mouseY >= grid.playheadHandleY && mouseY <= grid.laneBottomY;
    if(!onPlayheadHandle && !nearPlayhead) return false;
    this.draggingPlayhead = true;
    this.lastPlayheadEdgeScrollMillis = millis();
    this.updatePlayheadDrag(false);
    return true;
  };

MixerUI.prototype.updatePlayheadDrag = function(fromFrameUpdate = false) {
    const grid = this.getGridLayout();

    
    this.autoScrollWhileDraggingPlayhead(grid);

    const refreshedGrid = this.getGridLayout();
    const clampedX = clamp(mouseX, refreshedGrid.cellStartX, refreshedGrid.timelineEndX);
    const newTime = clamp(this.xToTime(clampedX, refreshedGrid), 0, this.totalSeconds);
    this.currentTimePositionSec = newTime;
    this.lastTimePositionSec = newTime;
    this.playStartTimeSec = newTime;
    this.playStartMillis = millis();
    this.playedClipIds.clear();
    this.lastMetronomeBeatIndex = Math.floor(newTime / this.beatDurationSec());
  };

MixerUI.prototype.autoScrollWhileDraggingPlayhead = function(grid) {
    const edgeZone = 58;
    const visible = this.visibleSeconds(grid);
    const maxScroll = Math.max(0, this.totalSeconds - visible);
    if(maxScroll <= 0) return;

    const nowMs = millis();
    const prevMs = this.lastPlayheadEdgeScrollMillis || nowMs;
    const dt = clamp((nowMs - prevMs) / 1000, 0.008, 0.05);
    this.lastPlayheadEdgeScrollMillis = nowMs;

    let direction = 0;
    let ratio = 0;

    if(mouseX <= grid.cellStartX + edgeZone){
      direction = -1;
      
      ratio = (grid.cellStartX + edgeZone - mouseX) / edgeZone;
    } else if(mouseX >= grid.timelineEndX - edgeZone){
      direction = 1;
      ratio = (mouseX - (grid.timelineEndX - edgeZone)) / edgeZone;
    }

    if(direction === 0) return;

    const cappedRatio = clamp(ratio, 0, 4.5);
    const speedSecPerSec = 1.2 + Math.pow(cappedRatio, 1.45) * 5.8;
    this.timelineScrollSec += direction * speedSecPerSec * dt;
    this.clampScroll();
  };

MixerUI.prototype.beginMarqueeSelection = function() {
    const grid = this.getGridLayout();
    if(!pointInRect(mouseX, mouseY, grid.cellStartX, grid.laneStartY, grid.timelineInnerW, grid.laneBottomY - grid.laneStartY)) return false;
    this.isSelectingBox = true;
    this.selectionBox = { startX: mouseX, startY: mouseY, endX: mouseX, endY: mouseY };
    this.selectedClipUid = null;
    this.selectedClipUids = [];
    return true;
  };

MixerUI.prototype.updateMarqueeSelection = function() {
    if(!this.selectionBox) return;
    const grid = this.getGridLayout();
    this.selectionBox.endX = clamp(mouseX, grid.cellStartX, grid.timelineEndX);
    this.selectionBox.endY = clamp(mouseY, grid.laneStartY, grid.laneBottomY);
  };

MixerUI.prototype.finishMarqueeSelection = function() {
    if(!this.selectionBox){
      this.isSelectingBox = false;
      return;
    }
    this.updateMarqueeSelection();
    const box = this.getNormalizedSelectionBox();
    const selected = [];
    const grid = this.getGridLayout();

    if(box.w > 4 || box.h > 4){
      for(let i = 0; i < this.soundManager.tracks.length; i++){
        const track = this.soundManager.tracks[i];
        for(const clip of track.clips){
          const rectInfo = this.clipRectToVisible(this.getClipRect(i, clip, grid), grid);
          if(this.rectsIntersect(box, rectInfo)) selected.push({ trackIndex: i, track, clip });
        }
      }
      this.setMultiSelection(selected);
    }

    this.isSelectingBox = false;
    this.selectionBox = null;
  };

MixerUI.prototype.getNormalizedSelectionBox = function() {
    const box = this.selectionBox;
    if(!box) return { x: 0, y: 0, w: 0, h: 0 };
    const x1 = Math.min(box.startX, box.endX);
    const y1 = Math.min(box.startY, box.endY);
    const x2 = Math.max(box.startX, box.endX);
    const y2 = Math.max(box.startY, box.endY);
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  };

MixerUI.prototype.rectsIntersect = function(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };

MixerUI.prototype.zoomBy = function(multiplier, anchorX = null) {
    const grid = this.getGridLayout();
    let x;
    let anchorTime;

    if(anchorX === null && this.currentTimePositionSec >= 0){
      const playheadX = this.timeToX(this.currentTimePositionSec, grid);
      if(playheadX >= grid.cellStartX && playheadX <= grid.timelineEndX){
        x = playheadX;
        anchorTime = this.currentTimePositionSec;
      }
    }

    if(x === undefined){
      x = anchorX === null ? grid.cellStartX + grid.timelineInnerW / 2 : clamp(anchorX, grid.cellStartX, grid.timelineEndX);
      anchorTime = this.xToTime(x, grid);
    }

    const newPps = clamp(this.pixelsPerSecond * multiplier, this.minPixelsPerSecond, this.maxPixelsPerSecond);
    this.pixelsPerSecond = newPps;
    this.timelineScrollSec = anchorTime - ((x - grid.cellStartX) / this.pixelsPerSecond);
    this.clampScroll();
  };

MixerUI.prototype.zoomVerticalBy = function(multiplier, anchorY = null) {
    const grid = this.getGridLayout();
    const y = anchorY === null ? grid.laneStartY + this.visibleTrackHeight(grid) / 2 : clamp(anchorY, grid.laneStartY, grid.laneBottomY);
    const contentY = this.verticalScrollPx + (y - grid.laneStartY);
    const anchorRatio = contentY / Math.max(1, this.trackRowH);
    this.trackRowH = clamp(this.trackRowH * multiplier, this.minTrackRowH, this.maxTrackRowH);
    this.verticalScrollPx = anchorRatio * this.trackRowH - (y - grid.laneStartY);
    this.clampVerticalScroll();
  };

MixerUI.prototype.previewSourceAt = function(trackIndex) {
    if(trackIndex < 0 || trackIndex >= this.soundManager.tracks.length) return;
    if(this.isPlaying) this.stopTransport(false);
    else this.soundManager.stopAll();
    const track = this.soundManager.tracks[trackIndex];
    track.previewSourceOnce();
  };

MixerUI.prototype.focusTrackInArrangement = function(trackIndex) {
    if(trackIndex < 0 || trackIndex >= this.soundManager.tracks.length) return;

    const track = this.soundManager.tracks[trackIndex];

    this.selectedTrackIndex = trackIndex;

    if(track.clips.length > 0){
      const clipsByTime = [...track.clips].sort((a, b) => a.startTimeSec - b.startTimeSec || (a.zIndex || 0) - (b.zIndex || 0));
      const firstClip = clipsByTime[0];
      this.selectedClipUid = firstClip.uid;
      this.selectedClipUids = [firstClip.uid];
    } else {
      this.selectedClipUid = null;
      this.selectedClipUids = [];
    }

    
    this.verticalScrollPx = trackIndex * this.trackRowH;
    this.clampVerticalScroll();
  };

MixerUI.prototype.openClipEditWindow = function(trackIndex, clipUid) {
    const track = this.soundManager.tracks[trackIndex];
    if(!track) return;
    const clip = track.getClipByUid(clipUid);
    if(!clip) return;

    if(this.isPlaying) this.stopTransport(false);
    else this.soundManager.stopAll();
    this.setSingleSelection(trackIndex, clipUid);
    this.editingTrackIndex = trackIndex;
    this.editingClipUid = clipUid;
    this.draggingSlider = null;
  };

MixerUI.prototype.closeClipEditWindow = function() {
    const track = this.editingTrack;
    if(track) track.stop();
    this.editingTrackIndex = -1;
    this.editingClipUid = null;
    this.draggingSlider = null;
  };

MixerUI.prototype.finishMix = function() {
    this.stopTransport(false);
    this.closeClipEditWindow();
    this.hideBpmInput();
    if(typeof gameManager !== "undefined" && gameManager && typeof gameManager.changeState === "function"){
      gameManager.changeState(gameState.END);
    }
  };

MixerUI.prototype.enterFinishScreen = function() {
  this.editingSessionPrepared = false;
  this.closeClipEditWindow();
  this.hideBpmInput();
  this.stopTransport(false);
  this.currentTimePositionSec = 0;
  this.lastTimePositionSec = 0;
  this.timelineScrollSec = 0;
  this.clampScroll();
  this.startTransport();
};

MixerUI.prototype.finishMix = function() {
  this.enterFinishScreen();
  if(typeof gameManager !== "undefined" && gameManager && typeof gameManager.changeState === "function"){
    gameManager.changeState(gameState.END);
  }
};

MixerUI.prototype.updateFinishScreen = function(time) {
  this.updateTransport();
  if(typeof images !== "undefined" && images && images.my_room_radio){
    showImage(images.my_room_radio, 0, width / 2, height / 2);
  } else {
    background(31, 27, 38);
    push();
    noStroke();
    fill(255, 190, 90, 36);
    ellipse(width / 2, height / 2, 560, 560);
    fill(105, 72, 44);
    rectMode(CENTER);
    rect(width / 2, height / 2, 350, 190, 28);
    fill(70, 48, 32);
    rect(width / 2, height / 2, 286, 116, 18);
    fill(236, 183, 90);
    ellipse(width / 2 - 84, height / 2, 74, 74);
    ellipse(width / 2 + 84, height / 2, 74, 74);
    pop();
  }
  push();
  noStroke();
  fill(0, 145);
  rect(0, 0, width, height);
  fill(255, 239, 205);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(30);
  text("완성된 음악이 흘러나오고 있습니다", width / 2, height * 0.23);
  textStyle(NORMAL);
  textSize(17);
  fill(255, 239, 205, 220);
  text("그 여름의 소리가, 아직 여기 있다.", width / 2, height * 0.30);
  const bx = width / 2 - 100;
  const by = height * 0.74;
  const bw = 200;
  const bh = 52;
  const hover = pointInRect(mouseX, mouseY, bx, by, bw, bh);
  fill(hover ? color(255, 216, 137) : color(255, 239, 199));
  rect(bx, by, bw, bh, 16);
  fill(58, 40, 26);
  textStyle(BOLD);
  textSize(17);
  text("처음으로 돌아가기", width / 2, by + bh / 2);
  const bx2 = width / 2 - 100;
  const by2 = height * 0.84;
  const bw2 = 200;
  const bh2 = 52;
  const hover2 = pointInRect(mouseX, mouseY, bx2, by2, bw2, bh2);
  fill(hover2 ? color(255, 216, 137) : color(255, 239, 199));
  rect(bx2, by2, bw2, bh2, 16);
  fill(58, 40, 26);
  textStyle(BOLD);
  textSize(17);
  text("나만의 소리 다운받기", width / 2, by2 + bh2 / 2);
  pop();
};

MixerUI.prototype.resetWholeGameToInitialState = function() {
  this.stopTransport(true);
  this.closeClipEditWindow();
  this.clearStoredMixState();
  this.prepareFreshEditingSession();
  this.editingSessionPrepared = false;

  for (let video of Object.values(videos)){
    if(typeof video !== "undefined" && video){
      try{
        video.stop();
        video.time(0);
      } catch(error){}
    }
  }

  if(typeof player !== "undefined" && player){
    player.x = width / 2;
    player.y = height / 2;
    player.vx = 0;
    player.vy = 0;
    player.lastAxis = "none";
    player.prevPressed = {};
    if(player.directions){
      player.direction = player.directions.UP;
      player.facing = player.directions.UP;
    }
    player.isMoving = false;
    player.animationTimer = 0;
    player.latestKey = -1;
    player.visitedMap = {
      BEDROOM: false,
      KITCHEN: false,
      OUTSIDE: false,
      STREAM: false
    };
    callButton.reset();
    if(player.inventory){
      if(typeof player.inventory.clear === "function") player.inventory.clear();
      player.inventory.selectedIndex = 0;
    }
    player.showInventory = false;
    if(player.imgs && player.imgs.length > 0) player.img = player.imgs[0];
    if(typeof player.updateCollider === "function") player.updateCollider();
  }

  try{ localStorage.removeItem("soundInventory"); } catch(error){}

  if(typeof sceneObjects !== "undefined" && Array.isArray(sceneObjects)){
    for(const sceneList of sceneObjects){
      if(!Array.isArray(sceneList)) continue;
      for(const object of sceneList){
        if(!object) continue;
        if(typeof SoundObject !== "undefined" && object instanceof SoundObject){
          object.collected = false;
        }
        if(typeof object.deactivate === "function") object.deactivate();
      }
    }
  }

  if(typeof gameManager !== "undefined" && gameManager){
    gameManager.textIndex = 0;
    gameManager.inputTimer = gameManager.inputInterval;
    gameManager.returnSceneTimer = 0;
    gameManager.isOpening1VideoFinished = false;
    gameManager.isOpening2VideoFinished = false;
    gameManager.isIntroVideoFinished = false;
    gameManager.isCallVideoFinished = false;
    gameManager.isReturnVideo1Finished = false;
    gameManager.isReturnVideo2Finished = false;
    gameManager.isfading = false;
    gameManager.fadeTimer = 0;
    gameManager.fadeTime = 0;
    gameManager.fadeImage = null;
    if(typeof gameManager.changeState === "function" && typeof gameState !== "undefined"){
      gameManager.changeState(gameState.START);
    }
  }

  if(typeof isDebugMode !== "undefined") isDebugMode = false;
  if(typeof debugButtons !== "undefined" && Array.isArray(debugButtons)){
    for(const button of debugButtons){
      if(button && typeof button.changeShowState === "function") button.changeShowState(false);
    }
  }
  if(typeof mapButtons !== "undefined" && Array.isArray(mapButtons)){
    for(const button of mapButtons){
      if(button && typeof button.changeShowState === "function") button.changeShowState(false);
    }
  }
  if(typeof mapButton !== "undefined" && mapButton && typeof mapButton.changeShowState === "function"){
    mapButton.changeShowState(false);
  }
  if(typeof callButton !== "undefined" && callButton && typeof callButton.changeShowState === "function"){
    callButton.changeShowState(false);
  }
  if(typeof startButton !== "undefined" && startButton && typeof startButton.changeShowState === "function"){
    startButton.changeShowState(true);
  }
  if(typeof changeScene === "function" && typeof scenes !== "undefined"){
    changeScene(scenes.EMPTY);
  }
  if (qrCodeElement) {
    qrCodeElement.remove();
    qrCodeElement = null;
  }
  renderingResultUrl = "";
  changeScene(scenes.EMPTY);
  videos.openingVideo1.stop();
  gameManager.endGame();
};

MixerUI.prototype.mousePressedFinishScreen = function() {
  const bx = width / 2 - 100;
  const by = height * 0.74;
  const bw = 200;
  const bh = 52;
  if(pointInRect(mouseX, mouseY, bx, by, bw, bh)){
    this.hideBpmInput();
    this.resetWholeGameToInitialState();
    return true;
  }
  const bx2 = width / 2 - 100;
  const by2 = height * 0.84;
  const bw2 = 200;
  const bh2 = 52;
  if(pointInRect(mouseX, mouseY, bx2, by2, bw2, bh2)){
    this.hideBpmInput();
    this.downloadSound();
    gameManager.changeState(gameState.DOWNLOAD);
    return true;
  }
  return false;
};

MixerUI.prototype.downloadSound = async function(){
  // 이미 생성 중이거나 결과가 있다면 중복 실행 방지
  if (renderingResultUrl) {
    this.soundManager.flashMessage("이미 QR 코드가 생성되었습니다.");
    return;
  }

  this.soundManager.flashMessage("오디오 파일 렌더링 중...");
  
  try {
    // 1. 오프라인 가상 오디오 컨텍스트에서 고속 합성
    const audioBuffer = await this.renderAudioOffline(this.totalSeconds);
    
    // 2. 완성된 데이터를 MP3 바이너리(Blob)로 인코딩
    this.soundManager.flashMessage("MP3 파일 압축 중...");
    const mp3Blob = this.bufferToMp3(audioBuffer);
    
    // 3. 서버로 가상 파일 업로드
    this.soundManager.flashMessage("공유 링크 생성 중...");
    
    const formData = new FormData();
    formData.append("file", mp3Blob, `re_summer_${Date.now()}.mp3`);

    // file.io 대신 tmpfiles.org API 사용 (CORS 에러가 덜 발생함)
    const response = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: formData
    });
    
    if (!response.ok) throw new Error("서버 업로드 실패");
    
    const data = await response.json();
    
    // tmpfiles.org는 응답 구조가 다릅니다. (data.data.url 에 다운로드 주소가 옴)
    if (data && data.data && data.data.url) {
      // [핵심] 광고 페이지 주소를 파일 즉시 다운로드용 Direct 주소로 치환합니다.
      // 예: https://tmpfiles.org/XXXXXX  ->  https://tmpfiles.org/dl/XXXXXX
      const rawUrl = data.data.url;
      const directUrl = rawUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");
      
      // 변환된 직행 주소를 전역 변수에 저장
      renderingResultUrl = directUrl; 
      this.soundManager.flashMessage("성공! 화면에 QR 코드가 생성됩니다.");
    } else {
      throw new Error("링크 생성 실패");
    }

  } catch (error) {
    console.error("오디오 변환 또는 업로드 실패:", error);
    this.soundManager.flashMessage("링크 생성에 실패했습니다.");
  }
};

MixerUI.prototype.renderAudioOffline = async function(durationSeconds) {
  const sampleRate = 44100;
  const numberOfChannels = 2; // 스테레오
  
  // 가상의 렌더링용 오디오 컨텍스트 생성 (실제 소리가 귀로 들리지 않고 메모리에서 연산됨)
  const offlineCtx = new OfflineAudioContext(numberOfChannels, sampleRate * Math.max(1, durationSeconds), sampleRate);

  // 현재 믹서 UI에 등록된 모든 트랙 순회
  for (const track of this.soundManager.tracks) {
    if (track.muted || (this.hasSoloTrack() && !track.solo)) continue; // 음소거 및 솔로 트랙 반영
    if (!track.soundFile || !track.soundFile.buffer) continue;
    
    const buffer = track.soundFile.buffer; // 원본 사운드 오디오 버퍼

    for (const clip of track.clips) {
      // 1. 소스 노드 생성 및 버퍼 지정
      const bufferSource = offlineCtx.createBufferSource();
      bufferSource.buffer = buffer;
      bufferSource.playbackRate.value = clip.rate;

      // 2. 개별 클립의 볼륨(Gain) 노드 설정 (트랙 마스터 볼륨 반영)
      const gainNode = offlineCtx.createGain();
      const baseVolume = (clip.volume ?? 1) * (track.masterVolume ?? 1);
      gainNode.gain.value = baseVolume;

      // 3. 개별 클립의 필터(LowPass) 노드 설정
      const filterNode = offlineCtx.createBiquadFilter();
      filterNode.type = "lowpass";
      filterNode.frequency.value = clip.lowPassFreq ?? 10000;

      // 4. 좌우 패닝(Panner) 노드 설정
      const pannerNode = offlineCtx.createStereoPanner();
      pannerNode.pan.value = clip.panValue ?? 0;

      // 노드 연결: Source -> Filter -> Panner -> Gain -> Destination(최종 출력)
      bufferSource.connect(filterNode);
      filterNode.connect(pannerNode);
      pannerNode.connect(gainNode);
      gainNode.connect(offlineCtx.destination);

      // 사용자가 배치한 오천 초(Timeline) 시간에 맞추어 가상 재생 시간 스케줄링
      const startTime = clip.startTimeSec;
      const duration = clip.lengthSeconds;
      
      // 클립의 소스 크롭(Trim) 연산 계산 알고리즘 반영
      const bounds = track.getClipSourceBounds(clip);
      const cueStart = clip.reverseMode ? bounds.endTrimSec : bounds.startSec;

      // 가상 타임라인에서 재생 시작 명령 (재생 시작 시간, 원본 소스의 시작 지점, 재생할 기간)
      bufferSource.start(offlineCtx.currentTime + startTime, cueStart, bounds.durationSec);
    }
  }

  // 백그라운드 렌더링 실행 후 완성된 단일 통합 AudioBuffer 반환
  return await offlineCtx.startRendering();
};

MixerUI.prototype.bufferToMp3 = function(audioBuffer) {
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.getChannelData(1);
  
  // 2채널(스테레오), 44100Hz, 128kbps 비트레이트 설정
  const mp3encoder = new lamejs.Mp3Encoder(2, audioBuffer.sampleRate, 128);
  const mp3Data = [];

  // Float32 데이터를 Int16 데이터 포맷으로 파싱 변환 (lamejs 인코더 규격)
  const lp = new Int16Array(leftChannel.length);
  const rp = new Int16Array(rightChannel.length);
  for (let i = 0; i < leftChannel.length; i++) {
    lp[i] = leftChannel[i] < 0 ? leftChannel[i] * 0x8000 : leftChannel[i] * 0x7FFF;
    rp[i] = rightChannel[i] < 0 ? rightChannel[i] * 0x8000 : rightChannel[i] * 0x7FFF;
  }

  const sampleBlockSize = 1152;
  for (let i = 0; i < lp.length; i += sampleBlockSize) {
    const leftChunk = lp.subarray(i, i + sampleBlockSize);
    const rightChunk = rp.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
  }
  
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) mp3Data.push(mp3buf);

  return new Blob(mp3Data, { type: 'audio/mp3' });
};

MixerUI.prototype.updateDownloadScreen = function(time){
  if(isDebugMode){
    isDebugMode = false;
    for(let button of debugButtons){
      button.changeShowState(isDebugMode);
    }
    callButton.changeShowState(isDebugMode);
  }
  // 1. 오디오 정지 및 타임라인 싱크 유지
  this.updateTransport();

  // 2. 배경화면 연출 (엔딩 씬과 통일감을 주는 어두운 연출)
  background(27, 37, 64);
  showImage(images.qr_page, 0, width/2, height/2);

  // 3. 상태에 따른 상단 및 내부 텍스트 렌더링
  push();
  noStroke();
  textAlign(CENTER, CENTER);
  
  if (!renderingResultUrl) {
    // 아직 서버로부터 링크를 받아오지 못한 경우 (업로드 중)
    textStyle(NORMAL);
    textSize(16);
    fill(0);
    text("로딩 중...", width / 2, height * 0.69);
  } else {
    // 연결 성공 및 URL 획득 완료 상태
    // QR 코드 주입 및 동적 정렬 제어
    if (!qrCodeElement) {
      // 1. QR 코드를 주입할 가상 HTML DOM Div 생성
      qrCodeElement = document.createElement("div");
      qrCodeElement.id = "qrcode-container";
      
      // 1. 기준점을 브라우저 화면 좌측 상단 꼭짓점(0, 0)으로 완전히 고정
      qrCodeElement.style.position = "absolute";

      // 2. 원하는 QR 코드 '중심'의 픽셀 좌표를 직접 지정 (예: 가로 640px, 세로 360px)
      const targetX = width/2; 
      const targetY = height * 0.7;

      qrCodeElement.style.left = `${targetX}px`;
      qrCodeElement.style.top = `${targetY}px`;

      //qrCodeElement.style.marginLeft = "-80px";
      qrCodeElement.style.marginTop = "-54px";

      // 3. 나머지 스타일
      qrCodeElement.style.zIndex = "1000";
      qrCodeElement.style.padding = "10px";
      qrCodeElement.style.background = "white";
      qrCodeElement.style.borderRadius = "12px";
      qrCodeElement.style.boxShadow = "0px 6px 20px rgba(0,0,0,0.4)";
      
      const canvasElt = document.querySelector("canvas");
      if (canvasElt && canvasElt.parentElement) {
        canvasElt.parentElement.appendChild(qrCodeElement);
      } else {
        document.body.appendChild(qrCodeElement);
      }

      // 3. qrcode.js 인스턴스 빌드 후 주소 연동
      new QRCode(qrCodeElement, {
        text: renderingResultUrl,
        width: 140,
        height: 140,
        colorDark: "#000000",
        colorLight: "#ffffff"
      });
    }
  }
};