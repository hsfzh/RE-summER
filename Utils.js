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