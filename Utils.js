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
    strokeWeight(5);
    let lineIndex = 0;
    for(let x = 0; x<width; x+=20){
      setLineColor(int(lineIndex / 10));
      line(x, 0, x, height);
      lineIndex += 1;
    }
    lineIndex = 0;
    for(let y = 0; y<height; y+=20){
      setLineColor(int(lineIndex / 10));
      line(0, y, width, y);
      lineIndex += 1;
    }
    pop();
  }
}
function setLineColor(num){
  switch(num){
    case 0:
      stroke(255, 0, 0);
      break;
    case 1:
      stroke(255, 127, 0);
      break;
    case 2:
      stroke(255, 255, 0);
      break;
    case 3:
      stroke(0, 255, 0);
      break;
    case 4:
      stroke(0, 0, 255);
      break;
    case 5:
      stroke(75, 0, 130);
      break;
    default:
    case 6:
      stroke(148, 0, 211);
      break;
  }
}