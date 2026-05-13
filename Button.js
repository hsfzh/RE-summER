class Button{
    constructor(_x, _y, _sizeX, _sizeY){
        this.x = _x;
        this.y = _y;
        this.sizeX = _sizeX;
        this.sizeY = _sizeY;
        this.halfsizeX = _sizeX * 0.5;
        this.halfsizeY = _sizeY * 0.5;
        this.ishovering = false;
        this.show = true;
        buttons.push(this);
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

class OutsideButton extends Button{
    performAction(){
        gameManager.changeState(gameState.PLAYING);
        changeScene(1);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        text("야외", 0, 0);
        pop();
    }
}
class BedroomButton extends Button{
    performAction(){
        gameManager.changeState(gameState.PLAYING);
        changeScene(2);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        text("안방", 0, 0);
        pop();
    }
}
class KitchenButton extends Button{
    performAction(){
        gameManager.changeState(gameState.PLAYING);
        changeScene(3);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        text("부엌", 0, 0);
        pop();
    }
}
class ReturnButton extends Button{
    performAction(){
        gameManager.changeState(gameState.START);
        changeScene(0);
    }
    display(){
        push();
        translate(this.x, this.y);
        rectMode(CENTER);
        rect(0, 0, this.sizeX, this.sizeY);
        textAlign(CENTER, CENTER);
        text("돌아가기", 0, 0);
        pop();
    }
}

function disableButtons(){
    for(let button of buttons){
        button.show = false;
    }
}
function activateButtons(){
    for(let button of buttons){
        button.show = true;
    }
}