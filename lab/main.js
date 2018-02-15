class ParticleAnimation extends THREE.Mesh {
  constructor(singleGeometry, amount, duration = 1.0, durationRange = 1.0) {
    let geometry = new BAS.PrefabBufferGeometry(singleGeometry, amount);
    let delayDuration = geometry.createAttribute('delayDuration', 2);

    let i, j, offset;
    for (i = 0, offset = 0; i < amount; i++) {
      let delay = Math.random() * durationRange;
      for (j = 0; j < singleGeometry.vertices.length; j++) {
        delayDuration.array[offset] = delay;
        delayDuration.array[offset + 1] = duration;
        offset += 2;
      }
    }
    //--------------------首尾位置数组-----------------------
    var startPositions = geometry.createAttribute('startPositions', 3);
    var endPositions = geometry.createAttribute('endPositions', 3);
    var start = new THREE.Vector3();
    var end = new THREE.Vector3();
    var range = 300;
    var prefabData = [];

    for (i = 0; i < amount; i++) {
      start.x = THREE.Math.randFloatSpread(range<<2);
      start.y = THREE.Math.randFloatSpread(range<<2);
      start.z = THREE.Math.randFloatSpread(range<<2);

      end.x = THREE.Math.randFloatSpread(range);
      end.y = THREE.Math.randFloatSpread(range);
      end.z = THREE.Math.randFloatSpread(range);

      geometry.setPrefabData(startPositions, i, start.toArray(
        prefabData));
      geometry.setPrefabData(endPositions, i, end.toArray(prefabData));
    }
    //-----------------------角度数组---------------------------
    var axis = new THREE.Vector3();
    var angle;
    geometry.createAttribute('aAxisAngle', 4, function(data, i, total) {
      // get a random axis
      axis.x = THREE.Math.randFloatSpread(2);
      axis.y = THREE.Math.randFloatSpread(2);
      axis.z = THREE.Math.randFloatSpread(2);
      // axis has to be normalized, or else things get weird
      axis.normalize();
      // the total angle of rotation around the axis
      angle = Math.PI * THREE.Math.randFloat(4.0, 8.0);

      // copy the data to the array
      axis.toArray(data);
      data[3] = angle;
    });
    //----------------------------------------------------------
    let material = new BAS.StandardAnimationMaterial({
      flatShading: true,
      uniforms: {
        uTime: { value: 0 }
      },
      uniformValues: {
        metalness: 0.5,
        roughness: 0.5
      },
      vertexFunctions: [
        BAS.ShaderChunk['ease_cubic_in_out'],
        BAS.ShaderChunk['ease_quad_out'],
        BAS.ShaderChunk['quaternion_rotation']
      ],
      vertexParameters: [`
        uniform float uTime;
        attribute vec2 delayDuration;
        attribute vec3 startPositions;
        attribute vec3 endPositions;
        attribute vec4 aAxisAngle;
      `],
      vertexInit: [`
        float tProgress = clamp(uTime - delayDuration.x, 0.0, delayDuration.y) / delayDuration.y;
        tProgress = easeCubicInOut(tProgress);
        vec4 tQuat = quatFromAxisAngle(aAxisAngle.xyz, aAxisAngle.w * tProgress);
      `],
      vertexNormal: [],
      vertexPosition: [`
        float scl = easeQuadOut(tProgress, 0.5, 1.0, 2.0);
        transformed *= scl;
        transformed = rotateVector(tQuat, transformed);
        transformed += mix(startPositions, endPositions, tProgress);
      `]
    });

    super(geometry, material);
    this.totalDuration = duration + durationRange;
    this.frustumCulled = false;
    Object.defineProperty(ParticleAnimation.prototype, 'time', {
      get: function() {
        return this.material.uniforms['uTime'].value;
      },
      set: function(v) {
        this.material.uniforms['uTime'].value = v;
      }
    });
  }

  animate(options) {
    options = options || {};
    options.time = this.totalDuration;
    return new TWEEN.Tween(this)
      .to({ time: this.totalDuration }, options.duration || 1000)
      .easing(options.ease || TWEEN.Easing.Linear.None)
      .yoyo(options.yoyo || true)
      .repeat(options.repeat || Infinity)
      .delay(options.delay || 1000)
      .start();
  }
}

let app = new NOVA.App();
app.world.camera.position.set(0, 0, 800);

var light = new THREE.DirectionalLight(0xff00ff);
app.world.scene.add(light);
light = new THREE.DirectionalLight(0x00ffff);
light.position.y = -1;
app.world.scene.add(light);

var animation = new ParticleAnimation(new THREE.PlaneGeometry(3.0, 3.0), 50000);
animation.animate({
  duration: 8000,
  ease: TWEEN.Easing.Quadratic.Out,
  repeat: Infinity,
  delay: 1000,
  yoyo: true
});

app.world.scene.add(animation);
app.logicLoop.add(() => {
  TWEEN.update();
});