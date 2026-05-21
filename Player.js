class Player extends GameObject{
    constructor(_x, _y, _imgs, _scale = 1, _collisionObject = true, _priority = 0){
        super(_x, _y, _imgs[0], _scale, _collisionObject, _priority);
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
            INTERACT: 69 // E
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
        // this.inventory = new Inventroy();
    }
    update(time){
        this.handleInput();
        this.moveWithPhysics();
        if(this.isJustPressed(this.controls.INTERACT)){
            this.interact(this.findSound());
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
                // 현재 내 이동 방향과 벽의 법선 벡터의 내적 계산
                let dot = moveX * hit.nx + moveY * hit.ny;
                if (dot < 0) {
                    // 벽으로 파고드는 속도 성분만큼 제거
                    moveX -= dot * hit.nx;
                    moveY -= dot * hit.ny;
                }
                // 이미 파고든 깊이만큼 최소한으로 보정
                moveX += hit.nx * hit.overlap * 0.5;
                moveY += hit.ny * hit.overlap * 0.5;
            }
        }
        // 최종 보정된 값으로 이동
        this.move(moveX, moveY);
        if(moveX>0) this.direction = this.directions.RIGHT;
        if(moveX<0) this.direction = this.directions.LEFT;
        if(moveY>0) this.direction = this.directions.DOWN;
        if(moveY<0) this.direction = this.directions.UP;
        this.facing = this.direction;
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
        return null;
    }
    interact(sound){
        console.log("상호작용 시도");
        if(!sound) return;
        // TODO: 주변 사운드 확인 후 인벤토리에 넣기.
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