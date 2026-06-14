const POST_EDIT_TIMELINE_SECONDS = 120; 
const POST_EDIT_MAX_TIMELINE_SECONDS = 240;
const POST_EDIT_SNAP_DIVISION = 4; 
const POST_EDIT_FALLBACK_CLIP_SECONDS = 2.0;

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
      name: "MAIN BGM",
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
    this.selectedBgmIndex = safeIndex;
    try{ localStorage.setItem(this.bgmStorageKey, String(safeIndex)); } catch(error){}
    this.stopAll();
    this.bgmTrack.applyBgmOption(this.bgmOptions[safeIndex], safeIndex);
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
    this.lengthSeconds = values.lengthSeconds ?? track.getDefaultClipLengthSeconds();
    this.uid = values.uid || `${track.id}_${nf(this.startTimeSec, 1, 2)}_${Date.now()}_${int(random(10000))}`;

    this.volume = values.volume ?? track.defaultVolume;
    this.rate = values.rate ?? track.defaultRate;
    this.panValue = values.panValue ?? track.defaultPanValue;
    this.lowPassFreq = values.lowPassFreq ?? track.defaultLowPassFreq;
    this.delayWet = values.delayWet ?? track.defaultDelayWet;
    this.reverbWet = values.reverbWet ?? track.defaultReverbWet;
    this.reverseMode = values.reverseMode ?? false;
    this.zIndex = values.zIndex ?? 0;
  }

  get endTimeSec(){
    return this.startTimeSec + this.lengthSeconds;
  }

  toJSON(){
    return {
      uid: this.uid,
      startTimeSec: this.startTimeSec,
      lengthSeconds: this.lengthSeconds,
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

    this.masterVolume = config.masterVolume ?? 1.0;
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

    this.peakCache = {};
    this.audioReady = false;
    this.currentReverseState = false;
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
    if(this.muted) this.stop();
    this.saveTrackSettings();
  }

  toggleSolo(){
    this.solo = !this.solo;
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
      if(Number.isFinite(d) && d > 0) return clamp(d / safeRate, 0.35, POST_EDIT_MAX_TIMELINE_SECONDS);
    }
    return POST_EDIT_FALLBACK_CLIP_SECONDS;
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

    this.soundFile.disconnect();
    this.soundFile.connect(this.filter);
    this.filter.connect();

    this.delay.process(this.filter, this.defaultDelayTime, 0.35, 2300);
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
    this.saveClips();
  }

  applyClipMix(clip){
    if(!this.soundFile || !clip) return;
    this.ensureAudio();
    this.ensureReverseState(clip.reverseMode);

    const effectiveVolume = clamp(clip.volume * this.masterVolume, 0, 1);
    this.soundFile.setVolume(effectiveVolume);
    this.soundFile.rate(clip.rate);
    this.soundFile.pan(clip.panValue);

    if(this.filter){
      this.filter.freq(clip.lowPassFreq);
      this.filter.res(6);
    }
    if(this.delay) this.delay.drywet(clip.delayWet);
    if(this.reverb) this.reverb.drywet(clip.reverbWet);
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

  triggerClip(clip, offsetWithinClipSec = 0){
    if(!clip || !this.soundFile) return;

    this.applyClipMix(clip);
    const fileDuration = this.soundFile.duration ? this.soundFile.duration() : clip.lengthSeconds;
    const safeRate = Math.max(0.1, Math.abs(clip.rate || 1));
    const timelineOffset = clamp(offsetWithinClipSec, 0, Math.max(0, clip.lengthSeconds - 0.02));
    const sourceOffset = clamp(timelineOffset * safeRate, 0, Math.max(0, fileDuration - 0.02));
    const remainingTimeline = Math.max(0.02, clip.lengthSeconds - timelineOffset);
    const remainingSource = Math.max(0.02, fileDuration - sourceOffset);
    const sourceDuration = Math.min(remainingSource, remainingTimeline * safeRate);
    this.soundFile.play(0, clip.rate, clamp(clip.volume * this.masterVolume, 0, 1), sourceOffset, sourceDuration);
  }

  previewClip(clip){
    if(!clip || !this.soundFile) return;
    this.applyClipMix(clip);
    const fileDuration = this.soundFile.duration ? this.soundFile.duration() : 1.6;
    this.soundFile.play(0, clip.rate, clamp(clip.volume * this.masterVolume, 0, 1), 0, Math.min(fileDuration, clip.lengthSeconds, 2.2));
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
      lengthSeconds: fileDuration
    };
    this.applyClipMix(previewClip);
    this.soundFile.play(0, this.defaultRate, clamp(this.defaultVolume * this.masterVolume, 0, 1), 0, fileDuration);
  }

  stop(){
    if(this.soundFile && this.soundFile.isPlaying()) this.soundFile.stop();
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
    this.sliderDefs = [];

    this.draggingPlayhead = false;
    this.lastPlayheadEdgeScrollMillis = 0;
    this.selectionBox = null;
    this.isSelectingBox = false;

    this.bgmButtonRects = [];
    this.bpmInput = null;
    this.bpmDraft = String(this.bpm);

    this.syncTimelineToBgm(true);
    this.ensureGuideMix();
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
    const hasEffectClip = this.soundManager.tracks.some(track => !track.isBgm && track.clips.length > 0);
    if(hasEffectClip) return;

    const guideTimes = [1.2, 3.6, 5.8, 8.0, 11.0, 13.4, 16.2, 19.5];
    const effectTracks = this.soundManager.tracks.filter(track => !track.isBgm).slice(0, guideTimes.length);

    for(let i = 0; i < effectTracks.length; i++){
      const track = effectTracks[i];
      const start = Math.min(guideTimes[i], Math.max(0, this.totalSeconds - 0.6));
      const clip = track.createClip(start);
      if(!clip) continue;
      clip.volume = clamp(0.72 + (i % 3) * 0.08, 0, 1);
      clip.panValue = [-0.35, 0.22, 0, 0.42, -0.18, 0.12, -0.42, 0.3][i] || 0;
      clip.reverbWet = i % 3 === 1 ? 0.18 : 0.06;
      clip.delayWet = i % 4 === 2 ? 0.14 : 0;
      clip.lowPassFreq = i % 5 === 0 ? 6200 : 10000;
      clip.lengthSeconds = clamp(track.getSourceDurationSeconds() / Math.max(0.1, Math.abs(clip.rate || 1)), 0.35, POST_EDIT_MAX_TIMELINE_SECONDS);
    }

    for(const track of effectTracks) track.saveClips();
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
    const layout = this.getLayout();
    if(layout.leftW <= 0) return -1;
    const rowH = 70;
    for(let i = 0; i < this.soundManager.tracks.length; i++){
      const rowY = layout.top + 58 + i * rowH;
      if(pointInRect(mouseX, mouseY, layout.margin + 12, rowY, layout.leftW - 24, rowH - 12)) return i;
    }
    return -1;
  };

