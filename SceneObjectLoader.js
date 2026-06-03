function initSceneObjects(){

    // 시냇가
    sceneObjects[scenes.STREAM].push(
        new SoundObject(400,600,"water")
    );

    //부엌
    sceneObjects[scenes.KITCHEN].push(
        new SoundObject(400,600,"clock")
    );
}