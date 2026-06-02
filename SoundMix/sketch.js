// RE: summER - 후편집 기능만 보여주는 발표용 sketch.js
// 공동 작업물과 맞추기 위해 gameState / SoundManager / MixerUI 구조 유지

let gameState = {
  START: 0,
  PLAYING: 1,
  EDITING: 2,
  END: 3
};

let gameManager;
let soundManager;
let mixerUI;
let demoSoundFiles = {};

const demoSoundConfigs = [
  { id: "creek_water", name: "시냇물", sceneName: "시냇가", file: "Resources/Sounds/creek_water.wav", color: [80, 160, 205], volume: 0.55, lowPassFreq: 7800, reverbWet: 0.12 },
  { id: "cicada_night", name: "매미", sceneName: "마당", file: "Resources/Sounds/cicada_night.wav", color: [105, 170, 96], volume: 0.38, lowPassFreq: 9300 },
  { id: "old_tv", name: "브라운관 TV", sceneName: "안방", file: "Resources/Sounds/old_tv.wav", color: [180, 115, 205], volume: 0.48, lowPassFreq: 4300, delayWet: 0.08 },
  { id: "fan_hum", name: "선풍기", sceneName: "안방", file: "Resources/Sounds/fan_hum.wav", color: [130, 145, 175], volume: 0.42, rate: 0.85, lowPassFreq: 2500 },
  { id: "knife_chop", name: "도마 칼질", sceneName: "부엌", file: "Resources/Sounds/knife_chop.wav", color: [224, 137, 70], volume: 0.70, lowPassFreq: 10000 },
  { id: "stew_bubble", name: "찌개 보글보글", sceneName: "부엌", file: "Resources/Sounds/stew_bubble.wav", color: [210, 96, 74], volume: 0.58, lowPassFreq: 6200, reverbWet: 0.10 }
];

function preload(){
  soundFormats("wav", "mp3", "ogg");
  for(const config of demoSoundConfigs){
    demoSoundFiles[config.id] = loadSound(config.file);
  }
}

function setup(){
  createCanvas(1280, 720);
  textFont("sans-serif");

  gameManager = new DemoGameManager();
  soundManager = new SoundManager();

  soundManager.collectMany(demoSoundConfigs.map(config => ({
    ...config,
    soundFile: demoSoundFiles[config.id]
  })));

  mixerUI = new MixerUI(soundManager);
  document.addEventListener("contextmenu", event => event.preventDefault());
  gameManager.changeState(gameState.EDITING);
}

function draw(){
  if(gameManager.currentState === gameState.EDITING){
    mixerUI.update(deltaTime / 1000);
  } else if(gameManager.currentState === gameState.END){
    drawEndingScreen();
  }
}

function mousePressed(){
  userStartAudio();
  if(gameManager.currentState === gameState.EDITING) return mixerUI.mousePressed();
}

function doubleClicked(){
  userStartAudio();
  if(gameManager.currentState === gameState.EDITING){
    return mixerUI.doubleClicked();
  }
}

function mouseDragged(){
  if(gameManager.currentState === gameState.EDITING) mixerUI.mouseDragged();
}

function mouseReleased(){
  if(gameManager.currentState === gameState.EDITING) mixerUI.mouseReleased();
}


function mouseWheel(event){
  if(gameManager.currentState === gameState.EDITING && mixerUI && typeof mixerUI.mouseWheel === "function"){
    return mixerUI.mouseWheel(event);
  }
}

function keyPressed(){
  userStartAudio();
  if(gameManager.currentState === gameState.EDITING){
    return mixerUI.keyPressed();
  } else if(gameManager.currentState === gameState.END && (key === "r" || key === "R")){
    gameManager.changeState(gameState.EDITING);
  }
}

function drawEndingScreen(){
  background(35, 30, 44);

  push();
  noStroke();
  fill(255, 187, 90, 38);
  ellipse(width / 2, height / 2, 540, 540);

  fill(105, 72, 44);
  rectMode(CENTER);
  rect(width / 2, height / 2 + 20, 340, 190, 28);
  fill(71, 48, 31);
  rect(width / 2, height / 2 + 22, 285, 118, 18);
  fill(236, 183, 90);
  ellipse(width / 2 - 82, height / 2 + 22, 74, 74);
  ellipse(width / 2 + 82, height / 2 + 22, 74, 74);
  pop();
}

class DemoGameManager{
  constructor(){
    this.currentState = gameState.START;
  }

  changeState(newState){
    this.currentState = newState;
  }
}
