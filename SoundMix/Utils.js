function pointInRect(px, py, x, y, w, h){
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function clamp(value, minValue, maxValue){
  return Math.max(minValue, Math.min(maxValue, value));
}

function drawPanel(x, y, w, h, title){
  push();
  noStroke();
  fill(255, 246, 223, 242);
  rect(x, y, w, h, 18);
  fill(101, 73, 48);
  rect(x, y, w, 42, 18, 18, 0, 0);
  fill(255, 239, 194);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(16);
  text(title, x + 18, y + 22);
  textStyle(NORMAL);
  pop();
}

function drawSoftButton(x, y, w, h, label, active = false){
  const hover = pointInRect(mouseX, mouseY, x, y, w, h);
  push();
  noStroke();
  if(active) fill(246, 178, 89);
  else fill(hover ? color(255, 218, 139) : color(255, 238, 197));
  rect(x, y, w, h, 12);
  fill(69, 48, 32);
  textAlign(CENTER, CENTER);
  textSize(14);
  text(label, x + w / 2, y + h / 2);
  pop();
}
