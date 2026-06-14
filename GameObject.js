class GameObject{
  constructor(_x, _y, _img = null, _scale = 1, _collisionObject = true, _priority = 0){
    this.x = _x;
    this.y = _y;
    this.img = _img;
    this.scale = _scale;
    this.height = _img? _img.height * _scale : 0;
    this.width = _img? _img.width * _scale : 0;
    this.collidable = _collisionObject; 
    if(this.collidable) this.collider = new Collider(this, this.height, this.width);
    this.id = objects.length;
    this.isActive = true;

    //soundobject의 경우 테두리를 그리기 위함
    this.hasBorder = false;
    this.borderColor = color(255);
    this.borderWeight = 3;

    this.priority = _priority; // -1: 가장 뒤, 0: 기본, 1: 가장 앞
    switch(_priority){
        case -1:
            backObjects.push(this);
            break;
        case 0:
            midObjects.push(this);
            break;
        case 1:
            frontObjects.push(this);
            break;
    }
    objects.push(this);
  }
  update(time){
  }
  move(dx, dy){
    this.x += dx;
    this.y += dy;
    this.x = constrain(this.x, this.width/2, width - this.width/2);
    this.y = constrain(this.y, this.height/2, height - this.height/2);
    this.updateCollider();
  }
  moveTo(x, y){
    this.x = x;
    this.y = y;
    this.x = constrain(this.x, this.width/2, width - this.width/2);
    this.y = constrain(this.y, this.height/2, height - this.height/2);
    this.updateCollider();
  }
  updateCollider(){
    if(this.collidable){
        this.collider.updateWorldPosition();
    }
  }

  display(){
    if(!this.isActive) return;
    // 충돌 판정 범위 시각화 코드 (디버깅용)
    if (this.collidable && isDebugMode) {
        for (let colliderCircle of this.collider.circles) {
            push();
            fill(0, 255, 0, 100);
            stroke(0);
            circle(
                colliderCircle.actualP.x,
                colliderCircle.actualP.y,
                2 * colliderCircle.r
            );
            pop();
        }
    }
    if (this.img == null) return;
    push();
    noSmooth();
    translate(this.x, this.y);

    // 아이콘 원형 테두리
    stroke(255);        // 테두리 색
    strokeWeight(4);    // 테두리 두께
    noFill();

    let diameter = max(this.width, this.height) + 8;
    circle(0, 0, diameter);

    // 아이콘 이미지
    noStroke();
    showImage(this.img, this.scale, 0, 0);

    pop();
  }
  deactivate(){ this.isActive = false; }
  activate(){ this.isActive = true; }
}

class Collider{
    constructor(_parent, _height, _width){
        this.parent = _parent;
        this.halfHeight = _height * 0.5;
        this.halfWidth = _width * 0.5;
        this.circles = [];
        this.fillCircles();
        this.updateWorldPosition();
    }
    fillCircles() {
        let radius;
        let circleNum;

        if (this.halfHeight >= this.halfWidth) {
            radius = this.halfWidth;
            circleNum = int(this.halfHeight / radius) + 1; 
            
            let startY = -this.halfHeight + radius;
            let endY = this.halfHeight - radius;

            if (circleNum === 1) {
                this.circles.push({ r: radius, p: { x: 0, y: 0 }, actualP: { x: 0, y: 0} });
            } else {
                let increment = (endY - startY) / (circleNum - 1);
                for (let i = 0; i < circleNum; i++) {
                    this.circles.push({ r: radius, p: { x: 0, y: startY + increment * i }, actualP: { x: 0, y: 0} });
                }
            }
        } else {
            radius = this.halfHeight;
            circleNum = int(this.halfWidth / radius) + 1;

            let startX = -this.halfWidth + radius;
            let endX = this.halfWidth - radius;

            if (circleNum === 1) {
                this.circles.push({ r: radius, p: { x: 0, y: 0 }, actualP: { x: 0, y: 0} });
            } else {
                let increment = (endX - startX) / (circleNum - 1);
                for (let i = 0; i < circleNum; i++) {
                    this.circles.push({ r: radius, p: { x: startX + increment * i, y: 0 }, actualP: { x: 0, y: 0} });
                }
            }
        }
    }
    checkCollision(other){
        let result = { collided: false, nx: 0, ny: 0, overlap: 0 };

        for (let myC of this.circles) {
            for (let otherC of other.circles) {
                let dx = myC.actualP.x - otherC.actualP.x;
                let dy = myC.actualP.y - otherC.actualP.y;
                let distance = sqrt(dx * dx + dy * dy);
                let minDist = myC.r + otherC.r;

                if (distance < minDist) {
                    result.collided = true;
                    let overlap = minDist - distance;
                    // 벽이 나를 밀어내는 방향 벡터
                    if (distance > 0) {
                        result.nx = dx / distance;
                        result.ny = dy / distance;
                    } else {
                        result.ny = -1; // 거리가 0인 경우 예외처리
                    }
                    result.overlap = overlap;
                    return result; // 가장 먼저 부딪힌 원 기준으로 즉시 반환
                }
            }
        }
        return result;
    }
    updateWorldPosition(){
        for(let circle of this.circles){
            circle.actualP.x = circle.p.x + this.parent.x;
            circle.actualP.y = circle.p.y + this.parent.y;
        }
    }
}

class CollisionObject extends GameObject{
    constructor(_x, _y, _width, _height){
    super(_x, _y, null, 1, true, -1);
    this.height = _height;
    this.width = _width;
    this.collider = new Collider(this, this.height, this.width);
  }
}