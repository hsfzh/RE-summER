class Button{
    constructor(_x, _y, _sizeX, _sizeY, _img = null){
        this.x = _x;
        this.y = _y;
        this.sizeX = _sizeX;
        this.sizeY = _sizeY;
        this.halfsizeX = _sizeX * 0.5;
        this.halfsizeY = _sizeY * 0.5;
        this.ishovering = false;
        this.show = true;
        this.img = _img;
        buttons.push(this);
    }
    changeShowState(state){
        this.show = state;
    }
    update(time){
        if(mouseX < this.x+this.halfsizeX && mouseX > this.x-this.halfsizeX &&
            mouseY < this.y+this.halfsizeY && mouseY > this.y-this.halfsizeY){
                this.ishovering = true;
            } else {
                this.ishovering = false;
            }
    }
    move(x, y){
        this.x = x;
        this.y = y;
    }
    performAction() {
        throw new Error("performAction() 메서드를 구현해야 합니다.");
    }
    display() {
        throw new Error("display() 메서드를 구현해야 합니다.");
    }
}

class RestartButton extends Button{
    performAction(){
        mixerUI.resetWholeGameToInitialState();
        gameManager.changeState(gameState.START);
        changeScene(scenes.INTRO);
        this.changeShowState(false);
    }
    display(){
        
    }
}
class StartButton extends Button{
    performAction(){
        gameManager.startFade(fadeTime, images.start, gameState.INTRO);
        changeScene(scenes.INTRO);
        this.changeShowState(false);
        tutorialButton.changeShowState(false);
    }
    display(){
    }
}
class TutorialButton extends Button{
    constructor(_x, _y, _sizeX, _sizeY, _img){
        super(_x, _y, _sizeX, _sizeY, _img);
        this.pressed = false;
        this.startButton = new StartButton(width/2, height * 0.91, 150, 60);
    }
    performAction(){
        if(!this.pressed){
            this.pressed = true;
            startButton.changeShowState(false);
            this.startButton.changeShowState(true);
        }
    }
    display(){
        if(this.pressed){
            showImage(images.tutorial, 0, width/2, height/2);
        }else{
        }
    }
    changeShowState(state){
        super.changeShowState(state);
        this.pressed = false;
        this.startButton.changeShowState(false);
    }
}
class OutsideButton extends Button{
    performAction(){
        gameManager.changeState(gameState.PLAYING);
        player.visitedMap.OUTSIDE = true;
        player.moveTo(width*3/7, height/3.5);
        player.facing = player.directions.DOWN;
        changeScene(scenes.OUTSIDE);
    }
    display(){
    }
}
class BedroomButton extends Button{
    performAction(){
        gameManager.changeState(gameState.PLAYING);
        player.visitedMap.BEDROOM = true;
        player.moveTo(width/2, height * 0.9);
        player.facing = player.directions.UP;
        changeScene(scenes.BEDROOM);
    }
    display(){
    }
}
class KitchenButton extends Button{
    performAction(){
        gameManager.changeState(gameState.PLAYING);
        player.visitedMap.KITCHEN = true;
        player.moveTo(width/5, height * 0.9);
        player.facing = player.directions.UP;
        changeScene(scenes.KITCHEN);
    }
    display(){
    }
}
class StreamButton extends Button{
    performAction(){
        gameManager.changeState(gameState.PLAYING);
        player.visitedMap.STREAM = true;
        player.moveTo(width*4/11, height/3.5);
        player.facing = player.directions.RIGHT;
        changeScene(scenes.STREAM);
    }
    display(){
    }
}
class MapButton extends Button{
    performAction(){
        gameManager.changeState(gameState.MAP_SELECT);
        changeScene(scenes.MAP_SELECT);
        this.changeShowState(false);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        fill(this.ishovering ? color(255, 216, 137) : color(255, 239, 199));
        if(this.ishovering){
            rect(0, 0, this.sizeX * 1.1, this.sizeY * 1.1, 16);
        } else{
            rect(0, 0, this.sizeX, this.sizeY, 16);
        }
        textAlign(CENTER, CENTER);
        textSize(this.ishovering? 17:14);
        fill(58, 40, 26);
        text("지도 보기", 0, 0);
        pop();
    }
}
class CallButton extends Button{
    constructor(_x, _y, _sizeX, _sizeY, _img){
        super(_x, _y, _sizeX, _sizeY, _img);
        this.pressed = false;
        this.enter = false;
        this.yesButton = new CallYesButton(width/2 - 75, height*4/7, 100, 50, null, this);
        this.noButton = new CallNoButton(width/2 + 75, height*4/7, 100, 50, null, this);
    }
    performAction(){
        if(!this.enter) {
            this.enter = true;
            this.yesButton.changeShowState(true);
            this.noButton.changeShowState(true);
        }
    }
    display(){
        push();
        translate(this.x, this.y);
        showImage(this.img, this.ishovering? 0.5 : 0.4, 0, 0);
        pop();
        if(this.enter){
            push();
            rectMode(CENTER);
            fill(0, 150);
            rect(width/2, height/2, width, height);
            fill(200, 185, 145);
            rect(width/2, height/2, 400, 250, 20);
            fill(0);
            fill(58, 40, 26);
            textAlign(CENTER, CENTER);
            textSize(20);
            textStyle(BOLD);
            text("엄마한테 데리러 오라고 할까?", width/2, height*4/9);
            textSize(15);
            text("(예를 누르면 다음 씬으로 이동합니다)", width/2, height*4.35/9);
            pop();
        }
    }
    changeShowState(state){
        if(this.pressed){
            this.show = false;
            this.yesButton.changeShowState(false);
            this.noButton.changeShowState(false);
        }else{
            this.show = state;
            this.yesButton.changeShowState(false);
            this.noButton.changeShowState(false);
        }
    }
    reset(){
        this.pressed = false;
        this.enter = false;
        this.yesButton.changeShowState(false);
        this.noButton.changeShowState(false);
    }
}
class CallYesButton extends Button{
    constructor(_x, _y, _sizeX, _sizeY, _img, _parent){
        super(_x, _y, _sizeX, _sizeY, _img);
        this.parent = _parent;
    }
    performAction(){
        gameManager.startFade(fadeTime, images.map, gameState.CALLING);
        postEditSoundFiles["main_bgm_source"].stop();
        if(!call_sound.isPlaying()) call_sound.loop();
        changeScene(scenes.CALLING);
        this.parent.enter = false;
        this.parent.pressed = true;
        this.parent.changeShowState(false);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        fill(this.ishovering ? color(255, 216, 137) : color(255, 239, 199));
        if(this.ishovering){
            rect(0, 0, this.sizeX * 1.1, this.sizeY * 1.1, 16);
        }else{
            rect(0, 0, this.sizeX, this.sizeY, 16);
        }
        textAlign(CENTER, CENTER);
        fill(0);
        textSize(this.ishovering? 15:12);
        text("예", 0, 0);
        pop();
    }
}
class CallNoButton extends Button{
    constructor(_x, _y, _sizeX, _sizeY, _img, _parent){
        super(_x, _y, _sizeX, _sizeY, _img);
        this.parent = _parent;
    }
    performAction(){
        this.parent.enter = false;
        this.parent.yesButton.changeShowState(false);
        this.changeShowState(false);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        fill(this.ishovering ? color(255, 216, 137) : color(255, 239, 199));
        if(this.ishovering){
            rect(0, 0, this.sizeX * 1.1, this.sizeY * 1.1, 16);
        }else{
            rect(0, 0, this.sizeX, this.sizeY, 16);
        }
        textAlign(CENTER, CENTER);
        fill(0);
        textSize(this.ishovering? 15:12);
        text("아니오", 0, 0);
        pop();
    }
}

