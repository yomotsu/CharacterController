
// based on https://github.com/insominx/WebFPS
// improved(?) by @yomotsu

function CharacterController( threeObject, radius, height, world ) {

  this.world = world;
  this.object = threeObject;
  this.body = null;
  this.height = height;

  // movement and rotation toggles
  this.forward = false;
  this.right = false;
  this.left = false;
  this.back = false;
  this.isGrounded = false;
  this.isWalking = false;
  this.isJumping = false;
  this.inOnSlope = false;
  this.frontAngle = 0; // 0 to 360 deg
  this.pointerLockControls = null;

  this.movementSpeed = 50;
  this.jumpImpulse = 1500;

  this.groundPadding = height * 0.05;

  this.currentGroundHeight = 0;
  this.currentGroundNormal = new THREE.Vector3();


  // z value supposedly not used, but setting to radius just in case
  var shape = new Ammo.btCapsuleShape( radius, this.height / 2 );

  // slightly off the ground
  var transform = new Ammo.btTransform();
  var transfromOrigin = new Ammo.btVector3(
    this.object.position.x,
    this.object.position.y,
    this.object.position.z
  )
  transform.setIdentity();
  transform.setOrigin( transfromOrigin );

  localInertia = new Ammo.btVector3( 0, 0, 0 );

  var motionState = new Ammo.btDefaultMotionState( transform );
  var mass = 60;

  shape.calculateLocalInertia( mass, localInertia );

  var rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, shape,localInertia );

  this.body = new Ammo.btRigidBody( rbInfo );
  this.body.setWorldTransform( transform );
  this.body.setDamping( 0, 1.0 );

  // keeps physics from going to sleep (from bullet documentation)
  var DISABLE_DEACTIVATION = 4;
  this.body.setActivationState( DISABLE_DEACTIVATION );
  dynamicsWorld.addRigidBody( this.body );

  // turns off all rotation
  this.body.setAngularFactor( new Ammo.btVector3( 0, 1, 0 ) );

  Ammo.destroy( shape );
  Ammo.destroy( transform );
  Ammo.destroy( transfromOrigin );
  Ammo.destroy( localInertia );
  // Ammo.destroy( motionState );
  Ammo.destroy( rbInfo );

}


CharacterController.prototype.update = function () {

  this.updateRenderMatrix();
  this.updateGrounding();

  if ( this.isGrounded ) {

      if ( this.isJumping ) {

        var jumpVec = new Ammo.btVector3( 0, this.jumpImpulse, 0 );
        this.body.applyCentralImpulse( jumpVec );

        Ammo.destroy( jumpVec );

      } else if ( this.inOnSlope ) {

        var velocityX =  this.currentGroundNormal.x;
        var velocityY = -this.currentGroundNormal.y * 30;
        var velocityZ =  this.currentGroundNormal.z;
        var ammoVelocityVector = new Ammo.btVector3( velocityX, velocityY, velocityZ );
        this.body.setLinearVelocity( ammoVelocityVector );
        Ammo.destroy( ammoVelocityVector );

      } else {

        // Clamp the threeObject to the terrain to prevent floating off hills
        var y = this.body.getWorldTransform().getOrigin().getY();
        var hat = y - this.height / 2 - this.currentGroundHeight;
        var translate = new Ammo.btVector3( 0, -hat, 0 );
        this.body.translate( translate );

        var velocityX = -Math.sin( THREE.Math.degToRad( this.frontAngle ) ) * this.movementSpeed * this.isWalking;
        var velocityZ = -Math.cos( THREE.Math.degToRad( this.frontAngle ) ) * this.movementSpeed * this.isWalking;
        var ammoVelocityVector = new Ammo.btVector3( velocityX, 0, velocityZ );
        this.body.setLinearVelocity( ammoVelocityVector );

        Ammo.destroy( translate );
        Ammo.destroy( ammoVelocityVector );

      }

    }

  this.isJumping = false;

};


CharacterController.prototype.updateRenderMatrix = function () {

  var origin = this.body.getWorldTransform().getOrigin();
  var position = new THREE.Vector3( origin.x(), origin.y(), origin.z() );
  this.object.matrixWorld.setPosition( position );

};

CharacterController.prototype.updateGrounding = function () {

  // allow jumps a chance to get off the ground
  if ( this.body.getLinearVelocity().getY() < 0 ) {

    var origin = this.body.getWorldTransform().getOrigin();
    var fromPoint = new Ammo.btVector3(
      origin.getX(),
      origin.getY(),
      origin.getZ()
    );
    var toPoint = new Ammo.btVector3(
      fromPoint.x(),
      fromPoint.y() - this.height / 2 - this.groundPadding,
      fromPoint.z()
    );
    var rayCallback = new Ammo.ClosestRayResultCallback( fromPoint, toPoint );

    this.world.rayTest( fromPoint, toPoint, rayCallback );
    this.isGrounded = rayCallback.hasHit();

    if ( this.isGrounded ) {

      this.currentGroundHeight = rayCallback.get_m_hitPointWorld().getY();

    }

    this.currentGroundNormal.set(
      rayCallback.get_m_hitNormalWorld().getX(),
      rayCallback.get_m_hitNormalWorld().getY(),
      rayCallback.get_m_hitNormalWorld().getZ()
    );

    if (
      Math.abs( this.currentGroundNormal.x ) > 0.7 ||
      Math.abs( this.currentGroundNormal.z ) > 0.7
    ) {

      this.inOnSlope = true;

    } else {

      this.inOnSlope = false;

    }

    Ammo.destroy( fromPoint );
    Ammo.destroy( toPoint );
    Ammo.destroy( rayCallback );

  } else {

    this.isGrounded = false;

  }

};

CharacterController.prototype.jump = function () {

  this.isJumping = true;

};
