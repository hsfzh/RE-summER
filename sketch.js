// 전역 변수
let isDebugMode = false;
let backObjects = [];
let midObjects = [];
let frontObjects = [];
let objects = [];
let buttons = [];
let gameState = {
  INTRO: 0, //게임 인트로 차타고 가는 시작 씬 재생중 상태
  MAP_SELECT: 1, //맵 선택 상태
  PLAYING: 2, //게임 진행중 상태
  CALLING: 3, //엄마와 전화 중 상태
  RETURN_CAR: 4, //차타고 귀가하는 씬
  EDITING: 5, //게임 후반부 소리 편집 상태
  END: 6, //게임 엔딩 씬 재생중 상태
  NONE: 7 //게임 시작전 상태
}
let backgroundImage = [];
let sceneNum;
let scenes = { // 빈씬:0, 시냇가:1, 안방:2, 부엌:3, 마당:4, 인트로:5, 맵선택씬:6, 전화씬:7, 귀가씬:8, 편집씬:9, 엔딩씬:10
  EMPTY: 0,
  STREAM: 1,
  BEDROOM: 2,
  KITCHEN: 3,
  OUTSIDE: 4,
  INTRO: 5,
  MAP_SELECT: 6,
  CALLING: 7,
  RETURN_CAR: 8,
  EDIT_SCENE: 9,
  ENDING: 10
};
let totalSceneNum = 11; 
// 객체들
let startButton;
let mapButton;
let gameManager;
let player;
let callButton;
let sceneObjects = []; //각 씬에서만 사용하는 오브젝트는 따로 변수 선언 없이 setup에서 생성 및 배열에 추가
let mapButtons = [];
// 이미지
let images = {}; // 딕셔너리 형태 preload에서 images.player = loadImage 이렇게 새로운 변수 생성 없이 초기화
let returnVideo;

let postEditSoundFiles = {};
const postEditBgmConfig = { id: "main_bgm_source", name: "MAIN BGM", sceneName: "MAIN", file: "Resources/Sounds/final/main_bgm.mp3", color: [86, 132, 210], volume: 0.26, masterVolume: 0.78, lowPassFreq: 9200, reverbWet: 0.06 };
const postEditSoundConfigs = [
  { id: "creek_water", name: "시냇물", sceneName: "시냇가", file: "Resources/Sounds/final/creek_water.m4a", color: [78, 157, 202], volume: 0.92, lowPassFreq: 8500, reverbWet: 0.12 },
  { id: "cricket", name: "귀뚜라미", sceneName: "마당", file: "Resources/Sounds/final/cricket.m4a", color: [110, 168, 96], volume: 0.9, lowPassFreq: 9200, reverbWet: 0.16 },
  { id: "fan_hum", name: "선풍기", sceneName: "안방", file: "Resources/Sounds/final/fan_hum.m4a", color: [126, 143, 175], volume: 0.88, rate: 0.95, lowPassFreq: 3600, delayWet: 0.03 },
  { id: "old_tv", name: "브라운관 TV", sceneName: "안방", file: "Resources/Sounds/final/old_tv.m4a", color: [180, 115, 205], volume: 0.86, lowPassFreq: 4300, delayWet: 0.08 },
  { id: "wood_chop", name: "장작 패기", sceneName: "부엌", file: "Resources/Sounds/final/wood_chop.m4a", color: [168, 101, 58], volume: 0.98, lowPassFreq: 8800 },
  { id: "phone_ring", name: "전화벨", sceneName: "안방", file: "Resources/Sounds/final/phone_ring.m4a", color: [228, 176, 72], volume: 0.96, lowPassFreq: 9600, delayWet: 0.04 },
  { id: "knife_chop", name: "도마 칼질", sceneName: "부엌", file: "Resources/Sounds/final/knife_chop.m4a", color: [224, 137, 70], volume: 1.0, lowPassFreq: 10000 },
  { id: "fish_catch_underwater", name: "물고기 잡기", sceneName: "시냇가", file: "Resources/Sounds/final/fish_catch_underwater.m4a", color: [73, 146, 186], volume: 0.94, lowPassFreq: 7000, reverbWet: 0.10 },
  { id: "stew_boil", name: "찌개 끓기", sceneName: "부엌", file: "Resources/Sounds/final/stew_boil.m4a", color: [210, 96, 74], volume: 0.94, lowPassFreq: 6200, reverbWet: 0.10 },
  { id: "dog_bark", name: "강아지", sceneName: "마당", file: "Resources/Sounds/final/dog_bark.m4a", color: [190, 134, 76], volume: 0.98, lowPassFreq: 9500 },
  { id: "lamp_switch", name: "스탠드 스위치", sceneName: "안방", file: "Resources/Sounds/final/lamp_switch.m4a", color: [245, 203, 92], volume: 0.96, lowPassFreq: 9800 },
  { id: "helicopter_pass", name: "헬리콥터", sceneName: "마당", file: "Resources/Sounds/final/helicopter_pass.m4a", color: [122, 132, 150], volume: 0.9, lowPassFreq: 5600, delayWet: 0.05 },
  { id: "sweeping_yard", name: "마당 쓸기", sceneName: "마당", file: "Resources/Sounds/final/sweeping_yard.m4a", color: [143, 115, 77], volume: 0.92, lowPassFreq: 6500 },
  { id: "water_splash", name: "물 첨벙", sceneName: "시냇가", file: "Resources/Sounds/final/water_splash.m4a", color: [88, 175, 215], volume: 0.98, lowPassFreq: 9000, reverbWet: 0.08 },
  { id: "grilling_meat", name: "고기 굽기", sceneName: "부엌", file: "Resources/Sounds/final/grilling_meat.m4a", color: [193, 92, 55], volume: 0.94, lowPassFreq: 7200 }
];
//soundManager
let soundManager;
let mixerUI;

