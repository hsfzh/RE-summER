function initSceneObjects(){

    // 시냇가
    sceneObjects[scenes.STREAM].push(
        new SoundObject(400,600,"splash", player)
    );

    sceneObjects[scenes.STREAM].push(
        new SoundObject(800,400,"riverKid", player, 1.5)
    );

    // 벽 및 장애물
    sceneObjects[scenes.STREAM].push(
        new CollisionObject(220,87,480,177)
    );
    sceneObjects[scenes.STREAM].push(
        new CollisionObject(60,250,150,200)
    );
    sceneObjects[scenes.STREAM].push(
        new CollisionObject(200,220,180,100)
    );
    sceneObjects[scenes.STREAM].push(
        new CollisionObject(320,200,100,100)
    );
    //sceneObjects[scenes.STREAM].push(
    //    new CollisionObject(936,275,326,10)
    //);
    sceneObjects[scenes.STREAM].push(
        new CollisionObject(620,423,88,43)
    );
    sceneObjects[scenes.STREAM].push(
        new CollisionObject(538,490,97,37)
    );
    sceneObjects[scenes.STREAM].push(
        new CollisionObject(846,434,40,40)
    );
    sceneObjects[scenes.STREAM].push(
        new CollisionObject(1014,368,188,38)
    );
    sceneObjects[scenes.STREAM].push(
        new CollisionObject(926,48,728,102)
    );
    sceneObjects[scenes.STREAM].push(
        new CollisionObject(748,667,245,84)
    );
    sceneObjects[scenes.STREAM].push(
        new CollisionObject(1165,633,246,157)
    );

    // 안방
    sceneObjects[scenes.BEDROOM].push(
        new SoundObject(1000,350,"tv",player)
    );

    sceneObjects[scenes.BEDROOM].push(
        new SoundObject(250,250,"fan",player)
    );

    // 벽 및 장애물
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(width/2,75,946,150)
    );
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(1120,230,250,500)
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
        new CollisionObject(200,207,200,100)
    );
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(44,height/2,95,height)
    );
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(100,height/4 + 50 ,95,height/2)
    );

    //부엌
    sceneObjects[scenes.KITCHEN].push(
        new SoundObject(400,600,"stew",player)
    );

    sceneObjects[scenes.KITCHEN].push(
        new SoundObject(350,400,"meat",player)
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
     sceneObjects[scenes.OUTSIDE].push(
        new SoundObject(300,400,"bark",player)
    );

    sceneObjects[scenes.OUTSIDE].push(
        new SoundObject(850,400,"broom",player)
    );
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
        new CollisionObject(435,640,340,140)
    );
    sceneObjects[scenes.OUTSIDE].push(
        new CollisionObject(190,620,160,140)
    );
    sceneObjects[scenes.OUTSIDE].push(
        new CollisionObject(946,655,672,119)
    );
}