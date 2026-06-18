function initSceneObjects(){

    // 시냇가
    sceneObjects[scenes.STREAM].push(
        new SoundObject(400,600,"creek_water", player)
    );

    sceneObjects[scenes.STREAM].push(
        new SoundObject(560,440,"water_splash", player)
    );

    sceneObjects[scenes.STREAM].push(
        new SoundObject(850,450,"fish_catch_underwater", player)
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
        new SoundObject(350,250,"lamp_switch", player)
    );

    sceneObjects[scenes.BEDROOM].push(
        new SoundObject(250,300,"fan_hum", player)
    );

    sceneObjects[scenes.BEDROOM].push(
        new SoundObject(1100,350,"old_tv", player)
    );

    sceneObjects[scenes.BEDROOM].push(
        new SoundObject(950,300,"phone_ring", player)
    );

    // 벽 및 장애물
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(width/2,90,946,150)
    );
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(1050,310,250,50)
    );
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(1150,100,100,300)
    );
    sceneObjects[scenes.BEDROOM].push(
        new CollisionObject(870,500,300,90)
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
        new SoundObject(725,500,"knife_chop", player)
    );
    sceneObjects[scenes.KITCHEN].push(
        new SoundObject(900,500,"wood_chop", player)
    );
    sceneObjects[scenes.KITCHEN].push(
        new SoundObject(200,500,"stew_boil", player)
    );
    sceneObjects[scenes.KITCHEN].push(
        new SoundObject(350,500,"grilling_meat", player)
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
        new SoundObject(300,400,"dog_bark", player)
    );

    sceneObjects[scenes.OUTSIDE].push(
        new SoundObject(1000,500,"cricket", player)
    );

    sceneObjects[scenes.OUTSIDE].push(
        new SoundObject(400,600,"helicopter_pass", player)
    );

    sceneObjects[scenes.OUTSIDE].push(
        new SoundObject(900,400,"sweeping_yard", player)
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

    // 전화 씬
    sceneObjects[scenes.CALLING].push(
        new GameObject(width/2, height/2, images.call_phone, 1, false, 1)
    )
    sceneObjects[scenes.CALLING].push(
        new GameObject(width*19/55, height*5/11, images.call_player, 1, false, 1)
    )
    sceneObjects[scenes.CALLING].push(
        new GameObject(width*13/20, height*2/5, images.call_mom, 1, false, 1)
    )

    // 모든 오브젝트 추가 후 마지막에
    ResetAllObjects();
}

function ResetAllObjects(){
    for(let objects of sceneObjects){
        for(let object of objects) 
            object.deactivate();
    }
}