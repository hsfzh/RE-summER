class Inventory {
  constructor() {
    this.items = [];
    this.selectedIndex = 0;
  }

  //아이템 보유 여부 확인
  has(soundId) {
    return this.items.some(item => item.soundId === soundId);
  }

  //아이템 return 하기
  get(soundId) {
    return this.items.find(item => item.soundId === soundId);
  }

  add(soundId) {
    // 이미 보유 중이면 추가하지 않음
    if (this.has(soundId)) return false;

    this.items.push({
      soundId: soundId,
      discoveredAt: millis()
    });

    console.log("현재 인벤토리");
    return true;
  }

  remove(soundId) {
    this.items = this.items.filter(item => item.soundId !== soundId);
  }

  clear() {
    this.items = [];
  }

  count() {
    return this.items.length;
  }

  getAllIds() {
    return this.items.map(item => item.soundId);
  }

  draw(x, y) {

    push();

    fill(255);
    textAlign(LEFT, TOP);
    textSize(16);

    text("Collected Sounds", x, y);

    for(let i = 0; i < this.items.length; i++) {

        let prefix = "  ";

        if(i === this.selectedIndex){
            prefix = "> ";
        }

        text(
            `${prefix}${i + 1}. ${this.items[i].soundId}`,
            x,
            y + 30 + i * 20
        );
    }

    pop();
  }
  
  
  save() {
    localStorage.setItem(
      "soundInventory",
      JSON.stringify(this.items)
    );
  }

  load() {
    const data = localStorage.getItem("soundInventory");

    if (data) {
      this.items = JSON.parse(data);
    }
  }

  selectNext() {
     if(this.items.length === 0)
        return;

    this.selectedIndex++;

    if(this.selectedIndex >= this.items.length)
        this.selectedIndex = 0;
  }

  selectPrevious() {

    if(this.items.length === 0)
        return;

    this.selectedIndex--;

    if(this.selectedIndex < 0)
        this.selectedIndex = this.items.length - 1;
  }

  removeSelected() {

    if(this.items.length === 0)
        return;

    const soundId =
        this.items[this.selectedIndex].soundId;

    this.remove(soundId);

    if(
        this.selectedIndex >= this.items.length
    ){
        this.selectedIndex =
            Math.max(0, this.items.length - 1);
    }
}

}