function preload(){
  soundFormats("mp3", "m4a", "wav", "ogg");
  images.player = [ //up, down, left, right
    loadImage("Resources/Images/player_back.png"),
    loadImage("Resources/Images/player_back2.png"),
    loadImage("Resources/Images/player_front.png"),
    loadImage("Resources/Images/player_front2.png"),
    loadImage("Resources/Images/player_left.png"),
    loadImage("Resources/Images/player_left2.png"),
    loadImage("Resources/Images/player_right.png"),
    loadImage("Resources/Images/player_right2.png"),
  ];
  images.introBackground = loadImage("Resources/Images/intro.png");
  images.map = loadImage("Resources/Images/map.png");
  images.stream = loadImage("Resources/Images/stream.png");
  images.bedroom = loadImage("Resources/Images/bedroom.png");
  images.kitchen = loadImage("Resources/Images/kitchen.png");
  images.outside = loadImage("Resources/Images/outside.png");
  images.calling = loadImage("Resources/Images/calling.png");
  images.my_room = loadImage("Resources/Images/my_room.png");
  images.my_room_radio = loadImage("Resources/Images/my_room_radio.png");
  images.return = [];
  images.return[0] = loadImage("Resources/Images/return0.png");
  images.return[1] = loadImage("Resources/Images/return1.png");
  images.return[2] = loadImage("Resources/Images/return2.png");
  images.return[3] = loadImage("Resources/Images/return3.png");
  images.return[4] = loadImage("Resources/Images/return4.png");
  images.return[5] = loadImage("Resources/Images/return5.png");
  images.call_mom = loadImage("Resources/Images/icons/call_mom.png");

  SOUND_LIBRARY.water.icon = loadImage("Resources/Images/icons_outside.png");
  SOUND_LIBRARY.water.audio = loadSound("Resources/Sounds/knock.mp3");
  SOUND_LIBRARY.clock.icon = loadImage("Resources/Images/icons_kitchen.png");
  SOUND_LIBRARY.clock.audio = loadSound("Resources/Sounds/ticktock.mp3");
  postEditSoundFiles[postEditBgmConfig.id] = loadSound(postEditBgmConfig.file);
  for(const config of postEditSoundConfigs){
    postEditSoundFiles[config.id] = loadSound(config.file);
  }

  SOUND_LIBRARY.bark.icon = loadImage("Resources/Images/icons/dog.png");
  SOUND_LIBRARY.bark.audio = loadSound("Resources/Sounds/bark.m4a");
 
  SOUND_LIBRARY.broom.icon = loadImage("Resources/Images/icons/broom.png");
  SOUND_LIBRARY.broom.audio = loadSound("Resources/Sounds/broom.m4a");
  
  SOUND_LIBRARY.cricket.icon = loadImage("Resources/Images/icons/cricket.png");
  SOUND_LIBRARY.cricket.audio = loadSound("Resources/Sounds/cricket.m4a");

  SOUND_LIBRARY.fan.icon = loadImage("Resources/Images/icons/fan.png");
  SOUND_LIBRARY.fan.audio = loadSound("Resources/Sounds/fan.m4a");
  
  SOUND_LIBRARY.meat.icon = loadImage("Resources/Images/icons/meat.png");
  SOUND_LIBRARY.meat.audio = loadSound("Resources/Sounds/meat.m4a");

  SOUND_LIBRARY.riverKid.icon = loadImage("Resources/Images/icons/river_kid.png");
  SOUND_LIBRARY.riverKid.audio = loadSound("Resources/Sounds/river_kid.m4a");

  SOUND_LIBRARY.splash.icon = loadImage("Resources/Images/icons/river.png");
  SOUND_LIBRARY.splash.audio = loadSound("Resources/Sounds/splash.m4a");

  SOUND_LIBRARY.stew.icon = loadImage("Resources/Images/icons/stew.png");
  SOUND_LIBRARY.stew.audio = loadSound("Resources/Sounds/stew.m4a");
 
  SOUND_LIBRARY.tv.icon = loadImage("Resources/Images/icons/tv.png");
  SOUND_LIBRARY.tv.audio = loadSound("Resources/Sounds/tv.m4a");

  SOUND_LIBRARY.wood.icon = loadImage("Resources/Images/icons/wood.png");
  SOUND_LIBRARY.wood.audio = loadSound("Resources/Sounds/wood.m4a");
}

