import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Bone,Matrix4,Vector3}from'three';
import {createSkeletonView}from'../src/scripts/modelSkeleton.mjs';
test('exported skeleton follows animation and model normalisation in world space',()=>{
 const root=new Group();root.position.set(2,3,4);root.scale.setScalar(.5);
 const parent=new Bone(),child=new Bone();child.position.y=2;parent.add(child);root.add(parent);
 const view=createSkeletonView(root);assert.equal(view.bonesCount,2);
 const matrix=new Matrix4(),position=new Vector3();
 view.group.children[0].getMatrixAt(0,matrix);position.setFromMatrixPosition(matrix);
 assert.ok(position.distanceTo(new Vector3(2,3.5,4))<1e-6);
 parent.rotation.z=Math.PI/2;view.update();view.group.children[0].getMatrixAt(0,matrix);position.setFromMatrixPosition(matrix);
 assert.ok(position.distanceTo(new Vector3(1.5,3,4))<1e-6);
 view.dispose();
});
test('models without exported bones have no skeleton mode',()=>assert.equal(createSkeletonView(new Group()),null));
