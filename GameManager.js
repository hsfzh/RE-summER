class GameManager{
    constructor(){
        this.currentState = gameState.NONE;
        this.introText = [
            "다 왔어, 곧 할머니 댁이야.\n창문 열어봐, 이 냄새 좋지?",
            "창문 열어봐, 이 냄새 좋지?"
        ];
        this.textIndex = 0;
        this.inputTimer = 0.3;
        this.inputInterval = 0.3;
    }
    changeState(newState){
        this.currentState = newState;
        this.inputTimer = 0.5;
        if(this.currentState == gameState.MAP_SELECT){
            for (let button of mapButtons){
                button.changeShowState(true);
            }
            mapButton.changeShowState(false);
        } else {
            for (let button of mapButtons){
                button.changeShowState(false);
            }
            if(this.currentState == gameState.PLAYING){
                mapButton.changeShowState(true);
            }
        }
        if(this.currentState == gameState.NONE) startButton.changeShowState(true);
        else startButton.changeShowState(false);
    }
    update(time){
        if(this.inputTimer >= 0) this.inputTimer -= time;
        switch(this.currentState){
            case gameState.INTRO:
                this.updateStart(time);
                break;
            case gameState.MAP_SELECT:
                this.updateMapUI(time);
                break;
            case gameState.CALLING:
                break;
            case gameState.RETURN_CAR:
                break;
            case gameState.EDITING:
                this.updateEditing(time);
                break;
            case gameState.END:
                this.updateEnd(time);
                break;
            case gameState.NONE:
                break;
            default:
            case gameState.PLAYING:
                this.updatePlaying(time);
                break;
        }
    }
    updateStart(time){
        push();
        fill(255);
        stroke(0);
        rectMode(CENTER);
        rect(width/2, height*0.825, 600, 140);
        pop();
        showText(this.introText[this.textIndex], 30, color(0), width/2, height*0.825);
        if(this.checkInput()){
            this.textIndex += 1;
            if(this.textIndex >= this.introText.length){
                this.changeState(gameState.MAP_SELECT);
                changeScene(scenes.MAP_SELECT);
                this.textIndex = 0;
            }
        }
    }
    updateMapUI(time){
    
    }
    updatePlaying(time){
        for(let object of objects){
          if(object.isActive) object.update(time);
        }
        for(let object of backObjects){
          if(object.isActive) object.display();
        }
        for(let object of midObjects){
          if(object.isActive) object.display();
        }
        for(let object of frontObjects){
          if(object.isActive) object.display();
        }
    }
    updateEditing(time){

    }
    updateEnd(time){

    }
    checkInput(){
        if(this.inputTimer > 0) return false;
        if(keyIsDown(69) || (mouseIsPressed && mouseButton == LEFT)){
            this.inputTimer = this.inputInterval;
            return true;
        }
    }
}