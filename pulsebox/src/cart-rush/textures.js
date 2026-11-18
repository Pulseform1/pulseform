import * as THREE from 'three';
// Locally generated, repeatable PBR surface maps. No image downloads are required.
export function createTextures(){
 let seed=973;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const allocated=[];
 function texture(draw,size=512,repeat=1){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=4;allocated.push(t);return t;}
 const tiles=texture((x,n)=>{x.fillStyle='#cbc3b2';x.fillRect(0,0,n,n);const cell=n/8;for(let row=0;row<8;row++)for(let col=0;col<8;col++){x.fillStyle=(row+col)%2?'#e9e2d3':'#f4efe4';x.fillRect(col*cell+1.5,row*cell+1.5,cell-3,cell-3);}for(let i=0;i<8000;i++){x.fillStyle=i%2?'#ffffff16':'#53594a0c';x.fillRect(rand()*n,rand()*n,1+rand()*2,1+rand()*2);}},512,8);
 const wood=texture((x,n)=>{x.fillStyle='#c4a478';x.fillRect(0,0,n,n);for(let i=0;i<1100;i++){const px=rand()*n,py=rand()*n;x.strokeStyle=i%2?'#e9c89d66':'#82694444';x.lineWidth=.3+rand()*1.3;x.beginPath();x.moveTo(px,py);x.bezierCurveTo(px+rand()*4,py+20,px-rand()*3,py+50,px+rand()*3,py+100);x.stroke();}for(let i=0;i<8;i++){x.fillStyle='#514b3522';x.fillRect(i*n/8,0,1,n);}},512,2);
 const fabric=texture((x,n)=>{x.fillStyle='#d3d1c5';x.fillRect(0,0,n,n);for(let i=0;i<n;i+=3){x.fillStyle='#4c4f4718';x.fillRect(i,0,1,n);x.fillStyle='#ffffff25';x.fillRect(0,i,n,1);}for(let i=0;i<3500;i++){x.fillStyle='#252b2411';x.fillRect(rand()*n,rand()*n,1,1);}},256,3);
 const rubber=texture((x,n)=>{x.fillStyle='#6b777b';x.fillRect(0,0,n,n);for(let i=0;i<n;i+=12){x.fillStyle='#3a434455';x.fillRect(0,i,n,3);x.fillStyle='#89929155';x.fillRect(0,i+3,n,1);}},256,2);
 const wall=texture((x,n)=>{x.fillStyle='#efeee3';x.fillRect(0,0,n,n);for(let i=0;i<10000;i++){x.fillStyle=i%2?'#1f27280b':'#ffffff44';x.fillRect(rand()*n,rand()*n,.5+rand()*2,.5+rand()*2);}},256,4);
 const brushed=texture((x,n)=>{x.fillStyle='#abb7b7';x.fillRect(0,0,n,n);for(let i=0;i<2000;i++){x.strokeStyle=i%2?'#ffffff1a':'#1e3b3b11';x.lineWidth=.3;x.beginPath();const y=rand()*n;x.moveTo(rand()*n,y);x.lineTo(n,y);x.stroke();}},256,1);
 return {tiles,wood,fabric,rubber,wall,brushed,dispose(){allocated.forEach(t=>t.dispose());}};
}