MixerUI.prototype.getTrackControlAtMouse = function() {
    const grid = this.getGridLayout();
    for(let i = 0; i < this.soundManager.tracks.length; i++){
      const rowY = grid.laneStartY + i * grid.rowH - this.verticalScrollPx;
      if(rowY + grid.rowH < grid.laneStartY || rowY > grid.laneBottomY) continue;
      const nameY = rowY + Math.min(18, Math.max(13, grid.rowH * 0.28));
      const buttonSize = clamp(grid.rowH * 0.24, 16, 21);
      const buttonY = nameY - buttonSize / 2;
      const muteX = grid.x + 88;
      const soloX = grid.x + 112;
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

MixerUI.prototype.updateTransport = function() {
    if(!this.isPlaying) return;

    const elapsedRealSec = (millis() - this.playStartMillis) / 1000;
    const timePosition = this.playStartTimeSec + elapsedRealSec * this.transportSpeedMultiplier();

    if(timePosition >= this.totalSeconds){
      this.currentTimePositionSec = this.totalSeconds;
      this.stopTransport(false);
      return;
    }

    const prevPosition = this.lastTimePositionSec;
    this.currentTimePositionSec = timePosition;

    for(const track of this.soundManager.tracks){
      if(!this.isTrackAudible(track)) continue;
      for(const clip of track.clips){
        if(this.playedClipIds.has(clip.uid)) continue;
        if(clip.startTimeSec >= prevPosition && clip.startTimeSec < timePosition + 0.006){
          track.triggerClip(clip);
          this.playedClipIds.add(clip.uid);
        }
      }
    }

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
    for(const track of this.soundManager.tracks){
      if(!this.isTrackAudible(track)) continue;
      for(const clip of track.clips){
        if(clip.startTimeSec <= timeSec && clip.endTimeSec > timeSec){
          const offset = timeSec - clip.startTimeSec;
          track.triggerClip(clip, offset);
          this.playedClipIds.add(clip.uid);
        }
      }
    }
  };

MixerUI.prototype.stopTransport = function(resetToStart = false) {
    this.isPlaying = false;
    if(resetToStart) this.currentTimePositionSec = 0;
    this.lastTimePositionSec = this.currentTimePositionSec || 0;
    this.playedClipIds.clear();
    this.lastMetronomeBeatIndex = Math.floor(this.lastTimePositionSec / this.beatDurationSec());
    this.soundManager.stopAll();
  };

MixerUI.prototype.toggleTransport = function() {
    this.isPlaying ? this.stopTransport(false) : this.startTransport();
  };

MixerUI.prototype.drawBackground = function() {
    background(29, 28, 34);
  };

MixerUI.prototype.drawEmptyState = function() {
    drawPanel(380, 230, 520, 220, "Post Edit DAW");
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
    drawPanel(layout.timelineX, layout.top, layout.timelineW, layout.panelH, "ARRANGEMENT");
    this.drawArrangement(layout.timelineX, layout.top, layout.timelineW, layout.panelH);
  };

MixerUI.prototype.drawHeader = function() {
    push();
    noStroke();
    fill(44, 40, 52);
    rect(0, 0, width, 68);
    pop();

    drawSoftButton(28, 18, 80, 34, "PLAY", this.isPlaying);
    drawSoftButton(116, 18, 80, 34, "STOP");
    drawSoftButton(208, 18, 98, 34, "DELETE", !!this.selectedClip);
    drawSoftButton(318, 18, 100, 34, "FINISH");
    push();
    fill(255, 236, 199);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(13);
    text("H", 1052, 34);
    text("V", 1160, 34);
    pop();

    drawSoftButton(1068, 19, 32, 30, "−");
    drawSoftButton(1104, 19, 32, 30, "+");
    drawSoftButton(1176, 19, 32, 30, "−");
    drawSoftButton(1212, 19, 32, 30, "+");
  };

MixerUI.prototype.drawBgmSelector = function() {
    this.bgmButtonRects = [];
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

    const fileDuration = track.getSourceDurationSeconds ? track.getSourceDurationSeconds() : clip.lengthSeconds;
    const safeRate = Math.max(0.1, Math.abs(clip.rate || 1));
    const sourceEndRatio = clamp((clip.lengthSeconds * safeRate) / Math.max(0.001, fileDuration), 0.02, 1);
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
      const sourceRatio = clip.reverseMode ? 1 - timelineRatio * sourceEndRatio : timelineRatio * sourceEndRatio;
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
    push();
    noStroke();
    fill(0, 155);
    rect(0, 0, width, height);
    pop();

    drawPanel(modal.x, modal.y, modal.w, modal.h, "CLIP EDIT");

    push();
    fill(61, 42, 28);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(20);
    text(`${track.name} · ${this.formatTime(clip.startTimeSec)}`, modal.x + 28, modal.y + 68);
    fill(track.color[0], track.color[1], track.color[2]);
    rect(modal.x + modal.w - 112, modal.y + 64, 62, 28, 8);
    pop();

    this.sliderDefs = [
      { label: "Volume", prop: "volume", min: 0, max: 1, x: modal.x + 44, y: modal.y + 126, w: modal.w - 88 },
      { label: track.isBgm ? "BGM Rate / Pitch" : "Rate / Pitch", prop: "rate", min: 0.5, max: 1.8, x: modal.x + 44, y: modal.y + 176, w: modal.w - 88 },
      { label: "Pan", prop: "panValue", min: -1, max: 1, x: modal.x + 44, y: modal.y + 226, w: modal.w - 88 },
      { label: "Low Pass", prop: "lowPassFreq", min: 400, max: 10000, x: modal.x + 44, y: modal.y + 276, w: modal.w - 88 },
      { label: "Delay", prop: "delayWet", min: 0, max: 0.85, x: modal.x + 44, y: modal.y + 326, w: modal.w - 88 },
      { label: "Reverb", prop: "reverbWet", min: 0, max: 0.85, x: modal.x + 44, y: modal.y + 376, w: modal.w - 88 }
    ];

    if(!track.isBgm){
      const lengthMax = clamp(track.getSourceDurationSeconds() / Math.max(0.1, Math.abs(clip.rate || 1)), 0.35, POST_EDIT_MAX_TIMELINE_SECONDS);
      this.sliderDefs.push({ label: "Length", prop: "lengthSeconds", min: Math.min(0.25, lengthMax), max: lengthMax, x: modal.x + 44, y: modal.y + 426, w: modal.w - 88 });
    }

    for(const def of this.sliderDefs){
      this.drawSlider(def, clip[def.prop]);
    }

    this.drawToggle(modal.x + 44, modal.y + 456, modal.w - 88, 36, "Reverse", clip.reverseMode);

    drawSoftButton(modal.x + modal.w - 248, modal.y + modal.h - 52, 96, 34, "CLOSE");
    drawSoftButton(modal.x + modal.w - 140, modal.y + modal.h - 52, 96, 34, "DONE");
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
    if(def.prop === "lengthSeconds") return `${nf(value, 1, 2)} s`;
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
    return { x: 360, y: 66, w: 560, h: 560 };
  };

MixerUI.prototype.mousePressed = function() {
    if(this.soundManager.tracks.length === 0) return;

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
      this.finishMix();
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

    if(this.beginPlayheadDrag()) return;
    if(this.beginScrollbarDrag()) return;

    const trackControl = this.getTrackControlAtMouse();
    if(trackControl){
      this.handleTrackControlMousePressed(trackControl);
      return;
    }

    const clipHit = this.getClipAtMouse();
    if(clipHit){
      this.setSingleSelection(clipHit.trackIndex, clipHit.clip.uid);
      return;
    }

    const sourceIndex = this.getSourceIndexAtMouse();
    if(sourceIndex !== -1){
      this.focusTrackInArrangement(sourceIndex);
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
    const wasPlaying = this.isPlaying;
    if(wasPlaying) this.stopTransport(false);
    const track = this.soundManager.selectBgmOption(index);
    if(track){
      this.syncTimelineToBgm(true);
      this.selectedTrackIndex = 0;
      this.selectedClipUid = track.clips[0] ? track.clips[0].uid : null;
      this.selectedClipUids = this.selectedClipUid ? [this.selectedClipUid] : [];
      this.verticalScrollPx = 0;
    }
  };

MixerUI.prototype.handleTrackControlMousePressed = function(control) {
    const track = this.soundManager.tracks[control.trackIndex];
    if(!track) return;
    this.selectedTrackIndex = control.trackIndex;

    if(control.type === "mute"){
      track.toggleMute();
      return;
    }
    if(control.type === "solo"){
      track.toggleSolo();
      return;
    }
    if(control.type === "volume"){
      this.draggingTrackVolume = { trackIndex: control.trackIndex };
      this.updateTrackVolumeByMouse(control.trackIndex);
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
    const clip = track.createClip(this.snapTime(rawTime));
    this.setSingleSelection(laneIndex, clip.uid);
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

MixerUI.prototype.handleEditWindowMousePressed = function() {
    const track = this.editingTrack;
    const clip = this.editingClip;
    const modal = this.getClipEditWindowRect();
    if(!track || !clip) return;

    if(!pointInRect(mouseX, mouseY, modal.x, modal.y, modal.w, modal.h)){
      this.closeClipEditWindow();
      return;
    }

    if(pointInRect(mouseX, mouseY, modal.x + modal.w - 248, modal.y + modal.h - 52, 96, 34)){
      this.closeClipEditWindow();
      return;
    }
    if(pointInRect(mouseX, mouseY, modal.x + modal.w - 140, modal.y + modal.h - 52, 96, 34)){
      this.closeClipEditWindow();
      return;
    }

    for(const def of this.sliderDefs){
      if(dist(mouseX, mouseY, clamp(mouseX, def.x, def.x + def.w), def.y) <= 20){
        this.draggingSlider = def;
        this.updateSliderByMouse(def);
        return;
      }
    }

    if(pointInRect(mouseX, mouseY, modal.x + 44, modal.y + 456, modal.w - 88, 36)){
      clip.reverseMode = !clip.reverseMode;
      track.saveClips();
      track.previewClip(clip);
    }
  };

MixerUI.prototype.mouseDragged = function() {
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
    track.setClipValue(clip.uid, def.prop, value);

    if(def.prop === "rate"){
      if(track.isBgm){
        this.syncTimelineToBgm(false);
      } else {
        const fitLength = clamp(track.getSourceDurationSeconds() / Math.max(0.1, Math.abs(clip.rate || 1)), 0.35, POST_EDIT_MAX_TIMELINE_SECONDS);
        track.setClipValue(clip.uid, "lengthSeconds", fitLength);
      }
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

MixerUI.prototype.keyPressed = function() {
    if(this.bpmInput && document.activeElement === this.bpmInput.elt){
      return true;
    }
    if(keyCode === ESCAPE){
      if(this.editingClip) this.closeClipEditWindow();
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
    const overTimeline = pointInRect(mouseX, mouseY, grid.cellStartX, grid.playheadHandleY, grid.timelineInnerW, grid.scrollBarY - grid.playheadHandleY + 16);
    if(!overTimeline) return true;

    
    const nativeEvent = event && event.srcEvent ? event.srcEvent : event;
    const delta = nativeEvent && Number.isFinite(nativeEvent.deltaY) ? nativeEvent.deltaY : (event && Number.isFinite(event.delta) ? event.delta : 0);

    
    
    const isTrackpadPinch = !!(nativeEvent && (nativeEvent.ctrlKey || nativeEvent.metaKey));
    if(isTrackpadPinch){
      const multiplier = delta > 0 ? 0.88 : 1.12;
      this.zoomBy(multiplier, mouseX);
      if(nativeEvent && typeof nativeEvent.preventDefault === "function") nativeEvent.preventDefault();
      return false;
    }

    
    if(keyIsDown(SHIFT) || keyIsDown(CONTROL)){
      this.zoomBy(delta > 0 ? 0.9 : 1.1, mouseX);
    } else {
      this.timelineScrollSec += delta * 0.018;
      this.clampScroll();
    }
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
    this.soundManager.stopAll();
    const track = this.soundManager.tracks[trackIndex];
    if(!this.isTrackAudible(track)) return;
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

    this.setSingleSelection(trackIndex, clipUid);
    this.editingTrackIndex = trackIndex;
    this.editingClipUid = clipUid;
    this.draggingSlider = null;
  };

MixerUI.prototype.closeClipEditWindow = function() {
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
  this.closeClipEditWindow();
  this.hideBpmInput();
  this.stopTransport(false);
  this.currentTimePositionSec = 0;
  this.lastTimePositionSec = 0;
  this.timelineScrollSec = 0;
  this.clampScroll();
  this.isPlaying = true;
  this.playStartMillis = millis();
  this.playStartTimeSec = 0;
  this.playedClipIds.clear();
  this.triggerClipsAlreadyUnderPlayhead(0);
  this.lastMetronomeBeatIndex = 0;
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
  text("완성된 음악이 흘러나오고 있습니다", width / 2, height * 0.24);
  textStyle(NORMAL);
  textSize(17);
  fill(255, 239, 205, 220);
  text("그 여름의 소리가, 아직 여기 있다.", width / 2, height * 0.31);
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
  pop();
};

MixerUI.prototype.mousePressedFinishScreen = function() {
  const bx = width / 2 - 100;
  const by = height * 0.74;
  const bw = 200;
  const bh = 52;
  if(pointInRect(mouseX, mouseY, bx, by, bw, bh)){
    this.stopTransport(true);
    this.hideBpmInput();
    if(typeof gameManager !== "undefined" && gameManager && typeof gameManager.changeState === "function"){
      gameManager.changeState(gameState.START);
    }
    if(typeof changeScene === "function" && typeof scenes !== "undefined"){
      changeScene(scenes.EMPTY);
    }
    return true;
  }
  return false;
};
