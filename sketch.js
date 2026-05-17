// 전역 변수
let isDebugMode = false;
let backObjects = [];
let midObjects = [];
let frontObjects = [];
let objects = [];
let buttons = [];
let gameState = {
  START: 0,
  PLAYING: 1,
  EDITING: 2,
  END: 3 
}
let backgroundColor;
let sceneNum;
let scenes = { // 시냇가:1, 안방:2, 부엌:3, 마당:4, 빈씬:0, 총 5개
  EMPTY: 0,
  STREAM: 1,
  BEDROOM: 2,
  KITCHEN: 3,
  OUTSIDE: 4
};
let totalSceneNum = 5; 
// 객체들
let gameManager;
let player;
let outsideButton;
let bedroomButton;
let kitchenButton;
let streamButton;
let returnButton;
let sceneObjects = [];
// 이미지들
let playerImage;
let bedImage;
let sinkImage;
let benchImage;

function preload(){
  playerImage = loadImage("Resources/Images/kirby.png");
  bedImage = loadImage("Resources/Images/bed.png");
  sinkImage = loadImage("Resources/Images/sink.png");
  benchImage = loadImage("Resources/Images/bench.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  gameManager = new GameManager();
  player = new Player(width/2, height/2, playerImage, 0.25, true, 1);
  outsideButton = new OutsideButton(width/2 + 100, height/2, 100, 100);
  bedroomButton = new BedroomButton(width/2 - 100, height/2 - 75, 100, 100);
  kitchenButton = new KitchenButton(width/2 - 100, height/2 + 75, 100, 100);
  streamButton = new StreamButton(width/2 - 200, height/2 + 75, 100, 100);
  returnButton = new ReturnButton(100, 100, 100, 50);
  backgroundColor = color(220);
  sceneNum = 0;
  for(let i=0; i<totalSceneNum; i++) sceneObjects.push([]);
  // 씬 오브젝트 배치
  // 시냇가 씬
  sceneObjects[scenes.STREAM].push(new GameObject(1000, 200, benchImage));
  // 안방씬
  sceneObjects[scenes.BEDROOM].push(new GameObject(200, 200, bedImage));
  // 부엌 씬
  sceneObjects[scenes.KITCHEN].push(new GameObject(400, 200, sinkImage));
  // 마당 씬
  sceneObjects[scenes.OUTSIDE].push(new GameObject(400, 200, sinkImage));
}

function draw() {
  loadScene(sceneNum);
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
    if(button.ishovering){
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
  if(gameManager.currentState == gameState.START){
    outsideButton.show = true;
    bedroomButton.show = true;
    kitchenButton.show = true;
    streamButton.show = true;
  } else {
    outsideButton.show = false;
    bedroomButton.show = false;
    kitchenButton.show = false;
    streamButton.show = false;
  }
}
function loadScene(){
  // 배경 이미지
  //showImage(backgroundImage[sceneNum]);
  background(backgroundColor);
}