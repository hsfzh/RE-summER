class SoundObject extends GameObject {

    constructor(_x, _y, _soundId, _player) {

        const data = SOUND_LIBRARY[_soundId];

        if (!data) {
            console.error("SOUND_LIBRARY에 없는 soundId:", _soundId);
            console.log("사용 가능한 soundId:", Object.keys(SOUND_LIBRARY));
            return;
        }
        
        super(
            _x,
            _y,
            data.icon,
            0.15,
            false,
            0
        );

        this.soundId = _soundId;
        this.collected = false;
        this.audio = data.audio;

        // 테두리 설정
        this.borderColor = [255, 215, 0];
        this.borderWeight = 3;
        this.borderPadding = 8;
        this.player = _player;


    }

    display() {
        if (!this.isActive) return;
        // 기존 GameObject display처럼 img 없으면 종료
        if (this.img == null) return;
        if(this.player.inventory.has(this.soundId)) return;

        push();

        noSmooth();
        translate(this.x, this.y);

        // 원형 테두리
        stroke(...this.borderColor);
        strokeWeight(this.borderWeight);
        noFill();

        const diameter =
            max(this.width, this.height) + this.borderPadding;

        circle(0, 0, diameter);

        // 아이콘
        noStroke();
        showImage(this.img, this.scale, 0, 0);

        pop();
    }

    interact(player) {
        console.log("this.soundId =", this.soundId);

        if (this.collected) return;
        
        // 소리 재생
        if (this.audio) {
        this.audio.play();
        }


        player.inventory.add(this.soundId);
        this.collected = true;
        this.deactivate();

        console.log(`${this.soundId} 획득`);
    }
}