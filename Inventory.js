class Inventory {
  constructor() {
    this.items = [];
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

    for (let i = 0; i < this.items.length; i++) {
      text(
        `${i + 1}. ${this.items[i].soundId}`,
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
}