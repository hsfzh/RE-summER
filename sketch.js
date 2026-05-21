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

function preload(){
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
  player = new Player(width/2, height/2, images.player, 0.15, true, 1);
  initMapButtons();
  initBackgroundImage();
  sceneNum = 0;
  for(let i=0; i<totalSceneNum; i++) sceneObjects.push([]);
  // 씬 오브젝트 배치
  // 시냇가 씬
  // 안방씬
  // 부엌 씬
  // 마당 씬
  returnVideo = createVideo("Resources/Videos/return.mp4");
  returnVideo.hide();
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