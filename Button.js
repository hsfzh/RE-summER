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
    performAction() {
        throw new Error("performAction() 메서드를 구현해야 합니다.");
    }
    display() {
        throw new Error("display() 메서드를 구현해야 합니다.");
    }
}

class StartButton extends Button{
    performAction(){
        gameManager.changeState(gameState.INTRO);
        changeScene(scenes.INTRO);
        this.changeShowState(false);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        fill(0);
        text("게임 시작", 0, 0);
        pop();
    }
}
class OutsideButton extends Button{
    performAction(){
        gameManager.changeState(gameState.PLAYING);
        player.visitedMap.OUTSIDE = true;
        changeScene(scenes.OUTSIDE);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        //rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        fill(0);
        //text("야외", 0, 0);
        pop();
    }
}
class BedroomButton extends Button{
    performAction(){
        gameManager.changeState(gameState.PLAYING);
        player.visitedMap.BEDROOM = true;
        changeScene(scenes.BEDROOM);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        //rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        fill(0);
        //text("안방", 0, 0);
        pop();
    }
}
class KitchenButton extends Button{
    performAction(){
        gameManager.changeState(gameState.PLAYING);
        player.visitedMap.KITCHEN = true;
        changeScene(scenes.KITCHEN);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        //rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        fill(0);
        //text("부엌", 0, 0);
        pop();
    }
}
class StreamButton extends Button{
    performAction(){
        gameManager.changeState(gameState.PLAYING);
        player.visitedMap.STREAM = true;
        changeScene(scenes.STREAM);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        //rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        fill(0);
        //text("시냇가", 0, 0);
        pop();
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
        rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        fill(0);
        text("지도 보기", 0, 0);
        pop();
    }
}
class CallButton extends Button{
    constructor(_x, _y, _sizeX, _sizeY, _img){
        super(_x, _y, _sizeX, _sizeY, _img);
        this.pressed = false;
    }
    performAction(){
        gameManager.changeState(gameState.CALLING);
        changeScene(scenes.CALLING);
        this.changeShowState(false);
    }
    display(){
        push();
        translate(this.x, this.y);
        //rectMode(CENTER);
        //rect(0, 0, this.sizeX, this.sizeY);
        //textAlign(CENTER, CENTER);
        //fill(0);
        //text("엄마에게 전화하기", 0, 0);
        showImage(this.img, 0.5, 0, 0);
        pop();
    }
    changeShowState(state){
        if(this.pressed) this.show = false;
        else super.changeShowState(state);
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
        gameManager.changeState(gameState.NONE);
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