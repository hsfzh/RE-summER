function initSceneObjects(){

    // 시냇가
    sceneObjects[scenes.STREAM].push(
        new SoundObject(400,600,"water")
    );

    // 안방
    // 벽 및 장애물
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(width/2,75,946,150)
    );
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(1060,360,276,200)
    );
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(910,500,340,90)
    );
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(190,660,374,103)
    );
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(1234,525,92,390)
    );
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(148,718,74,height/2)
    );
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(246,207,130,100)
    );
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(44,425,95,352)
    );

    //부엌
    sceneObjects[scenes.KITCHEN].push(
        new SoundObject(400,600,"clock")
    );

    // 벽 및 장애물
    sceneObjects[scenes.KITCHEN].push(
        new CollisionObject(width/2,105,width,210)
    );
    sceneObjects[scenes.KITCHEN].push(
        new CollisionObject(250,310,426,193)
    );
    sceneObjects[scenes.KITCHEN].push(
        new CollisionObject(52,586,102,264)
    );
    sceneObjects[scenes.KITCHEN].push(
        new CollisionObject(694,442,239,36)
    );
    sceneObjects[scenes.KITCHEN].push(
        new CollisionObject(922,480,93,43)
    );
    sceneObjects[scenes.KITCHEN].push(
        new CollisionObject(1107,463,172,92)
    );
    sceneObjects[scenes.KITCHEN].push(
        new CollisionObject(1224,395,108,649)
    );

    // 마당
    // 벽 및 장애물
    sceneObjects[scenes.OUTSIDE].push(
        new CollisionObject(width/2,65,width,130)
    );
    sceneObjects[scenes.OUTSIDE].push(
        new CollisionObject(622,319,241,63)
    );
    sceneObjects[scenes.OUTSIDE].push(
        new CollisionObject(314,296,74,16)
    );
    sceneObjects[scenes.OUTSIDE].push(
        new CollisionObject(1008,248,122,53)
    );
    sceneObjects[scenes.OUTSIDE].push(
        new CollisionObject(1160,435,252,560)
    );
    sceneObjects[scenes.OUTSIDE].push(
        new CollisionObject(1047,596,240,248)
    );
    sceneObjects[scenes.OUTSIDE].push(
        new CollisionObject(60,height/2,120,height)
    );
    sceneObjects[scenes.OUTSIDE].push(
        new CollisionObject(362,629,483,171)
    );
    sceneObjects[scenes.OUTSIDE].push(
        new CollisionObject(946,655,672,119)
    );
}