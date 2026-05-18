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
  EDNING: 10
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

function preload(){
  images.player = loadImage("Resources/Images/kirby.png");
  images.bed = loadImage("Resources/Images/bed.png");
  images.sink = loadImage("Resources/Images/sink.png");
  images.bench = loadImage("Resources/Images/bench.png");
  images.introBackground = loadImage("Resources/Images/intro.png");
  images.map_selection = loadImage("Resources/Images/map_selection.png");
  images.calling = loadImage("Resources/Images/calling.png");
}

function setup() {
  createCanvas(1280, 720);
  initDebugButtons();
  gameManager = new GameManager();
  startButton = new StartButton(width/2, height * 0.75, 200, 100);
  mapButton = new MapButton(0.16*width, 0.06*height, 100, 50);
  mapButton.changeShowState(false);
  callButton = new CallButton(0.84*width, 0.06*height, 100, 50);
  callButton.changeShowState(false);
  player = new Player(width/2, height/2, images.player, 0.25, true, 1);
  initMapButtons();
  initBackgroundImage();
  sceneNum = 0;
  for(let i=0; i<totalSceneNum; i++) sceneObjects.push([]);
  // 씬 오브젝트 배치
  // 시냇가 씬
  sceneObjects[scenes.STREAM].push(new GameObject(1000, 200, images.bench));
  // 안방씬
  sceneObjects[scenes.BEDROOM].push(new GameObject(200, 200, images.bed));
  // 부엌 씬
  sceneObjects[scenes.KITCHEN].push(new GameObject(400, 200, images.sink));
  // 마당 씬
  sceneObjects[scenes.OUTSIDE].push(new GameObject(400, 200, images.sink));
}

function draw() {
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
  if(keyCode == 84){
    isDebugMode = !isDebugMode;
    for(let button of debugButtons){
      button.changeShowState(isDebugMode);
    }
  }
}

function mousePressed(){
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
  let outsideButton = new OutsideButton(width*0.34, height*0.52, 80, 80);
  let bedroomButton = new BedroomButton(width*0.255, height*0.29, 80, 80);
  let kitchenButton = new KitchenButton(width*0.4, height*0.28, 80, 80);
  let streamButton = new StreamButton(width*0.74, height*0.38, 80, 80);
  mapButtons.push(streamButton);
  mapButtons.push(bedroomButton);
  mapButtons.push(kitchenButton);
  mapButtons.push(outsideButton);
  for(let button of mapButtons) button.changeShowState(false);
}
function initBackgroundImage(){
  for(let i=0; i<totalSceneNum; i++) backgroundImage.push(null);
  backgroundImage[scenes.INTRO] = images.introBackground;
  backgroundImage[scenes.MAP_SELECT] = images.map_selection;
  backgroundImage[scenes.CALLING] = images.calling;
}