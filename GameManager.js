class GameManager{
    constructor(){
        this.currentState = gameState.START;
    }
    changeState(newState){
        this.currentState = newState;
    }
    update(time){
        switch(this.currentState){
            case gameState.START:
                this.updateStart(time);
                break;
            case gameState.PLAYING:
                this.updatePlaying(time);
                break;
            case gameState.EDITING:
                this.updateEditing(time);
                break;
            case gameState.END:
                this.updateEnd(time);
                break;
        }
    }
    updateStart(time){

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
}