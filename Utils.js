function showImage(img, scale, x, y){
  imageMode(CENTER);
  if(img==null||img===undefined)
    return;
  if(scale == 0)
  {
    let xScale = width/img.width;
    let yScale = height/img.height;
    scale = min(xScale, yScale);
    console.log(`화면 해상도: ${img.width*scale} x ${img.height*scale}`);
  }
  image(img, x, y, img.width*scale, img.height*scale);
}

function showText(txt, fontSize, textColor, x, y){
  textAlign(CENTER, CENTER);
  push();
  textSize(fontSize);
  fill(textColor);
  text(txt, x, y);
  pop();
}

function debugDraw(){
  if(isDebugMode){
    push();
    strokeWeight(1);
    fill(0,100);
    let lineIndex = 0;
    for(let x = 0; x<width; x+=20){
      line(x, 0, x, height);
      lineIndex += 1;
    }
    lineIndex = 0;
    for(let y = 0; y<height; y+=20){
      line(0, y, width, y);
      lineIndex += 1;
    }
    pop();
  }
}
let debugButtons = [];
function initDebugButtons(){
  let goToStartButton = new ToStartButton(width*0.3, height*0.1, 100, 50);
  let goToIntroButton = new ToIntroButton(width*0.4, height*0.1, 100, 50);
  let goHomeButton = new ToReturnButton(width*0.5, height*0.1, 100, 50);
  let goToEditButton = new ToEditButton(width*0.6, height*0.1, 100, 50);
  let goToEndingButton = new ToEndingButton(width*0.7, height*0.1, 100, 50);
  debugButtons.push(goToStartButton);
  debugButtons.push(goToIntroButton);
  debugButtons.push(goHomeButton);
  debugButtons.push(goToEditButton);
  debugButtons.push(goToEndingButton);
  for(let button of debugButtons){
    button.changeShowState(false);
  }
}

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
