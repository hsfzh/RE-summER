class Player extends GameObject{
    constructor(_x, _y, _imgs, _scale = 1, _collisionObject = true, _priority = 0){
        super(_x, _y, _imgs[0], _scale*0.8, _collisionObject, _priority);
        this.imgs = _imgs;
        this.speed = 3;
        this.vx = 0;
        this.vy = 0;
        this.controls = {
            UP: 87,    // W
            DOWN: 83,  // S
            LEFT: 65,  // A
            RIGHT: 68, // D
            UP_ALT: UP_ARROW,
            DOWN_ALT: DOWN_ARROW,
            LEFT_ALT: LEFT_ARROW,
            RIGHT_ALT: RIGHT_ARROW,
            INTERACT: 69, // E
            INVENTORY: 73, // I
            INVENTORY_UP: 78, // N
            INVENTORY_DOWN: 77, // M
            DELETE_ITEM: 82 // R
        };
        this.lastAxis = "none";
        this.prevPressed = {};
        this.directions = {
            UP: 0,
            DOWN: 1,
            LEFT: 2,
            RIGHT: 3
        }
        this.direction = this.directions.UP;
        this.facing = this.directions.UP;
        this.isMoving = false;
        this.animationTimer = 0;
        this.animationInterval = 0.25;
        this.latestKey = -1;
        this.visitedMap = {
            BEDROOM: false,
            KITCHEN: false,
            OUTSIDE: false,
            STREAM: false
        };
        this.baseScale = _scale;
        
        //인벤토리 확인용
        this.inventory = new Inventory();
        this.showInventory = false;
        this.hasBorder = false;

        this.pickupMessage = "";
        this.pickupMessageTimer = 0;
    }
    moveTo(x, y){
        super.moveTo(x, y);
        this.isMoving = false;
    }
    update(time){
        this.handleInput();
        this.moveWithPhysics();
        this.scale = map(this.y, 0, height, this.baseScale * 0.7, this.baseScale);

        if(this.isJustPressed(this.controls.INTERACT)){
            this.interact(this.findSound());
        }
        
        if(this.isJustPressed(this.controls.INVENTORY)) this.showInventory = !this.showInventory;
        if(this.showInventory){

            if(this.isJustPressed(this.controls.INVENTORY_DOWN)){
            this.inventory.selectNext();
            }

            if(this.isJustPressed(this.controls.INVENTORY_UP)){
            this.inventory.selectPrevious();
            }

            if(this.isJustPressed(this.controls.DELETE_ITEM)){
            this.inventory.removeSelected();
            }
            this.inventory.draw(20,20);
        }

        
        if(this.animationTimer <= 0) this.animationTimer = this.animationInterval*2;
        if(this.isMoving){
            this.animationTimer -= time;
        }
        this.handleAnimation();
        // 키 확인은 루프 마지막에 유지
        this.backUpInput();
    }

    handleInput(){
        if (this.isJustPressed(this.controls.UP) || this.isJustPressed(this.controls.DOWN) ||
            this.isJustPressed(this.controls.UP_ALT) || this.isJustPressed(this.controls.DOWN_ALT)) {
            this.lastAxis = "v";
        }
        if (this.isJustPressed(this.controls.LEFT) || this.isJustPressed(this.controls.RIGHT) ||
            this.isJustPressed(this.controls.LEFT_ALT) || this.isJustPressed(this.controls.RIGHT_ALT)) {
            this.lastAxis = "h";
        }

        let tempVx = 0;
        let tempVy = 0;
        if (keyIsDown(this.controls.UP) || keyIsDown(this.controls.UP_ALT)) tempVy = -1;
        if (keyIsDown(this.controls.DOWN) || keyIsDown(this.controls.DOWN_ALT)) tempVy = 1;
        if (keyIsDown(this.controls.LEFT) || keyIsDown(this.controls.LEFT_ALT)) tempVx = -1;
        if (keyIsDown(this.controls.RIGHT) || keyIsDown(this.controls.RIGHT_ALT)) tempVx = 1;

        if (tempVx !== 0 && tempVy !== 0) {
            if (this.lastAxis === "h") tempVy = 0;
            else tempVx = 0;
        }
        
        this.vx = tempVx;
        this.vy = tempVy;

        if (this.vx !== 0 || this.vy !== 0) {
            if (this.vx > 0) this.direction = this.directions.RIGHT;
            if (this.vx < 0) this.direction = this.directions.LEFT;
            if (this.vy > 0) this.direction = this.directions.DOWN;
            if (this.vy < 0) this.direction = this.directions.UP;
            this.facing = this.direction;
        }
    }
    moveWithPhysics(){
        if(this.vx === 0 && this.vy === 0) {
            this.isMoving = false;
            return;
        }

        let moveX = this.vx * this.speed;
        let moveY = this.vy * this.speed;

        for (let object of objects) {
            if (object == this || !object.collidable || !object.isActive) continue;

            let hit = this.collider.checkCollision(object.collider);
            if (hit.collided) {
                let dot = moveX * hit.nx + moveY * hit.ny;
                if (dot < 0) {
                    moveX -= dot * hit.nx;
                    moveY -= dot * hit.ny;
                }
                moveX += hit.nx * hit.overlap * 0.5;
                moveY += hit.ny * hit.overlap * 0.5;
            }
        }
        
        this.move(moveX, moveY);
        
        this.isMoving = true;
    }
    handleAnimation(){
        if(this.isMoving){
            let index = this.facing*2+1;
            if(this.animationTimer <= this.animationInterval) index = this.facing*2;
            this.img = this.imgs[index];
        }else{
            this.img = this.imgs[this.facing*2];
        }
    }
    backUpInput(){
        for (let key in this.controls) {
            this.prevPressed[this.controls[key]] = keyIsDown(this.controls[key]);
        }
    }
    findSound(){
        // TODO: 상호작용 가능한 가장 가까운 소리 찾고 반환
            let nearest = null;
            let nearestDistance = 100;

            for(let object of sceneObjects[sceneNum]){

                if(!(object instanceof SoundObject)) continue;
                if(!object.isActive) continue;

                let d = dist(this.x,this.y,object.x,object.y);
                console.log("거리:", d);
                if(d < nearestDistance){
                    nearest = object;
                    nearestDistance = d;
                }
            }

        return nearest;
    }

    interact(sound){
        console.log("상호작용 시도");
        if(!sound) {
            console.log("사운드 없음.")
            return;
        }
        // TODO: 주변 사운드 확인 후 인벤토리에 넣기.
        console.log("sound =", sound);
        console.log("sound 타입 =", sound.constructor.name);
        console.log("sound 재생", sound);
        sound.audio.setVolume(30.0);
        sound.audio.play();
        sound.audio.stop(2);

        
        if(this.inventory.has(sound.soundId)) {
            console.log("이미 보유중인 아이템입니다.");
            return;
        }
        this.inventory.add(sound.soundId);
        console.log(`${sound.soundId} 획득!`);
        
        switch(sound.soundId) {
        case "dog_bark":
            gameManager.playMemoryVideo(videos.outside);
        break;

        case "old_tv":
            gameManager.playMemoryVideo(videos.bedroom);
            break;

        case "water_splash":
            gameManager.playMemoryVideo(videos.stream);
            break;

        case "knife_chop":
            gameManager.playMemoryVideo(videos.kitchen);
            break;
}

        sound.deactivate();
        console.log(this.inventory.items);
    }

    isJustPressed(keyCodeValue) {
        const isDown = keyIsDown(keyCodeValue);
        const wasDown = this.prevPressed[keyCodeValue] || false;
        return isDown && !wasDown;
    }
    hasVisitedAllMaps(){
        return Object.values(this.visitedMap).every(value => value === true);
    }

}