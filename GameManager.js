class GameManager{
    constructor(){
        this.currentState = gameState.START;
        this.introText = [
            "오랜만에 할머니댁 놀러가서 신나지?",
            "엄마도 아직 귀뚜라미 소리만 들으면 옛날 시골집이 생각나.",
            "재미있게 놀고, 다 놀았으면 엄마한테 전화해~\n 엄마가 데리러 갈게."
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
        this.isIntroVideoFinished = false;
        this.isCallVideoFinished = false;
        this.isReturnVideo1Finished = false;
        this.isReturnVideo2Finished = false;
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
            if(!postEditSoundFiles["main_bgm_source"].isPlaying()) postEditSoundFiles["main_bgm_source"].loop();
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
            //videos.openingVideo1.play();
            postEditSoundFiles["main_bgm_source"].stop();
            if (soundManager.bgmOptions[1] && soundManager.bgmOptions[1].soundFile) {
              soundManager.bgmOptions[1].soundFile.stop();
            }
        }
        if (this.currentState === gameState.INTRO) {
            this.isIntroVideoFinished = false;
            videos.introVideo.stop();
            if (soundManager.bgmOptions[1] && soundManager.bgmOptions[1].soundFile) {
                soundManager.bgmOptions[1].soundFile.stop();
            }
        }
        if (this.currentState === gameState.CALLING) {
            this.isCallVideoFinished = false;
            videos.callVideo.stop();
        }
        if (this.currentState === gameState.RETURN_CAR) {
            this.isReturnVideo1Finished = false;
            this.isReturnVideo2Finished = false;
            videos.returnVideo.stop();
            videos.returnVideo.play();
        }
        if(this.currentState === gameState.EDITING){
            postEditSoundFiles["main_bgm_source"].stop();
            if (soundManager.bgmOptions[1] && soundManager.bgmOptions[1].soundFile) {
              soundManager.bgmOptions[1].soundFile.stop();
            }
        }
        if(this.currentState === gameState.DOWNLOAD){
            restartButton.changeShowState(true);
        }else{
            restartButton.changeShowState(false);
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
            if(this.fadeExitState !== this.currentState) this.changeState(this.fadeExitState);
        }
    }
    update(time){
        if(this.inputTimer >= 0) this.inputTimer -= time;
        if(this.fadeTimer > 0){
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
            case gameState.DOWNLOAD:
                this.updateDownload(time);
                break;
            case gameState.PLAYING:
                break;
            }
            if (this.currentState === gameState.PLAYING || this.currentState === gameState.CALLING) {
              this.updatePlaying(time);
            }
        }
    }
    updateStart(time){
        if (!this.isOpening1VideoFinished) {
            if(videos.openingVideo1.time() >= videos.openingVideo1.duration() - 0.1)
            {
                this.isOpening1VideoFinished = true;
                this.startFade(fadeTime, videos.openingVideo1);
                videos.openingVideo2.stop();
                videos.openingVideo2.play();
            }
            showImage(videos.openingVideo1, 0, width / 2, height / 2);
        } else if(!this.isOpening2VideoFinished){
            if(videos.openingVideo2.time() >= videos.openingVideo2.duration() - 0.1){
                startButton.changeShowState(true);
                tutorialButton.changeShowState(true);
                this.isOpening2VideoFinished = true;
                if (soundManager.bgmOptions[1] &&
                soundManager.bgmOptions[1].soundFile) {
                    soundManager.bgmOptions[1].soundFile.loop();
                }
            }
            showImage(videos.openingVideo2, 0, width / 2, height / 2);
        }
        else {
            showImage(images.start, 0, width / 2, height / 2); 
        }
    }
    updateIntro(time){
        push();
        fill(255);
        stroke(0);
        pop();
        showText(this.introText[min(this.textIndex, this.introText.length - 1)], 26, color(0), width*0.48, height*0.86);
        if(this.checkInput()){
            this.textIndex += 1;
            if(this.textIndex==this.introText.length){
                videos.introVideo.play();
            }
        }
        if(this.textIndex >= this.introText.length){
            if(!this.isIntroVideoFinished && videos.introVideo.time() >= videos.introVideo.duration() - 0.1){
                this.isIntroVideoFinished = true;
                this.startFade(this.fadeTime, videos.introVideo, gameState.MAP_SELECT);
                changeScene(scenes.MAP_SELECT);
                this.textIndex = 0;
            }else{
                if(!this.isfading){
                    this.startFade(fadeTime, images.introBackground);
                } else {
                    showImage(videos.introVideo, 0, width/2, height/2);
                }
            }
        }
    }
    updateMapUI(time){

    }
    updateCalling(time){
        if(this.textIndex < sceneObjects[scenes.CALLING].length){
            for(let index = 0; index < sceneObjects[scenes.CALLING].length; index++){
                if(index <= this.textIndex)
                    sceneObjects[scenes.CALLING][index].activate();
                else
                    sceneObjects[scenes.CALLING][index].deactivate();
            }
            if(this.checkInput()){
                this.textIndex += 1;
                if(call_sound.isPlaying()) call_sound.stop();
                if(this.textIndex == sceneObjects[scenes.CALLING].length){
                    for(let object of sceneObjects[scenes.CALLING]) 
                        object.deactivate();
                    videos.callVideo.play();
                }
            }
        }else{
            if(!this.isCallVideoFinished){
                if(videos.callVideo.time() >= videos.callVideo.duration() - 0.1){
                    this.isCallVideoFinished = true;
                    this.changeState(gameState.RETURN_CAR);
                    changeScene(scenes.RETURN_CAR);
                    this.textIndex = 0;
                }else{
                    if(!this.isfading){
                        this.startFade(fadeTime, images.call_map);
                    }else{
                        showImage(videos.callVideo, 0, width/2, height/2);
                    }
                }
            }
        }
    }
    updateReturnScene(time){
        if (!this.isReturnVideo1Finished && videos.returnVideo.time() >= videos.returnVideo.duration() - 0.1) {
            this.isReturnVideo1Finished = true;
            this.startFade(this.fadeTime, videos.returnVideo);
            videos.returnVideo2.stop();
            videos.returnVideo2.play();
        }
        if (!this.isReturnVideo2Finished && videos.returnVideo2.time() >= videos.returnVideo2.duration() - 0.1) {
            this.isReturnVideo2Finished = true;
        }
        if (!this.isReturnVideo1Finished) {
            showImage(videos.returnVideo, 0, width / 2, height / 2);
        } else if (!this.isReturnVideo2Finished){
            showImage(videos.returnVideo2, 0, width/2, height/2);
        }
        else {
            this.startFade(this.fadeTime, videos.returnVideo2, gameState.EDITING);
            changeScene(scenes.EDIT_SCENE);
        }
    }
    updatePlaying(time){
        for(let object of objects){
            if(!object.isActive) continue;
            if(object === player && this.currentState !== gameState.PLAYING) continue;
            object.update(time);
        }
        for(let object of backObjects){
            if(!object.isActive) continue;
            if(object === player && this.currentState !== gameState.PLAYING) continue;
            object.display();
        }
        for(let object of midObjects){
            if(!object.isActive) continue;
            if(object === player && this.currentState !== gameState.PLAYING) continue;
            object.display();
        }
        for(let object of frontObjects){
            if(!object.isActive) continue;
            if(object === player && this.currentState !== gameState.PLAYING) continue;
            object.display();
        }
    }
    updateEditing(time){
        if(typeof mixerUI !== "undefined" && mixerUI) mixerUI.update(time);
    }
    updateEnd(time){
        if(typeof mixerUI !== "undefined" && mixerUI && typeof mixerUI.updateFinishScreen === "function") mixerUI.updateFinishScreen(time);
    }
    updateDownload(time){
        if(typeof mixerUI !== "undefined" && mixerUI && typeof mixerUI.updateFinishScreen === "function") mixerUI.updateDownloadScreen(time);
    }
    checkInput(){
        if(this.inputTimer > 0) return false;
        if(keyIsDown(69) || (mouseIsPressed && mouseButton == LEFT)){
            this.inputTimer = this.inputInterval;
            return true;
        }
    }
}