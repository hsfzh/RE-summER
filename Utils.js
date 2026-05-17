function showImage(img, scale, x, y){
  imageMode(CENTER);
  if(img==null||img===undefined)
    return;
  if(scale == 0)
  {
    let xScale = width/img.width;
    let yScale = height/img.height;
    scale = min(xScale, yScale);
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