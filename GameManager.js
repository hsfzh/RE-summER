class GameManager{
    constructor(){
        this.currentState = gameState.START;
        this.introText = [
            "다 왔어, 곧 할머니 댁이야.",
            "창문 열어봐, 이 냄새 좋지?"
        ];
        this.callingText = [
            "엄마, 이제 데리러 와",
            "그래, 지금 갈게. 잠깐만 기다려."
        ];
        this.returnText = [
            "…그 여름이 얼마나 오래된 일인지."
        ]
        this.textIndex = 0;
        this.inputTimer = 0.3;
        this.inputInterval = 0.3;
        this.returnSceneTimer = 0;
        this.isOpening1VideoFinished = false;
        this.isOpening2VideoFinished = false;
        this.isReturnVideoFinished = false;
        this.isfading = false;
        this.fadeTimer = 0;
        this.fadeTime = 0;
        this.fadeImage = null;
        this.fadeExitState;
    }
    changeState(newState){
        this.currentState = newState;
        this.inputTimer = this.inputInterval * 0.5;
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
        if(this.currentState === gameState.START) 
        {
            startButton.changeShowState(false);
            tutorialButton.changeShowState(false);
            this.isOpening1VideoFinished = false;
            this.isOpening2VideoFinished = false;
            videos.openingVideo1.stop();
            videos.openingVideo2.stop();
            videos.openingVideo1.play();
        }
        if (this.currentState === gameState.RETURN_CAR) {
            this.isReturnVideoFinished = false;
            videos.returnVideo.stop();
            videos.returnVideo.play();
        }
    }
    startFade(time, img = null, nextState = this.currentState){
        this.isfading = true;
        this.fadeTime = time;
        this.fadeTimer = this.fadeTime;
        this.fadeImage = img;
        this.fadeExitState = nextState;
    }
    fadeout(time){
        this.fadeTimer -= time;
        if(this.fadeImage)
            showImage(this.fadeImage, 0, width/2, height/2);
        push();
        rectMode(CENTER);
        translate(width/2, height/2);
        fill(0, map(this.fadeTimer, 0, this.fadeTime, 255, 0));
        rect(0,0,width, height);
        pop();
        if(this.fadeTimer <= 0){
            this.isfading = false;
            if(this.fadeExitState !== this.currentState) this.changeState(this.fadeExitState);
        }
    }
    update(time){
        if(this.inputTimer >= 0) this.inputTimer -= time;
        if(this.isfading)
        {
            this.fadeout(time);
        } else{
            switch(this.currentState){
            case gameState.START:
                this.updateStart(time);
                break;
            case gameState.INTRO:
                this.updateIntro(time);
                break;
            case gameState.MAP_SELECT:
                this.updateMapUI(time);
                break;
            case gameState.CALLING:
                this.updateCalling(time);
                break;
            case gameState.RETURN_CAR:
                this.updateReturnScene(time);
                break;
            case gameState.EDITING:
                this.updateEditing(time);
                break;
            case gameState.END:
                this.updateEnd(time);
                break;
            default:
            case gameState.PLAYING:
                this.updatePlaying(time);
                break;
            }
        }
    }
    updateStart(time){
        if (!this.isOpening1VideoFinished) {
            if(videos.openingVideo1.time() >= videos.openingVideo1.duration() - 0.1)
            {
                this.isOpening1VideoFinished = true;
                this.startFade(5, videos.openingVideo1);
                videos.openingVideo2.stop();
                videos.openingVideo2.play();
            }
            showImage(videos.openingVideo1, 0, width / 2, height / 2);
        } else if(!this.isOpening2VideoFinished){
            if(videos.openingVideo2.time() >= videos.openingVideo2.duration() - 0.1)
                this.isOpening2VideoFinished = true;
            showImage(videos.openingVideo2, 0, width / 2, height / 2);
        }
        else {
            startButton.changeShowState(true);
            tutorialButton.changeShowState(true);
            showImage(images.start, 0, width / 2, height / 2); 
        }
    }
    updateIntro(time){
        push();
        fill(255);
        stroke(0);
        pop();
        showText(this.introText[this.textIndex], 30, color(0), width*0.48, height*0.86);
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
    updateCalling(time){
        push();
        fill(255);
        stroke(0);
        pop();
        //showText(this.introText[this.textIndex], 30, color(0), width/2, height*0.825);
        if(this.checkInput()){
            this.textIndex += 1;
            if(this.textIndex >= this.callingText.length){
                this.changeState(gameState.RETURN_CAR);
                changeScene(scenes.RETURN_CAR);
                this.textIndex = 0;
            }
        }
    }
    updateReturnScene(time){
        if (!this.isReturnVideoFinished && videos.returnVideo.time() >= videos.returnVideo.duration() - 0.1) {
            this.isReturnVideoFinished = true;
        }
        if (!this.isReturnVideoFinished) {
            showImage(videos.returnVideo, 0, width / 2, height / 2);
        } else {
            showImage(videos.returnVideo, 0, width / 2, height / 2); 
            
            push();
            fill(255);
            stroke(0);
            rectMode(CENTER);
            rect(width / 2, height * 0.825, 600, 100);
            pop();

            if (this.textIndex < this.returnText.length) {
                showText(this.returnText[this.textIndex], 25, color(0), width / 2, height * 0.825);
            }

            if (this.checkInput()) {
                this.textIndex += 1;
                if (this.textIndex >= this.returnText.length) {
                    this.changeState(gameState.EDITING);
                    changeScene(scenes.EDIT_SCENE);
                    this.textIndex = 0;
                }
            }
        }
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
        if(typeof mixerUI !== "undefined" && mixerUI) mixerUI.update(time);
    }
    updateEnd(time){
        if(typeof mixerUI !== "undefined" && mixerUI && typeof mixerUI.updateFinishScreen === "function") mixerUI.updateFinishScreen(time);
    }
    checkInput(){
        if(this.inputTimer > 0) return false;
        if(keyIsDown(69) || (mouseIsPressed && mouseButton == LEFT)){
            this.inputTimer = this.inputInterval;
            return true;
        }
    }
}