function disableAllButtons(){
    for(let button of buttons){
        button.changeShowState(false);
    }
}
function activateAllButtons(){
    for(let button of buttons){
        button.changeShowState(true);
    }
}

//#region 디버깅 버튼
class ToStartButton extends Button{
  performAction(){
        gameManager.changeState(gameState.START);
        gameManager.isOpening1VideoFinished = true;
        gameManager.isOpening2VideoFinished = true;
        changeScene(scenes.EMPTY);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        fill(0);
        text("시작 씬으로", 0, 0);
        pop();
    }
}
class ToIntroButton extends Button{
  performAction(){
        gameManager.changeState(gameState.INTRO);
        changeScene(scenes.INTRO);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        fill(0);
        text("인트로 씬으로", 0, 0);
        pop();
    }
}
class ToMapSelectButton extends Button{
  performAction(){
        gameManager.changeState(gameState.MAP_SELECT);
        changeScene(scenes.MAP_SELECT);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        fill(0);
        text("맵 선택 씬으로", 0, 0);
        pop();
    }
}
class ToReturnButton extends Button{
  performAction(){
        gameManager.changeState(gameState.RETURN_CAR);
        changeScene(scenes.RETURN_CAR);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        fill(0);
        text("귀가 씬으로", 0, 0);
        pop();
    }
}
class ToEditButton extends Button{
  performAction(){
        gameManager.changeState(gameState.EDITING);
        changeScene(scenes.EDIT_SCENE);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        fill(0);
        text("편집 씬으로", 0, 0);
        pop();
    }
}
class ToEndingButton extends Button{
  performAction(){
        gameManager.changeState(gameState.END);
        changeScene(scenes.ENDING);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        fill(0);
        text("엔딩 씬으로", 0, 0);
        pop();
    }
}
//#endregion