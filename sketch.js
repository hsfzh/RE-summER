// 전역 변수
let isDebugMode = false;
let backObjects = [];
let midObjects = [];
let frontObjects = [];
let objects = [];
let buttons = [];
let gameState = {
  START: 0,
  MAP_SELECT: 1,
  PLAYING: 2,
  EDITING: 3,
  END: 4,
  NONE: 5
}
let backgroundImage = [];
let sceneNum;
let scenes = { // 빈씬:0, 시냇가:1, 안방:2, 부엌:3, 마당:4, 인트로:5, 맵선택씬:6, 편집씬:7
  EMPTY: 0,
  STREAM: 1,
  BEDROOM: 2,
  KITCHEN: 3,
  OUTSIDE: 4,
  INTRO: 5,
  MAP_SELECT: 6,
  EDIT_SCENE: 7
};
let totalSceneNum = 8; 
// 객체들
let startButton;
let mapButton;
let gameManager;
let player;
let returnButton;
let sceneObjects = [];
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
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  gameManager = new GameManager();
  startButton = new StartButton(width/2, height * 0.75, 200, 100);
  mapButton = new MapButton(200, 40, 100, 50);
  mapButton.changeShowState(false);
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
  if(keyCode == 84) isDebugMode = !isDebugMode;
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
}
function drawBackground(){
  // 배경 정리
  background(255);
  // 배경 이미지
  showImage(backgroundImage[sceneNum], 0, width/2, height/2);
}
function initMapButtons(){
  let outsideButton = new OutsideButton(500, 400, 80, 80);
  let bedroomButton = new BedroomButton(380, 220, 80, 80);
  let kitchenButton = new KitchenButton(580, 220, 80, 80);
  let streamButton = new StreamButton(1050, 290, 80, 80);
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
}
function debugDraw(){
  if(isDebugMode){
    push();
    strokeWeight(5);
    let lineIndex = 0;
    for(let x = 0; x<width; x+=20){
      setLineColor(int(lineIndex / 10));
      line(x, 0, x, height);
      lineIndex += 1;
    }
    lineIndex = 0;
    for(let y = 0; y<height; y+=20){
      setLineColor(int(lineIndex / 10));
      line(0, y, width, y);
      lineIndex += 1;
    }
    pop();
  }
}
function setLineColor(num){
  switch(num){
    case 0:
      stroke(255, 0, 0);
      break;
    case 1:
      stroke(255, 127, 0);
      break;
    case 2:
      stroke(255, 255, 0);
      break;
    case 3:
      stroke(0, 255, 0);
      break;
    case 4:
      stroke(0, 0, 255);
      break;
    case 5:
      stroke(75, 0, 130);
      break;
    default:
    case 6:
      stroke(148, 0, 211);
      break;
  }
}