/*
  RE: summER - 후편집 기능 전용 DAW 시스템 v7
  - 1280 x 720 발표용 캔버스
  - FL Studio / Cubase식 선형 Arrangement 인터페이스
  - 오디오 클립을 시간축 위에 자유 배치
  - BPM 기반 스냅, 초/분 단위 타임룰러, 가로/세로 줌 인/아웃
  - 좌클릭 1회: 클립 선택
  - 좌클릭 2회: 해당 위치에 클립 추가
  - 우클릭: 선택/지정 클립 독립 편집
  - DELETE 버튼/키: 선택 클립 삭제
  - p5.SoundFile.getPeaks() 기반 파형 표시
  - PLAY/STOP 및 Space Bar 기반 재생바 이동
  - 재생바 클릭/드래그 이동
  - 왼쪽 SOUND 패널 클릭 시 해당 트랙/클립 위치로 포커싱
  - 재생바를 기준점으로 가로 줌 고정
*/

const POST_EDIT_TIMELINE_SECONDS = 120; // 2 minutes
const POST_EDIT_SNAP_DIVISION = 4; // quarter-beat magnetic snap
const POST_EDIT_FALLBACK_CLIP_SECONDS = 2.0;

class SoundManager{
  constructor(){
    this.tracks = [];
    this.message = "";
    this.messageUntil = 0;
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

  get storageKey(){
    return `re_summer_arrangement_v6_${this.id}`;
  }

  getDefaultClipLengthSeconds(){
    if(this.soundFile && typeof this.soundFile.duration === "function"){
      const d = this.soundFile.duration();
      if(Number.isFinite(d) && d > 0) return clamp(d, 0.35, 8);
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

    this.soundFile.setVolume(clip.volume);
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

  triggerClip(clip){
    if(!clip || !this.soundFile) return;

    this.applyClipMix(clip);
    const fileDuration = this.soundFile.duration ? this.soundFile.duration() : clip.lengthSeconds;
    const clipDuration = Math.min(fileDuration, clip.lengthSeconds * 0.98);
    this.soundFile.play(0, clip.rate, clip.volume, 0, clipDuration);
  }

  previewClip(clip){
    if(!clip || !this.soundFile) return;
    this.applyClipMix(clip);
    const fileDuration = this.soundFile.duration ? this.soundFile.duration() : 1.6;
    this.soundFile.play(0, clip.rate, clip.volume, 0, Math.min(fileDuration, clip.lengthSeconds, 2.2));
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

class MixerUI{
  constructor(soundManager){
    this.soundManager = soundManager;

    this.totalSeconds = POST_EDIT_TIMELINE_SECONDS;
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

    this.selectedTrackIndex = 0;
    this.selectedClipUid = null;
    this.selectedClipUids = [];
    this.editingTrackIndex = -1;
    this.editingClipUid = null;

    this.draggingSlider = null;
    this.sliderDefs = [];

    this.draggingPlayhead = false;
    this.selectionBox = null;
    this.isSelectingBox = false;

    this.bpmInput = null;
    this.bpmDraft = String(this.bpm);
    this.createBpmInput();
  }

  createBpmInput(){
    if(typeof createInput !== "function") return;
    this.bpmInput = createInput(String(this.bpm), "number");
    this.bpmInput.attribute("min", "40");
    this.bpmInput.attribute("max", "220");
    this.bpmInput.attribute("step", "1");
    this.bpmInput.style("width", "66px");
    this.bpmInput.style("height", "32px");
    this.bpmInput.style("box-sizing", "border-box");
    this.bpmInput.style("border", "1px solid #9e7a54");
    this.bpmInput.style("border-radius", "9px");
    this.bpmInput.style("background", "#fff3d6");
    this.bpmInput.style("color", "#3d2c1d");
    this.bpmInput.style("font-size", "15px");
    this.bpmInput.style("font-weight", "700");
    this.bpmInput.style("text-align", "center");
    this.bpmInput.input(() => {
      this.bpmDraft = String(this.bpmInput.value());
    });
    this.bpmInput.changed(() => this.commitBpmInput());
    this.bpmInput.elt.addEventListener("keydown", event => {
      event.stopPropagation();
      if(event.key === "Enter"){
        this.commitBpmInput();
        this.bpmInput.elt.blur();
      }
    });
    this.bpmInput.elt.addEventListener("blur", () => this.commitBpmInput());
  }

  commitBpmInput(){
    if(!this.bpmInput) return;
    const raw = String(this.bpmInput.value()).trim();
    if(raw === "" || raw === "-" || raw === "."){
      this.bpmInput.value(String(this.bpm));
      this.bpmDraft = String(this.bpm);
      return;
    }
    const parsed = Number(raw);
    if(!Number.isFinite(parsed)){
      this.bpmInput.value(String(this.bpm));
      this.bpmDraft = String(this.bpm);
      return;
    }
    this.setBpm(parsed);
  }

  setBpm(value){
    if(!Number.isFinite(value)) return;
    this.bpm = int(clamp(value, 40, 220));
    if(this.bpmInput && document.activeElement !== this.bpmInput.elt){
      this.bpmInput.value(String(this.bpm));
      this.bpmDraft = String(this.bpm);
    }
  }

  updateBpmInputPosition(){
    if(!this.bpmInput) return;
    this.bpmInput.show();

    const canvas = document.querySelector("canvas");
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
    this.bpmInput.position(rect.left + 842, rect.top + 18);
  }

  hideBpmInput(){
    if(this.bpmInput) this.bpmInput.hide();
  }

  get selectedTrack(){
    if(this.soundManager.tracks.length === 0) return null;
    this.selectedTrackIndex = clamp(this.selectedTrackIndex, 0, this.soundManager.tracks.length - 1);
    return this.soundManager.tracks[this.selectedTrackIndex];
  }

  get selectedClip(){
    if(!this.selectedClipUid && this.selectedClipUids.length > 0){
      this.selectedClipUid = this.selectedClipUids[this.selectedClipUids.length - 1];
    }
    if(!this.selectedClipUid) return null;
    for(const track of this.soundManager.tracks){
      const clip = track.getClipByUid(this.selectedClipUid);
      if(clip) return { track, clip };
    }
    return null;
  }

  isClipSelected(uid){
    return this.selectedClipUids.includes(uid) || this.selectedClipUid === uid;
  }

  setSingleSelection(trackIndex, clipUid){
    this.selectedTrackIndex = trackIndex;
    this.selectedClipUid = clipUid;
    this.selectedClipUids = clipUid ? [clipUid] : [];
  }

  setMultiSelection(items){
    this.selectedClipUids = items.map(item => item.clip.uid);
    if(items.length > 0){
      const last = items[items.length - 1];
      this.selectedTrackIndex = last.trackIndex;
      this.selectedClipUid = last.clip.uid;
    } else {
      this.selectedClipUid = null;
    }
  }

  get editingTrack(){
    if(this.editingTrackIndex < 0 || this.editingTrackIndex >= this.soundManager.tracks.length) return null;
    return this.soundManager.tracks[this.editingTrackIndex];
  }

  get editingClip(){
    const track = this.editingTrack;
    if(!track || !this.editingClipUid) return null;
    return track.getClipByUid(this.editingClipUid);
  }

  update(){
    this.updateBpmInputPosition();
    this.drawBackground();
    this.updateTransport();

    if(this.soundManager.tracks.length === 0){
      this.drawEmptyState();
      return;
    }

    this.clampScroll();
    this.clampVerticalScroll();
    this.drawLayout();
    if(this.editingClip) this.drawClipEditWindow();
  }

  beatDurationSec(){
    return 60 / this.bpm;
  }

  snapStepSec(){
    return this.beatDurationSec() / this.snapDivision;
  }

  updateTransport(){
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
      for(const clip of track.clips){
        if(this.playedClipIds.has(clip.uid)) continue;
        if(clip.startTimeSec >= prevPosition && clip.startTimeSec < timePosition + 0.006){
          track.triggerClip(clip);
          this.playedClipIds.add(clip.uid);
        }
      }
    }

    this.lastTimePositionSec = timePosition;
    this.autoScrollDuringPlayback();
  }

  transportSpeedMultiplier(){
    return this.bpm / 60;
  }

  autoScrollDuringPlayback(){
    const grid = this.getGridLayout();
    const visibleEnd = this.timelineScrollSec + this.visibleSeconds(grid);
    if(this.currentTimePositionSec > visibleEnd - 1.5){
      this.timelineScrollSec = this.currentTimePositionSec - this.visibleSeconds(grid) * 0.35;
      this.clampScroll();
    }
  }

  startTransport(){
    this.soundManager.stopAll();
    this.isPlaying = true;
    this.playStartMillis = millis();
    this.playStartTimeSec = clamp(this.currentTimePositionSec || 0, 0, this.totalSeconds - 0.01);
    this.lastTimePositionSec = this.playStartTimeSec;
    this.currentTimePositionSec = this.playStartTimeSec;
    this.playedClipIds.clear();
  }

  stopTransport(resetToStart = false){
    this.isPlaying = false;
    if(resetToStart) this.currentTimePositionSec = 0;
    this.lastTimePositionSec = this.currentTimePositionSec || 0;
    this.playedClipIds.clear();
    this.soundManager.stopAll();
  }

  toggleTransport(){
    this.isPlaying ? this.stopTransport(false) : this.startTransport();
  }

  drawBackground(){
    background(29, 28, 34);
  }

  drawEmptyState(){
    drawPanel(380, 230, 520, 220, "Post Edit DAW");
    push();
    fill(70, 50, 33);
    textAlign(CENTER, CENTER);
    textSize(17);
    text("등록된 사운드가 없습니다.", width / 2, height / 2);
    pop();
  }

  getLayout(){
    const margin = 28;
    const top = 86;
    const leftW = 220;
    const timelineX = margin + leftW + 16;
    const timelineW = width - margin * 2 - leftW - 16;
    const panelH = 560;
    return { margin, top, leftW, timelineX, timelineW, panelH };
  }

  drawLayout(){
    const layout = this.getLayout();
    this.drawHeader();
    drawPanel(layout.margin, layout.top, layout.leftW, layout.panelH, "SOUND");
    drawPanel(layout.timelineX, layout.top, layout.timelineW, layout.panelH, "ARRANGEMENT");
    this.drawSourceList(layout.margin, layout.top, layout.leftW, layout.panelH);
    this.drawArrangement(layout.timelineX, layout.top, layout.timelineW, layout.panelH);
  }

  drawHeader(){
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
    text("BPM", 800, 34);
    text("H", 1052, 34);
    text("V", 1160, 34);
    pop();

    drawSoftButton(920, 19, 30, 30, "−");
    drawSoftButton(956, 19, 30, 30, "+");
    drawSoftButton(1068, 19, 32, 30, "−");
    drawSoftButton(1104, 19, 32, 30, "+");
    drawSoftButton(1176, 19, 32, 30, "−");
    drawSoftButton(1212, 19, 32, 30, "+");
  }

  drawSourceList(x, y, w, h){
    const rowH = 70;
    for(let i = 0; i < this.soundManager.tracks.length; i++){
      const track = this.soundManager.tracks[i];
      const rowY = y + 58 + i * rowH;
      const selected = i === this.selectedTrackIndex;

      push();
      noStroke();
      fill(selected ? color(255, 239, 198) : color(250, 241, 221));
      rect(x + 12, rowY, w - 24, rowH - 12, 12);
      fill(track.color[0], track.color[1], track.color[2]);
      rect(x + 24, rowY + 15, 34, 30, 8);
      fill(58, 40, 26);
      textAlign(LEFT, CENTER);
      textStyle(BOLD);
      textSize(13);
      text(track.name, x + 70, rowY + 21, w - 88);
      textStyle(NORMAL);
      textSize(11);
      fill(106, 78, 52);
      text(track.sceneName, x + 70, rowY + 42);
      pop();
    }
  }

  drawArrangement(x, y, w, h){
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
  }

  getGridLayout(){
    const layout = this.getLayout();
    const labelW = 128;
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
  }

  visibleSeconds(grid = this.getGridLayout()){
    return grid.timelineInnerW / this.pixelsPerSecond;
  }

  trackContentHeight(){
    return this.soundManager.tracks.length * this.trackRowH;
  }

  visibleTrackHeight(grid = this.getGridLayout()){
    return Math.max(1, grid.laneBottomY - grid.laneStartY);
  }

  timeToX(timeSec, grid = this.getGridLayout()){
    return grid.cellStartX + (timeSec - this.timelineScrollSec) * this.pixelsPerSecond;
  }

  xToTime(x, grid = this.getGridLayout()){
    return this.timelineScrollSec + ((x - grid.cellStartX) / this.pixelsPerSecond);
  }

  snapTime(timeSec){
    const step = this.snapStepSec();
    return clamp(round(timeSec / step) * step, 0, this.totalSeconds);
  }

  clampScroll(){
    const grid = this.getGridLayout();
    const maxScroll = Math.max(0, this.totalSeconds - this.visibleSeconds(grid));
    this.timelineScrollSec = clamp(this.timelineScrollSec, 0, maxScroll);
  }

  clampVerticalScroll(){
    const grid = this.getGridLayout();
    const maxScroll = Math.max(0, this.trackContentHeight() - this.visibleTrackHeight(grid));
    this.verticalScrollPx = clamp(this.verticalScrollPx, 0, maxScroll);
  }

  formatTime(sec){
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const remain = Math.floor(s % 60);
    return `${m}:${String(remain).padStart(2, "0")}`;
  }

  pickMajorStep(){
    if(this.pixelsPerSecond >= 110) return 1;
    if(this.pixelsPerSecond >= 70) return 2;
    if(this.pixelsPerSecond >= 36) return 5;
    if(this.pixelsPerSecond >= 20) return 10;
    return 15;
  }


  drawPlayheadClickStrip(grid){
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
  }

  drawTimeRuler(grid){
    const visibleStart = this.timelineScrollSec;
    const visibleEnd = this.timelineScrollSec + this.visibleSeconds(grid);
    const majorStep = this.pickMajorStep();
    const firstMajor = Math.floor(visibleStart / majorStep) * majorStep;

    push();
    textAlign(CENTER, CENTER);
    textSize(10.5);
    for(let t = firstMajor; t <= visibleEnd + majorStep; t += majorStep){
      if(t < 0 || t > this.totalSeconds) continue;
      const x = this.timeToX(t, grid);
      const nextX = this.timeToX(t + majorStep, grid);
      stroke(255, 224, 145);
      strokeWeight(1.5);
      line(x, grid.headerY, x, grid.laneBottomY);
      noStroke();
      fill(239, 221, 186);
      rect(x + 2, grid.headerY, max(22, nextX - x - 4), 24, 6);
      fill(70, 50, 32);
      text(this.formatTime(t), x + min(max(26, (nextX - x) * 0.5), 42), grid.headerY + 12);
    }
    pop();
  }

  drawTimelineGrid(grid){
    const visibleStart = this.timelineScrollSec;
    const visibleEnd = this.timelineScrollSec + this.visibleSeconds(grid);
    let step = this.snapStepSec();
    while(step * this.pixelsPerSecond < 9) step *= 2;
    const first = Math.floor(visibleStart / step) * step;

    push();
    stroke(137, 107, 74, 50);
    strokeWeight(1);
    for(let t = first; t <= visibleEnd + step; t += step){
      if(t < 0 || t > this.totalSeconds) continue;
      const x = this.timeToX(t, grid);
      line(x, grid.headerY + 28, x, grid.laneBottomY);
    }
    pop();
  }

  drawTrackLane(trackIndex, grid){
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

    if(rowY + 30 >= grid.laneStartY && rowY + 30 <= grid.laneBottomY){
      fill(63, 45, 30);
      textAlign(LEFT, CENTER);
      textSize(12.5);
      text(track.name, grid.x + 28, rowY + 19, grid.labelW - 40);
      this.drawMiniWaveform(track, grid.x + 28, rowY + 34, 74, 14);
    }

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
      const hx = this.timeToX(snap, grid);
      const hw = this.timeToX(snap + track.getDefaultClipLengthSeconds(), grid) - hx;
      const previewH = this.getClipHeight(grid);
      const previewY = rowY + 10;
      if(hx < grid.timelineEndX && hx + hw > grid.cellStartX && previewY + previewH > grid.laneStartY && previewY < grid.laneBottomY){
        noFill();
        stroke(92, 61, 36, 150);
        strokeWeight(2);
        rect(max(hx, grid.cellStartX), clamp(previewY, grid.laneStartY, grid.laneBottomY - previewH), min(hw, grid.timelineEndX - max(hx, grid.cellStartX)), previewH, 6);
      }
    }
    pop();
  }

  drawClip(trackIndex, track, clip, grid, rowY){
    const rectInfo = this.getClipRect(trackIndex, clip, grid);
    if(rectInfo.x + rectInfo.w < grid.cellStartX || rectInfo.x > grid.timelineEndX) return;

    const clipped = this.clipRectToVisible(rectInfo, grid);
    const selectedClip = this.isClipSelected(clip.uid);
    const hover = pointInRect(mouseX, mouseY, clipped.x, clipped.y, clipped.w, clipped.h);

    push();
    noStroke();
    fill(track.color[0], track.color[1], track.color[2], selectedClip || hover ? 255 : 232);
    rect(clipped.x, clipped.y, clipped.w, clipped.h, 8);

    this.drawClipWaveform(track, clip, clipped);

    if(clip.delayWet > 0.05 || clip.reverbWet > 0.05 || clip.reverseMode || abs(clip.rate - 1) > 0.02){
      noStroke();
      fill(255, 231, 128);
      circle(clipped.x + clipped.w - 12, clipped.y + 11, 8);
    }

    if(selectedClip){
      noFill();
      stroke(255, 248, 203);
      strokeWeight(2);
      rect(clipped.x + 1, clipped.y + 1, clipped.w - 2, clipped.h - 2, 8);
    }
    pop();
  }

  clipRectToVisible(rectInfo, grid){
    const x1 = max(rectInfo.x, grid.cellStartX);
    const x2 = min(rectInfo.x + rectInfo.w, grid.timelineEndX);
    const y1 = max(rectInfo.y, grid.laneStartY);
    const y2 = min(rectInfo.y + rectInfo.h, grid.laneBottomY);
    return { x: x1, y: y1, w: max(1, x2 - x1), h: max(1, y2 - y1) };
  }

  drawClipWaveform(track, clip, rectInfo){
    const count = Math.max(24, int(rectInfo.w));
    let peaks = track.getPeaks(count);
    if(clip.reverseMode) peaks = [...peaks].reverse();

    push();
    stroke(255, 247, 220, 210);
    strokeWeight(clamp(rectInfo.h / 76, 1, 2.4));
    const midY = rectInfo.y + rectInfo.h / 2;
    if(peaks.length > 0){
      for(let i = 0; i < peaks.length; i++){
        const x = map(i, 0, peaks.length - 1, rectInfo.x + 5, rectInfo.x + rectInfo.w - 5);
        const amp = clamp(abs(peaks[i]), 0, 1);
        const halfH = Math.max(1, amp * rectInfo.h * 0.46);
        line(x, midY - halfH, x, midY + halfH);
      }
    } else {
      line(rectInfo.x + 8, midY, rectInfo.x + rectInfo.w - 8, midY);
    }
    pop();
  }

  getClipHeight(grid = this.getGridLayout()){
    return clamp(grid.rowH - 16, 20, this.maxTrackRowH - 14);
  }

  getClipRect(trackIndex, clip, grid = this.getGridLayout()){
    const rowY = grid.laneStartY + trackIndex * grid.rowH - this.verticalScrollPx;
    const x = this.timeToX(clip.startTimeSec, grid);
    const endTime = Math.min(clip.endTimeSec, this.totalSeconds);
    const w = Math.max(28, this.timeToX(endTime, grid) - x);
    const h = this.getClipHeight(grid);
    const y = rowY + Math.max(6, (grid.rowH - 10 - h) * 0.5);
    return { x, y, w, h };
  }

  drawPlayhead(grid){
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
  }

  drawHorizontalScrollbar(grid){
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
  }

  drawVerticalScrollbar(grid){
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
  }

  drawMiniWaveform(track, x, y, w, h){
    const peaks = track.getPeaks(28);
    push();
    stroke(115, 83, 55, 120);
    noFill();
    rect(x, y, w, h, 4);
    if(peaks.length > 0){
      stroke(track.color[0], track.color[1], track.color[2]);
      for(let i = 0; i < peaks.length; i++){
        const px = map(i, 0, peaks.length - 1, x + 3, x + w - 3);
        const amp = abs(peaks[i]);
        line(px, y + h / 2 - amp * h * 0.45, px, y + h / 2 + amp * h * 0.45);
      }
    }
    pop();
  }

  drawClipEditWindow(){
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
      { label: "Rate / Pitch", prop: "rate", min: 0.5, max: 1.8, x: modal.x + 44, y: modal.y + 176, w: modal.w - 88 },
      { label: "Pan", prop: "panValue", min: -1, max: 1, x: modal.x + 44, y: modal.y + 226, w: modal.w - 88 },
      { label: "Low Pass", prop: "lowPassFreq", min: 400, max: 10000, x: modal.x + 44, y: modal.y + 276, w: modal.w - 88 },
      { label: "Delay", prop: "delayWet", min: 0, max: 0.85, x: modal.x + 44, y: modal.y + 326, w: modal.w - 88 },
      { label: "Reverb", prop: "reverbWet", min: 0, max: 0.85, x: modal.x + 44, y: modal.y + 376, w: modal.w - 88 },
      { label: "Length", prop: "lengthSeconds", min: 0.25, max: 8, x: modal.x + 44, y: modal.y + 426, w: modal.w - 88 }
    ];

    for(const def of this.sliderDefs){
      this.drawSlider(def, clip[def.prop]);
    }

    this.drawToggle(modal.x + 44, modal.y + 456, modal.w - 88, 36, "Reverse", clip.reverseMode);

    drawSoftButton(modal.x + modal.w - 248, modal.y + modal.h - 52, 96, 34, "CLOSE");
    drawSoftButton(modal.x + modal.w - 140, modal.y + modal.h - 52, 96, 34, "DONE");
  }

  drawSlider(def, value){
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
  }

  drawToggle(x, y, w, h, label, active){
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
  }

  formatValue(def, value){
    if(def.prop === "lowPassFreq") return `${int(value)} Hz`;
    if(def.prop === "panValue") return nf(value, 1, 2);
    if(def.prop === "lengthSeconds") return `${nf(value, 1, 2)} s`;
    return nf(value, 1, 2);
  }

  getClipEditWindowRect(){
    return { x: 360, y: 66, w: 560, h: 560 };
  }

  getSourceIndexAtMouse(){
    const layout = this.getLayout();
    const rowH = 70;
    for(let i = 0; i < this.soundManager.tracks.length; i++){
      const rowY = layout.top + 58 + i * rowH;
      if(pointInRect(mouseX, mouseY, layout.margin + 12, rowY, layout.leftW - 24, rowH - 12)) return i;
    }
    return -1;
  }

  getLaneIndexAtMouse(){
    const grid = this.getGridLayout();
    if(mouseX < grid.cellStartX || mouseX > grid.timelineEndX) return -1;
    if(mouseY < grid.laneStartY || mouseY > grid.laneBottomY) return -1;
    const contentY = mouseY - grid.laneStartY + this.verticalScrollPx;
    const index = Math.floor(contentY / grid.rowH);
    if(index < 0 || index >= this.soundManager.tracks.length) return -1;
    return index;
  }

  getTimeAtMouse(){
    const grid = this.getGridLayout();
    if(mouseX < grid.cellStartX || mouseX > grid.timelineEndX) return null;
    return this.xToTime(mouseX, grid);
  }

  getClipAtMouse(){
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
  }

  mousePressed(){
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

    if(pointInRect(mouseX, mouseY, 920, 19, 30, 30)){
      this.setBpm(this.bpm - 1);
      return;
    }
    if(pointInRect(mouseX, mouseY, 956, 19, 30, 30)){
      this.setBpm(this.bpm + 1);
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
  }

  doubleClicked(){
    if(this.editingClip) return;

    let laneIndex = this.getLaneIndexAtMouse();
    if(laneIndex === -1){
      const clipHit = this.getClipAtMouse();
      if(clipHit) laneIndex = clipHit.trackIndex;
    }
    if(laneIndex === -1) return;

    const rawTime = this.getTimeAtMouse();
    if(rawTime === null) return;
    const track = this.soundManager.tracks[laneIndex];
    const clip = track.createClip(this.snapTime(rawTime));
    this.setSingleSelection(laneIndex, clip.uid);
    return false;
  }

  handleRightClick(){
    if(this.editingClip) return false;
    const clipHit = this.getClipAtMouse();
    if(!clipHit) return false;
    this.setSingleSelection(clipHit.trackIndex, clipHit.clip.uid);
    this.openClipEditWindow(clipHit.trackIndex, clipHit.clip.uid);
    return false;
  }

  removeSelectedClip(){
    const ids = this.selectedClipUids.length > 0 ? [...this.selectedClipUids] : (this.selectedClipUid ? [this.selectedClipUid] : []);
    if(ids.length === 0) return;

    for(const uid of ids){
      for(const track of this.soundManager.tracks){
        if(track.getClipByUid(uid)){
          track.removeClip(uid);
          break;
        }
      }
    }

    if(ids.includes(this.editingClipUid)) this.closeClipEditWindow();
    this.selectedClipUid = null;
    this.selectedClipUids = [];
  }

  handleEditWindowMousePressed(){
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
  }

  mouseDragged(){
    if(this.draggingSlider){
      this.updateSliderByMouse(this.draggingSlider);
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
  }

  mouseReleased(){
    if(this.isSelectingBox){
      this.finishMarqueeSelection();
    }
    this.draggingSlider = null;
    this.draggingScrollbar = null;
    this.draggingPlayhead = false;
  }

  updateSliderByMouse(def){
    const track = this.editingTrack;
    const clip = this.editingClip;
    if(!track || !clip) return;

    const ratio = clamp((mouseX - def.x) / def.w, 0, 1);
    const value = def.min + ratio * (def.max - def.min);
    track.setClipValue(clip.uid, def.prop, value);
  }

  keyPressed(){
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
    if(keyCode === DELETE || keyCode === BACKSPACE){
      this.removeSelectedClip();
      return;
    }
    if(keyCode === UP_ARROW){
      this.setBpm(this.bpm + 1);
      return;
    }
    if(keyCode === DOWN_ARROW){
      this.setBpm(this.bpm - 1);
    }
  }

  mouseWheel(event){
    const grid = this.getGridLayout();
    const overTimeline = pointInRect(mouseX, mouseY, grid.cellStartX, grid.headerY, grid.timelineInnerW, grid.scrollBarY - grid.headerY + 16);
    if(!overTimeline) return true;

    if(keyIsDown(SHIFT) || keyIsDown(CONTROL)){
      this.zoomBy(event.delta > 0 ? 0.9 : 1.1);
    } else {
      this.timelineScrollSec += event.delta * 0.018;
      this.clampScroll();
    }
    return false;
  }

  beginScrollbarDrag(){
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
  }

  updateScrollbarDrag(){
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
  }

  beginPlayheadDrag(){
    const grid = this.getGridLayout();
    const x = this.timeToX(this.currentTimePositionSec, grid);
    const onPlayheadHandle = pointInRect(mouseX, mouseY, grid.cellStartX, grid.playheadHandleY, grid.timelineInnerW, grid.playheadHandleH);
    const nearPlayhead = abs(mouseX - x) <= 9 && mouseY >= grid.playheadHandleY && mouseY <= grid.laneBottomY;
    if(!onPlayheadHandle && !nearPlayhead) return false;
    this.draggingPlayhead = true;
    this.updatePlayheadDrag();
    return true;
  }

  updatePlayheadDrag(){
    const grid = this.getGridLayout();
    const newTime = clamp(this.xToTime(clamp(mouseX, grid.cellStartX, grid.timelineEndX), grid), 0, this.totalSeconds);
    this.currentTimePositionSec = newTime;
    this.lastTimePositionSec = newTime;
    this.playStartTimeSec = newTime;
    this.playStartMillis = millis();
    this.playedClipIds.clear();
  }

  beginMarqueeSelection(){
    const grid = this.getGridLayout();
    if(!pointInRect(mouseX, mouseY, grid.cellStartX, grid.laneStartY, grid.timelineInnerW, grid.laneBottomY - grid.laneStartY)) return false;
    this.isSelectingBox = true;
    this.selectionBox = { startX: mouseX, startY: mouseY, endX: mouseX, endY: mouseY };
    this.selectedClipUid = null;
    this.selectedClipUids = [];
    return true;
  }

  updateMarqueeSelection(){
    if(!this.selectionBox) return;
    const grid = this.getGridLayout();
    this.selectionBox.endX = clamp(mouseX, grid.cellStartX, grid.timelineEndX);
    this.selectionBox.endY = clamp(mouseY, grid.laneStartY, grid.laneBottomY);
  }

  finishMarqueeSelection(){
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
  }

  getNormalizedSelectionBox(){
    const box = this.selectionBox;
    if(!box) return { x: 0, y: 0, w: 0, h: 0 };
    const x1 = Math.min(box.startX, box.endX);
    const y1 = Math.min(box.startY, box.endY);
    const x2 = Math.max(box.startX, box.endX);
    const y2 = Math.max(box.startY, box.endY);
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  rectsIntersect(a, b){
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  drawSelectionBox(){
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
  }

  zoomBy(multiplier, anchorX = null){
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
  }

  zoomVerticalBy(multiplier, anchorY = null){
    const grid = this.getGridLayout();
    const y = anchorY === null ? grid.laneStartY + this.visibleTrackHeight(grid) / 2 : clamp(anchorY, grid.laneStartY, grid.laneBottomY);
    const contentY = this.verticalScrollPx + (y - grid.laneStartY);
    const anchorRatio = contentY / Math.max(1, this.trackRowH);
    this.trackRowH = clamp(this.trackRowH * multiplier, this.minTrackRowH, this.maxTrackRowH);
    this.verticalScrollPx = anchorRatio * this.trackRowH - (y - grid.laneStartY);
    this.clampVerticalScroll();
  }


  focusTrackInArrangement(trackIndex){
    if(trackIndex < 0 || trackIndex >= this.soundManager.tracks.length) return;

    const track = this.soundManager.tracks[trackIndex];
    const grid = this.getGridLayout();
    const visibleH = this.visibleTrackHeight(grid);

    this.selectedTrackIndex = trackIndex;

    if(track.clips.length > 0){
      const clipsByTime = [...track.clips].sort((a, b) => a.startTimeSec - b.startTimeSec || (a.zIndex || 0) - (b.zIndex || 0));
      const firstClip = clipsByTime[0];
      this.selectedClipUid = firstClip.uid;
      this.selectedClipUids = [firstClip.uid];

      const minStart = Math.min(...clipsByTime.map(clip => clip.startTimeSec));
      const maxEnd = Math.max(...clipsByTime.map(clip => clip.endTimeSec));
      const visibleSec = this.visibleSeconds(grid);
      const clipRange = maxEnd - minStart;

      if(clipRange <= visibleSec){
        this.timelineScrollSec = minStart - (visibleSec - clipRange) * 0.42;
      } else {
        this.timelineScrollSec = minStart - 0.8;
      }
    } else {
      this.selectedClipUid = null;
      this.selectedClipUids = [];
    }

    this.verticalScrollPx = trackIndex * this.trackRowH - visibleH * 0.34;
    this.clampScroll();
    this.clampVerticalScroll();
  }

  openClipEditWindow(trackIndex, clipUid){
    const track = this.soundManager.tracks[trackIndex];
    if(!track) return;
    const clip = track.getClipByUid(clipUid);
    if(!clip) return;

    this.setSingleSelection(trackIndex, clipUid);
    this.editingTrackIndex = trackIndex;
    this.editingClipUid = clipUid;
    this.draggingSlider = null;
  }

  closeClipEditWindow(){
    this.editingTrackIndex = -1;
    this.editingClipUid = null;
    this.draggingSlider = null;
  }

  previewSelectedClip(){
    const selected = this.selectedClip;
    if(selected){
      selected.track.previewClip(selected.clip);
    }
  }

  finishMix(){
    this.stopTransport(false);
    this.closeClipEditWindow();
    this.hideBpmInput();
    if(typeof gameManager !== "undefined" && gameManager && typeof gameManager.changeState === "function"){
      gameManager.changeState(gameState.END);
    }
  }
}