function setup() {
  const mainCanvas = createCanvas(1280, 720);
  mainCanvas.elt.addEventListener("wheel", event => {
    if(event.ctrlKey || event.metaKey) event.preventDefault();
  }, { passive: false });
  initDebugButtons();
  gameManager = new GameManager();
  startButton = new StartButton(width/2, height * 0.75, 200, 100);
  mapButton = new MapButton(0.16*width, 0.06*height, 100, 50);
  mapButton.changeShowState(false);
  callButton = new CallButton(0.88*width, 0.06*height, 100, 50, images.call_mom);
  callButton.changeShowState(false);
  player = new Player(width/2, height/2, images.player, 0.2, true, 1);
  initMapButtons();
  initBackgroundImage();
  sceneNum = 0;
  for(let i=0; i<totalSceneNum; i++) sceneObjects.push([]);
  console.log(sceneObjects);
  // 씬 오브젝트 배치
  // 시냇가 씬
  // 안방씬
  // 부엌 씬
  // 마당 씬
  initSceneObjects(player); //SceneObjectLoader.js
  returnVideo = createVideo("Resources/Videos/return.mp4");
  returnVideo.hide();

  initPostEditSystem();
}

function draw() {
  if(gameManager && (gameManager.currentState === gameState.EDITING || gameManager.currentState === gameState.END)){
    gameManager.update(deltaTime/1000);
    return;
  }
  soundManager = new SoundManager();
  mixerUI = new MixerUI(soundManager);
  mixerUI.hideBpmInput();
}

function draw() {
  if (gameManager.currentState === gameState.EDITING) {
    mixerUI.update();
    return;
  }

  drawBackground(sceneNum);
  debugDraw(); // 디버깅용
  gameManager.update(deltaTime/1000);
  for(let button of buttons){
    button.update();
    if(button.show)
      button.display();
  }
}

function keyPressed(){
  if(gameManager && gameManager.currentState === gameState.EDITING && mixerUI){
    userStartAudio();
    return mixerUI.keyPressed();
  }
  if(gameManager && gameManager.currentState === gameState.END){
    userStartAudio();
    return false;
  }
  if (gameManager.currentState === gameState.EDITING) {
    mixerUI.keyPressed();
    return false;
  }
  if(keyCode == 84){
    isDebugMode = !isDebugMode;
    for(let button of debugButtons){
      button.changeShowState(isDebugMode);
    }
  }
}

