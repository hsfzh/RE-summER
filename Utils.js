function showImage(img, scale, x, y){
  imageMode(CENTER);
  image(img, x, y, img.width*scale, img.height*scale);
}