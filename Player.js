class Player extends GameObject{
    constructor(_x, _y, _img, _scale = 1, _collisionObject = true, _priority = 0){
        super(_x, _y, _img, _scale, _collisionObject, _priority);
        this.speed = 5;
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
            RIGHT_ALT: RIGHT_ARROW
        };
        this.lastAxis = "none";
        this.prevPressed = {};
        this.directions = {
            UP: 0,
            DOWN: 1,
            LEFT: 2,
            RIGHT: 3
        }
        this.direction = this.directions.RIGHT;
        this.facing = this.directions.RIGHT;
        this.latestKey = -1;
    }
    update(time){
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

        for (let key in this.controls) {
            this.prevPressed[this.controls[key]] = keyIsDown(this.controls[key]);
        }

        if(this.vx == 0 && this.vy == 0) return;
        let moveX = this.vx * this.speed;
        let moveY = this.vy * this.speed;

        if (moveX !== 0 || moveY !== 0) {
            for (let object of objects) {
                if (object == this || !object.collidable || !object.isActive) continue;

                let hit = this.collider.checkCollision(object.collider);
                if (hit.collided) {
                    // 현재 내 이동 방향과 벽의 법선 벡터의 내적 계산
                    // dot > 0 이면 벽에서 멀어지는 중, dot < 0 이면 벽으로 파고드는 중
                    let dot = moveX * hit.nx + moveY * hit.ny;
                    if (dot < 0) {
                        // 벽으로 파고드는 속도 성분만큼 제거
                        moveX -= dot * hit.nx;
                        moveY -= dot * hit.ny;
                    }
                    // 이미 파고든 깊이만큼은 최소한으로 보정
                    moveX += hit.nx * hit.overlap * 0.5;
                    moveY += hit.ny * hit.overlap * 0.5;
                }
            }
        }
        this.move(moveX, moveY);
    }
    isJustPressed(keyCodeValue) {
        const isDown = keyIsDown(keyCodeValue);
        const wasDown = this.prevPressed[keyCodeValue] || false;
        return isDown && !wasDown;
    }
}