function mousePressed(){
  if(gameManager && gameManager.currentState === gameState.EDITING && mixerUI){
    userStartAudio();
    return mixerUI.mousePressed();
  }
  if(gameManager && gameManager.currentState === gameState.END && mixerUI){
    userStartAudio();
    return mixerUI.mousePressedFinishScreen();
  }

  if (gameManager.currentState === gameState.EDITING) {
    mixerUI.mousePressed();
    return false;
  }
  
  for(let button of buttons){
    if(button.ishovering && button.show){
      button.performAction();
    }
  }
}

function changeScene(newSceneNum){
  sceneNum = newSceneNum;
  for(i=1; i<totalSceneNum; i++){
    if(i==sceneNum)
      for(let object of sceneObjects[i]) object.activate();
    else
      for(let object of sceneObjects[i]) object.deactivate();
  }
  if(gameManager.currentState == gameState.MAP_SELECT){
    console.log(player.visitedMap);
    callButton.changeShowState(player.hasVisitedAllMaps());
  }
}

function drawBackground(){
  // 배경 정리
  background(200);
  // 배경 이미지
  showImage(backgroundImage[sceneNum], 0, width/2, height/2);
}
function initMapButtons(){
  let outsideButton = new OutsideButton(width*0.34, height*0.56, 80, 80);
  let bedroomButton = new BedroomButton(width*0.21, height*0.31, 80, 80);
  let kitchenButton = new KitchenButton(width*0.4, height*0.31, 80, 80);
  let streamButton = new StreamButton(width*0.79, height*0.42, 80, 80);
  mapButtons.push(streamButton);
  mapButtons.push(bedroomButton);
  mapButtons.push(kitchenButton);
  mapButtons.push(outsideButton);
  for(let button of mapButtons) button.changeShowState(false);
}
function initBackgroundImage(){
  for(let i=0; i<totalSceneNum; i++) backgroundImage.push(null);
  backgroundImage[scenes.INTRO] = images.introBackground;
  backgroundImage[scenes.MAP_SELECT] = images.map;
  backgroundImage[scenes.STREAM] = images.stream;
  backgroundImage[scenes.BEDROOM] = images.bedroom;
  backgroundImage[scenes.KITCHEN] = images.kitchen;
  backgroundImage[scenes.OUTSIDE] = images.outside;
  backgroundImage[scenes.RETURN_CAR] = images.return[0];
  backgroundImage[scenes.CALLING] = images.calling;
}

function doubleClicked(){
  if(gameManager && gameManager.currentState === gameState.EDITING && mixerUI){
    userStartAudio();
    return mixerUI.doubleClicked();
  }
}

function mouseDragged(){
  if(gameManager && gameManager.currentState === gameState.EDITING && mixerUI){
    mixerUI.mouseDragged();
  }
}

function mouseReleased(){
  if(gameManager && gameManager.currentState === gameState.EDITING && mixerUI){
    mixerUI.mouseReleased();
  }
}

function mouseWheel(event){
  if(gameManager && gameManager.currentState === gameState.EDITING && mixerUI && typeof mixerUI.mouseWheel === "function"){
    return mixerUI.mouseWheel(event);
  }
}

function initPostEditSystem(){
  soundManager = new SoundManager();
  soundManager.registerBgmOptions([{
    ...postEditBgmConfig,
    soundFile: postEditSoundFiles[postEditBgmConfig.id]
  }]);
  soundManager.collectMany(postEditSoundConfigs.map(config => ({
    ...config,
    soundFile: postEditSoundFiles[config.id]
  })));
  mixerUI = new MixerUI(soundManager);
  document.addEventListener("contextmenu", event => {
    if(gameManager && (gameManager.currentState === gameState.EDITING || gameManager.currentState === gameState.END)) event.preventDefault();
  });
}

function enterPostEditMode() {
  soundManager.tracks = [];

  for (let item of player.inventory.items) {
    const soundId = item.soundId;
    const data = SOUND_LIBRARY[soundId];

    if (!data || !data.audio) continue;

    soundManager.collect({
      id: soundId,
      name: data.name || soundId,
      soundFile: data.audio,
      sceneName: "",
      color: [190, 130, 80]
    });
  }

  gameManager.changeState(gameState.EDITING);
}
