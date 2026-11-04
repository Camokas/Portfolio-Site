import { Bone, Group, InstancedMesh, OctahedronGeometry, SphereGeometry, MeshBasicMaterial, Matrix4, Vector3, Quaternion } from 'three';

// Exported GLB joints only: no invented Blender IK controls.
export function createSkeletonView(root) {
 const bones=[];root.traverse(node=>{if(node instanceof Bone)bones.push(node);});
 if(!bones.length)return null;
 const segments=bones.filter(bone=>bone.parent instanceof Bone);
 const group=new Group();group.visible=false;
 const boneGeometry=new OctahedronGeometry(1,0),jointGeometry=new SphereGeometry(1,8,6);
 const boneMaterial=new MeshBasicMaterial({color:0x8ed8ce,depthTest:false,depthWrite:false,transparent:true,opacity:.95});
 const jointMaterial=new MeshBasicMaterial({color:0xf3e3bf,depthTest:false,depthWrite:false});
 const links=new InstancedMesh(boneGeometry,boneMaterial,segments.length),joints=new InstancedMesh(jointGeometry,jointMaterial,bones.length);
 links.frustumCulled=joints.frustumCulled=false;links.renderOrder=100;joints.renderOrder=101;group.add(links,joints);
 const from=new Vector3(),to=new Vector3(),delta=new Vector3(),scale=new Vector3(),up=new Vector3(0,1,0),rotation=new Quaternion(),matrix=new Matrix4();
 const update=()=>{
  root.updateWorldMatrix(true,true);
  for(let i=0;i<segments.length;i++){
   const bone=segments[i];from.setFromMatrixPosition(bone.parent.matrixWorld);to.setFromMatrixPosition(bone.matrixWorld);delta.subVectors(to,from);
   const length=delta.length(),radius=Math.min(.018,length*.15);
   rotation.setFromUnitVectors(up,length>1e-8?delta.multiplyScalar(1/length):up);
   scale.set(radius,length/2,radius);matrix.compose(from.add(to).multiplyScalar(.5),rotation,scale);links.setMatrixAt(i,matrix);
  }
  for(let i=0;i<bones.length;i++){to.setFromMatrixPosition(bones[i].matrixWorld);matrix.makeScale(.007,.007,.007);matrix.setPosition(to);joints.setMatrixAt(i,matrix);}
  links.instanceMatrix.needsUpdate=joints.instanceMatrix.needsUpdate=true;
 };
 update();
 return {group,bonesCount:bones.length,update,dispose(){group.removeFromParent();links.dispose();joints.dispose();boneGeometry.dispose();jointGeometry.dispose();boneMaterial.dispose();jointMaterial.dispose();}};
}
