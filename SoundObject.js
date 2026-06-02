class SoundObject extends GameObject {

    constructor(_x, _y, _soundId) {

        const data = SOUND_LIBRARY[_soundId];
        
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
    }

    interact(player) {
        console.log("this.soundId =", this.soundId);
        if(this.collected) return;
        player.inventory.add(this.soundId);
        this.collected = true;
        this.deactivate();
        console.log(
            `${this.soundId} 획득`
        );
    }
}