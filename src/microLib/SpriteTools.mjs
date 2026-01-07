//	===============================================
//	spritetools.js
// © 1996-2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

//
// options:
//	orgPrefix:"",
//	mskPrefix:"A_"
//	shdPrefix:"S_"
//	doShd:true
//	digitCount:4
//	suffix:"png"
// 	doShd:true
//	hasMsk:true
//	invMsk:false
//	ox:32
//	oy:32
// 	reduceDub:false
//	orgDubRedSen:0
//	sdhDubRedSen:0
//	orgShkSen:0
//	shsShkSen:0
// 	normShd:true
// _shdTrig:20


// info bits: available lighting and shadow tiles, lighting and shadow blocker from direction (lsbl)...
const TILE_INFOBITS_SHDW_SELF=1<<0;
const TILE_INFOBITS_SHDW_R=1<<1;
const TILE_INFOBITS_SHDW_B=1<<2;
const TILE_INFOBITS_SHDW_BR=1<<3;
const TILE_INFOBITS_LIGT_TL=1<<4;
const TILE_INFOBITS_LIGT_T=1<<5;
const TILE_INFOBITS_LIGT_TR=1<<6;
const TILE_INFOBITS_LIGT_L=1<<7;
const TILE_INFOBITS_LIGT_SELF=1<<8;
const TILE_INFOBITS_LIGT_R=1<<9;
const TILE_INFOBITS_LIGT_BL=1<<10;
const TILE_INFOBITS_LIGT_B=1<<11;
const TILE_INFOBITS_LIGT_BR=1<<12;
const TILE_INFOBITS_LMSK=1<<13;
const TILE_INFOBITS_SMSK=1<<14;
const TILE_INFOBITS_LSBL_TL=1<<16;
const TILE_INFOBITS_LSBL_T=1<<17;
const TILE_INFOBITS_LSBL_TR=1<<18;
const TILE_INFOBITS_LSBL_L=1<<19;
const TILE_INFOBITS_LSBL_R=1<<20;
const TILE_INFOBITS_LSBL_BL=1<<21;
const TILE_INFOBITS_LSBL_B=1<<22;
const TILE_INFOBITS_LSBL_BR=1<<23;
const TILE_INFOBITS_LAYER_FLR=1<<24;
const TILE_INFOBITS_LAYER_THG=1<<25;
const TILE_INFOBITS_LAYER_STO=1<<26;
const TILE_INFOBITS_LAYER_INV=1<<27;
const TILE_INFOBITS_LAYER_EDT=1<<28;

const TILE_INFOBITS_FULL_LSBL=TILE_INFOBITS_LSBL_TL|TILE_INFOBITS_LSBL_T|TILE_INFOBITS_LSBL_TR|TILE_INFOBITS_LSBL_L|TILE_INFOBITS_LSBL_R|TILE_INFOBITS_LSBL_BL|TILE_INFOBITS_LSBL_B|TILE_INFOBITS_LSBL_BR;
const TILE_INFOBITS_ANY_SHDW=TILE_INFOBITS_SHDW_SELF|TILE_INFOBITS_SHDW_R|TILE_INFOBITS_SHDW_B|TILE_INFOBITS_SHDW_BR;
const TILE_INFOBITS_ANY_LIGT=TILE_INFOBITS_LIGT_TL|TILE_INFOBITS_LIGT_T|TILE_INFOBITS_LIGT_TR|TILE_INFOBITS_LIGT_L|TILE_INFOBITS_LIGT_SELF|TILE_INFOBITS_LIGT_R|TILE_INFOBITS_LIGT_BL|TILE_INFOBITS_LIGT_B|TILE_INFOBITS_LIGT_BR;
const TILE_INFOBITS_ANY_LIGT_OR_SHDW=TILE_INFOBITS_ANY_SHDW|TILE_INFOBITS_ANY_LIGT;

const TILE_INFOBITS=0;
const TILE_NORM_XS=1;
const TILE_NORM_YS=2;
const TILE_SHDW_XS=3;
const TILE_SHDW_YS=4;
const TILE_SHDW_R_XS=5;
const TILE_SHDW_R_YS=6;
const TILE_SHDW_B_XS=7;
const TILE_SHDW_B_YS=8;
const TILE_SHDW_BR_XS=9;
const TILE_SHDW_BR_YS=10;
const TILE_SMSK_XS=11;
const TILE_SMSK_YS=12;
const TILE_LIGT_XS=13;
const TILE_LIGT_YS=14;
const TILE_LIGT_TL_XS=15;
const TILE_LIGT_TL_YS=16;
const TILE_LIGT_T_XS=17;
const TILE_LIGT_T_YS=18;
const TILE_LIGT_TR_XS=19;
const TILE_LIGT_TR_YS=20;
const TILE_LIGT_L_XS=21;
const TILE_LIGT_L_YS=22;
const TILE_LIGT_R_XS=23;
const TILE_LIGT_R_YS=24;
const TILE_LIGT_BL_XS=25;
const TILE_LIGT_BL_YS=26;
const TILE_LIGT_B_XS=27;
const TILE_LIGT_B_YS=28;
const TILE_LIGT_BR_XS=29;
const TILE_LIGT_BR_YS=30;
const TILE_LMSK_XS=31;
const TILE_LMSK_YS=32;
const TILE_SHAD_ID=33;
const TILE_NORM_IMGNO=34;
const TILE_SHDW_IMGNO=35;
const TILE_LIGT_IMGNO=36;
const TILE_DATA_LENGTH=37;

const TILE_SHAD_ID_NORMAL=0;
const TILE_SHAD_ID_LIGHTRAYS=1;
const TILE_LIGHT_EMITTERS=4;
const TILE_LIGHT_NORTH_NO=5;
const TILE_LIGHT_EAST_NO=6;
const TILE_LIGHT_SOUTH_NO=7;
const TILE_LIGHT_WEST_NO=8;

var NULLTILE=new Array(TILE_DATA_LENGTH).fill(0);
var REDRAWTILE=new Array(TILE_DATA_LENGTH).fill(0);
REDRAWTILE[TILE_INFOBITS]=TILE_INFOBITS_ANY_LIGT_OR_SHDW

const SPRITE_INFOBITS_SHDW=1<<0;
const SPRITE_INFOBITS_LIGT=1<<1;
const SPRITE_INFOBITS_LMSK=1<<2;
const SPRITE_INFOBITS_SMSK=1<<3;
const SPRITE_INFOBITS_LAYER_ACT=1<<4;
const SPRITE_INFOBITS_LAYER_EFX=1<<5;
const SPRITE_INFOBITS_LAYER_EDS=1<<6;
const SPRITE_INFOBITS_LAYER_IVS=1<<7;
const SPRITE_INFOBITS_LAYER_GUI=1<<8;
//const SPRITE_SHAD_BALL=0;

const SPRITE_INFOBITS=0;
const SPRITE_NORM_XS=1;
const SPRITE_NORM_YS=2;
const SPRITE_NORM_W=3;
const SPRITE_NORM_H=4;
const SPRITE_NORM_XO=5;
const SPRITE_NORM_YO=6;
const SPRITE_SHDW_XS=7;
const SPRITE_SHDW_YS=8;
const SPRITE_SHDW_W=9;
const SPRITE_SHDW_H=10;
const SPRITE_SHDW_XO=11;
const SPRITE_SHDW_YO=12;
const SPRITE_SMSK_XS=13;
const SPRITE_SMSK_YS=14;
const SPRITE_SMSK_W=15;
const SPRITE_SMSK_H=16;
const SPRITE_SMSK_XO=17;
const SPRITE_SMSK_YO=18;
const SPRITE_LIGT_XS=19;
const SPRITE_LIGT_YS=20;
const SPRITE_LIGT_W=21;
const SPRITE_LIGT_H=22;
const SPRITE_LIGT_XO=23;
const SPRITE_LIGT_YO=24;
const SPRITE_LMSK_XS=25;
const SPRITE_LMSK_YS=26;
const SPRITE_LMSK_W=27;
const SPRITE_LMSK_H=28;
const SPRITE_LMSK_XO=29;
const SPRITE_LMSK_YO=30;
const SPRITE_SHAD_ID=31;
const SPRITE_SHAD_TX=32;
const SPRITE_SHAD_NO=33;
const SPRITE_NORM_IMGNO=34;
const SPRITE_SHDW_IMGNO=35;
const SPRITE_LIGT_IMGNO=36;
const SPRITE_DATA_LENGTH=37;

const LAYERTEXURES_FLR=0;
const LAYERTEXURES_THG=1;
const LAYERTEXURES_TSHDW=2;
const LAYERTEXURES_SSHDW=3;
const LAYERTEXURES_TLIGT=4;
const LAYERTEXURES_SLIGT=5;
const LAYERTEXURES_STO=6;
const LAYERTEXURES_ACT=7;
const LAYERTEXURES_EFX=8;
const LAYERTEXURES_INV=9;
const LAYERTEXURES_IVS=10;
const LAYERTEXURES_GUI=11;
const LAYERTEXURES_FIRST=LAYERTEXURES_FLR;
const LAYERTEXURES_LAST=LAYERTEXURES_GUI;

var LAYERTEXTURES_IDS=["FLR","THG","TSHDW","SSHDW","TLIGT","SLIGT","STO","ACT","EFX","INV","IVS","GUI"];


//	===============================================
//	Sprite Atlas Generation Helper Functions
//	===============================================

SpriteToolsBitGrowingPacker=function(){};
SpriteToolsBitGrowingPacker.prototype={
	fit:function(_blocks,_doSquare) {
		var n,node,block,len=_blocks.length;
		var w=0,h=0;
		for(n=0;n<len;n++){
			if(_blocks[n].w>w)w=_blocks[n].w;
			if(_blocks[n].h>h)h=_blocks[n].h;
		};
		this.root={x:0,y:0,w:w,h:h};
		for(n=0;n<len;n++){
			block=_blocks[n];
			if(node=this.findNode(this.root,block.w,block.h)){
				block.fit=this.splitNode(node,block.w,block.h);
			}else{
				block.fit=this.growNode(block.w,block.h,_doSquare);
			};
		}
	},

	findNode:function(root,w,h){
		if(root.used){
			return this.findNode(root.right,w,h)||this.findNode(root.down,w,h);
		}else if((w<=root.w)&&(h<=root.h)){
			return root;
		}else{
			return null;
		};
	},

	splitNode:function(node,w,h){
		node.used=true;
		node.down={x:node.x,y:node.y+h,w:node.w,h:node.h-h};
		node.right={x:node.x+w,y:node.y,w:node.w-w,h:h};
		//log("splitNode",node.x,node.y)
		return node;
	},

	growNode:function(w,h,_doSquare) {
		//log("growNode",this.root.w,this.root.h)
		var canGrowDown=(w<=this.root.w);
		var canGrowRight=(h<=this.root.h);
		var shouldGrowRight=false,shouldGrowDown=false; 
		if(!_doSquare&&canGrowRight&&canGrowDown){
			shouldGrowRight=canGrowRight&&(this.root.h>=(this.root.w+w)); 
			// ...attempt to keep square-ish by growing right when height is much greater than width
			shouldGrowDown=canGrowDown&&(this.root.w>=(this.root.h+h)); 
			// ...attempt to keep square-ish by growing down when width is much greater than height
		}else{
			if(Math.minMaxRandom(0,10)>5){
				shouldGrowRight=canGrowRight;
				shouldGrowDown=!shouldGrowRight;
			}else{
				shouldGrowDown=canGrowDown;
				shouldGrowRight=!shouldGrowDown;
			};
		};
		
		if(shouldGrowRight){
			return this.growRight(w,h);
		}else if(shouldGrowDown){
			return this.growDown(w,h);
		}else if(canGrowRight){
		 return this.growRight(w,h);
		}else if(canGrowDown){
			return this.growDown(w,h);
		}else{
			return null;
			// ...need to ensure sensible root starting size to avoid this happening
		};
	},

	growRight:function(w,h){
		this.root={
			used:true,
			x:0,
			y:0,
			w:this.root.w+w,
			h:this.root.h,
			down:this.root,
			right:{x:this.root.w,y:0,w:w,h:this.root.h}
		};
		if(node=this.findNode(this.root,w,h)){
			return this.splitNode(node,w,h);
		}else{
			return null;
		};
	},

	growDown:function(w,h){
		this.root={
			used:true,
			x:0,
			y:0,
			w:this.root.w,
			h:this.root.h+h,
			down:{x:0,y:this.root.h,w:this.root.w,h:h},
			right:this.root
		};
		if(node=this.findNode(this.root,w,h)){
			return this.splitNode(node,w,h);
		}else{
			return null;
		};
	}
};


SpriteToolsBitGrowingPackerStrictSquare=function(){};
SpriteToolsBitGrowingPackerStrictSquare.prototype={
	fit:function(_blocks,_maxSize) {
		var n,node,_block,len=_blocks.length;
		var w=0,h=0;
		this.maxSize=_maxSize;
		for(n=0;n<len;n++){
			if(_blocks[n].w>w)w=_blocks[n].w;
			if(_blocks[n].h>h)h=_blocks[n].h;
		};
		this.root={x:0,y:0,w:w,h:h};
		for(n=0;n<len;n++){
			block=_blocks[n];
			if(node=this.findNode(this.root,block.w,block.h)){
				block.fit=this.splitNode(node,block.w,block.h);
				if(block.fit==null)return;
			}else{
				block.fit=this.growNode(block.w,block.h);
				if(block.fit==null)return;
			};
		};
	},

	findNode:function(root,w,h){
		if(root.used){
			return this.findNode(root.right,w,h)||this.findNode(root.down,w,h);
		}else if((w<=root.w)&&(h<=root.h)){
			return root;
		}else{
			return null;
		};
	},

	splitNode:function(node,w,h){
		node.used=true;
		node.down={x:node.x,y:node.y+h,w:node.w,h:node.h-h};
		node.right={x:node.x+w,y:node.y,w:node.w-w,h:h};
		return node;
	},

	growNode:function(w,h,maxSize) {
		var canGrowDown=(w<=this.root.w)&&((this.root.h+h)<=this.maxSize); 
		var canGrowRight=(h<=this.root.h)&&((this.root.w+w)<=this.maxSize); 
		var shouldGrowRight=canGrowRight&&(this.root.h>=(this.root.w+w));
		var shouldGrowDown=canGrowDown&&(this.root.w>=(this.root.h+h));
		//log("canGrowDown",canGrowDown.asText(),((this.root.w+w)<this.maxSize));
		//log("canGrowRight",canGrowRight.asText(),((this.root.h+h)<this.maxSize));
		if(shouldGrowRight){
			return this.growRight(w,h);
		}else if(shouldGrowDown){
			return this.growDown(w,h);
		}else if(canGrowRight){
			return this.growRight(w,h);
		}else if(canGrowDown){
			return this.growDown(w,h);
		}else{
			return null; 
		};
	},

	growRight:function(w,h){
		this.root={
			used:true,
			x:0,
			y:0,
			w:this.root.w+w,
			h:this.root.h,
			down:this.root,
			right:{x:this.root.w,y:0,w:w,h:this.root.h}
		};
		if(node=this.findNode(this.root,w,h)){
			return this.splitNode(node,w,h);
		}else{
			return null;
		};
	},

	growDown:function(w,h){
		this.root={
			used:true,
			x:0,
			y:0,
			w:this.root.w,
			h:this.root.h+h,
			down:{x:0,y:this.root.h,w:this.root.w,h:h},
			right:this.root
		};
		if(node=this.findNode(this.root,w,h)){
			return this.splitNode(node,w,h);
		}else{
			return null;
		};
	}
};


//	===============================================
//	Sprite Generation Functions
//	===============================================
 
function SpriteTools(){};
ENUMERATION=1;
SpriteTools.EVENT_ERROR_RESULTIMAGETOBIG=SpriteTools.prototype.EVENT_ERROR_RESULTIMAGETOBIG=0-ENUMERATION++;
SpriteTools.EVENT_ERROR_IMAGELOAD=SpriteTools.prototype.EVENT_ERROR_IMAGELOAD=0-ENUMERATION++;
SpriteTools.EVENT_ERROR_GENERAL=SpriteTools.prototype.EVENT_ERRORGENERAL=0-ENUMERATION++;
SpriteTools.EVENT_NONE=SpriteTools.prototype.EVENT_NONE=ENUMERATION++;
SpriteTools.EVENT_PROCESS=SpriteTools.prototype.EVENT_PROCESS=ENUMERATION++;
SpriteTools.EVENT_IMAGELOADED=SpriteTools.prototype.EVENT_IMAGELOADED=ENUMERATION++;
SpriteTools.EVENT_IMAGESLOADED=SpriteTools.prototype.EVENT_IMAGESLOADED=ENUMERATION++;
SpriteTools.EVENT_READYNOIMAGESTOLOAD=SpriteTools.prototype.EVENT_READYNOIMAGESTOLOAD=ENUMERATION++;
SpriteTools.EVENT_SPRITESCANSTART=SpriteTools.prototype.EVENT_SPRITESCANSTART=ENUMERATION++;
SpriteTools.EVENT_MASKPREPARESTART=SpriteTools.prototype.EVENT_MASKPREPARESTART=ENUMERATION++;
SpriteTools.EVENT_REDUCEDUPLICATES=SpriteTools.prototype.EVENT_REDUCEDUPLICATES=ENUMERATION++;
SpriteTools.EVENT_SPRITECOPY=SpriteTools.prototype.EVENT_SPRITECOPY=ENUMERATION++;
SpriteTools.EVENT_BITPACKSTART=SpriteTools.prototype.EVENT_BITPACKSTART=ENUMERATION++;
SpriteTools.EVENT_READY=SpriteTools.prototype.EVENT_READY=ENUMERATION++;
SpriteTools.prototype.eventType=SpriteTools.EVENT_NONE;
SpriteTools.prototype.cnvImgSrc=null;
SpriteTools.prototype.cnvImgSrcCtx=null;
SpriteTools.prototype.cnvImgSrcCtxImage=null;
SpriteTools.prototype.cnvImgSrcCtxImageData=null;
SpriteTools.prototype.memImgSrc=null;


SpriteTools.prototype._ResizeImage=function(_cnv,_xSize,_ySize){
var cnv=document.createElement('canvas'),ctxt=cnv.getContext("2d");
	cnv.width=_xSize;
	cnv.height=_ySize;
	ctxt.imageSmoothingEnabled=false;
	ctxt.drawImage(_cnv,0,0,_cnv.width,_cnv.height,0,0,_cnv.width,_cnv.height);
	return cnv;
};

SpriteTools.prototype._SpriteToolsBitPacker=function(_bitpackrects,_options){
var BitPackEffectivity;
var BitPackOptimumArea;
var l=_bitpackrects.length,i,ret=[0,0],j=0,noOfTries=1000;
	if(_options===undefined)_options={doSquare:true};
	if(!_options.hasOwnProperty("doSquare"))_options.doSquare=false;
	function _BitPack(_bitpackrects){
	var l=_bitpackrects.length,i;
	var packer=new SpriteToolsBitGrowingPacker(),bitpackrects;
	var o,maxx=0,maxy=0,maxRectNo=0;
		bitpackrects=[];
		for(i=0;i<l;i++)bitpackrects[i]=_bitpackrects[i];
		bitpackrects.sort(function(_a,_b){return Math.max(_b.w,_b.h)-Math.max(_a.w,_a.h);});
		packer.fit(bitpackrects,_options.doSquare);
		maxx=0;
		maxy=0;
		for(i=0;i<l;i++){
			if(bitpackrects[i].fit){
				bitpackrects[i].x=bitpackrects[i].fit.x;
				bitpackrects[i].y=bitpackrects[i].fit.y;
				if(bitpackrects[i].x+bitpackrects[i].w>maxx)maxx=bitpackrects[i].x+bitpackrects[i].w;
				if(bitpackrects[i].y+bitpackrects[i].h>maxy)maxy=bitpackrects[i].y+bitpackrects[i].h;
			};
		};
		return[maxx,maxy];
	};
	
	if(l==0)return [0,0];
	return _BitPack(_bitpackrects);
};

SpriteTools.prototype._SpriteToolsBitPackerStrictSquare=function(_bitpackrects,_maxSize){
var BitPackEffectivity;
var BitPackOptimumArea;
var l=_bitpackrects.length,i,ret=[0,0],j=0;
	
	function _BitPack(_bitpackrects){
	var l=_bitpackrects.length,packer=new SpriteToolsBitGrowingPackerStrictSquare(),bitpackrects;
	var o,maxx=0,maxy=0;
		bitpackrects=[]
		for(i=0;i<l;i++)bitpackrects[i]=_bitpackrects[i];
		packer.fit(bitpackrects,_maxSize);
		maxx=0;
		maxy=0;
		for(i=0;i<l;i++){
			if(bitpackrects[i].fit){
				bitpackrects[i].x=bitpackrects[i].fit.x;
				bitpackrects[i].y=bitpackrects[i].fit.y;
				if(bitpackrects[i].x+bitpackrects[i].w>maxx)maxx=bitpackrects[i].x+bitpackrects[i].w;
				if(bitpackrects[i].y+bitpackrects[i].h>maxy)maxy=bitpackrects[i].y+bitpackrects[i].h;
			};
		};
		return[maxx,maxy];
	};
	
	if(l==0)return [0,0];
	return _BitPack(_bitpackrects);
};


SpriteTools.prototype._cnvImgSrc_GetPixel=function(_x,_y){
var p=this.cnvImgSrcCtxImageData,i=(_x+_y*this.cnvImgSrc.width)*4;
	return p[i+3]<<24|p[i+2]|p[i+1]<<8|p[i]<<16;
};

SpriteTools.prototype._cnvImgSrc_ShadowPixel=function(_x,_y){
var c,p=this.cnvImgSrcCtxImageData,im=(_x+_y*this.cnvImgSrc.width)*4;
	c=((255-(((p[im+2]+p[im+1]+p[im])/3))&0xFF)<<24)|((p[im+3]<<24|p[im+2]|p[im+1]<<8|p[im]<<16)&0x00FFFFFF);
	p[im+3]=c>>24&0xFF;
	p[im+2]=c&0xFF;
	p[im+1]=c>>8&0xFF;
	p[im]=c>>16&0xFF;
};

SpriteTools.prototype._cnvImgSrc_GetPixelMaskLight=function(_xo,_yo,_xm,_ym){
var p=this.cnvImgSrcCtxImageData,im=(_xm+_ym*this.cnvImgSrc.width)*4,io=(_xo+_yo*this.cnvImgSrc.width)*4;
	return ((255-(((p[im+2]+p[im+1]+p[im])/3))&0xFF)<<24)|((p[io+3]<<24|p[io+2]|p[io+1]<<8|p[io]<<16)&0x00FFFFFF);
};

SpriteTools.prototype._cnvImgSrc_PutPixel=function(_x,_y,_c){
var p=this.cnvImgSrcCtxImageData,i=(_x+_y*this.cnvImgSrc.width)*4;
	p[i+3]=_c>>24&0xFF;
	p[i+2]=_c&0xFF;
	p[i+1]=_c>>8&0xFF;
	p[i]=_c>>16&0xFF;
};

SpriteTools.prototype._cnvImgSrc_CompareBox=function(_i,_j,_dubRedSen){
var x,y,p=this.cnvImgSrcCtxImageData,i,j,w=this.cnvImgSrc.width,s;
	if(_dubRedSen>0){
		s=_dubRedSen;
		for(x=_i.xs;x<=_i.xe;x++){
			for(y=_i.ys;y<=_i.ye;y++){
				i=(x+y*w)*4;
				j=((x-_i.xs+_j.xs)+(y-_i.ys+_j.ys)*w)*4;
				if(Math.abs(p[i]-p[j])>s||Math.abs(p[i+1]-p[j+1])>s||Math.abs(p[i+2]-p[j+2])>s||Math.abs(p[i+3]-p[j+3])>s)return false;
			};
		};
	}else{
		for(x=_i.xs;x<=_i.xe;x++){
			for(y=_i.ys;y<=_i.ye;y++){
				i=(x+y*w)*4;
				j=((x-_i.xs+_j.xs)+(y-_i.ys+_j.ys)*w)*4;
				if(p[i]!=p[j]||p[i+1]!=p[j+1]||p[i+2]!=p[j+2]||p[i+3]!=p[j+3])return false;
			};
		};	
	};
	return true;
};

SpriteTools.prototype._IsFullWhiteTile=function(_img,_xs,_ys){
var data=_img.cnvCtx.getImageData(_xs,_ys,64,64).data,x,y,i;
	for(y=0;y<63;y++){
		for(x=0;x<63;x++){
			i=(x+y*64)*4;
			if(data[i]!=255||data[i+1]!=255||data[i+2]!=255||data[i+3]!=255)return false;
		};
	};
	return true;
};
SpriteTools.prototype._IsFullBlackTile=function(_img,_xs,_ys){
var data=_img.cnvCtx.getImageData(_xs,_ys,64,64).data,x,y,i;
	for(y=0;y<63;y++){
		for(x=0;x<63;x++){
			i=(x+y*64)*4;
			if(data[i]!=0||data[i+1]!=0||data[i+2]!=0||data[i+3]!=255)return false;
		};
	};
	return true;
};
SpriteTools.prototype._IsFullTransparentTile=function(_img,_xs,_ys){
var data=_img.cnvCtx.getImageData(_xs,_ys,64,64).data,x,y,i;
	for(y=0;y<63;y++){
		for(x=0;x<63;x++){
			i=(x+y*64)*4;
			if(data[i+3]!=0)return false;
		};
	};
	return true;
};
SpriteTools.prototype._CompareBox=function(_cnvA,_cnvB,_xsA,_ysA,_xsB,_ysB,_w,_h,_dubRedSen){
var x,y,s,i;
var ctxA=_cnvA.getContext("2d"),dataA=ctxA.getImageData(_xsA,_ysA,_w,_h).data;
var ctxB=_cnvB.getContext("2d"),dataB=ctxB.getImageData(_xsB,_ysB,_w,_h).data;
	//return false;
	if(_dubRedSen>0){
		s=_dubRedSen;
		for(x=0;x<_w;x++){
			for(y=0;y<_h;y++){
				i=(x+y*_w)*4;
				if(Math.abs(dataA[i]-dataB[i])>s||Math.abs(dataA[i+1]-dataB[i+1])>s||Math.abs(dataA[i+2]-dataB[i+2])>s||Math.abs(dataA[i+3]-dataB[i+3])>s)return false;
			};
		};
	}else{
		//log(dataA,dataB);
		for(x=0;x<_w;x++){
			for(y=0;y<_h;y++){
				i=(x+y*_w)*4;
				if(dataA[i]!=dataB[i]||dataA[i+1]!=dataB[i+1]||dataA[i+2]!=dataB[i+2]||dataA[i+3]!=dataB[i+3])return false;
			};
		};	
	};
	return true;
};
SpriteTools.prototype._CenterPreSortColor=function(_cnv,_xs,_ys,_w,_h){
var ctx=_cnv.getContext("2d"),data=ctx.getImageData(_xs+(_w>>1),_ys+(_h>>1),1,1).data;
	return ((data[0]&0xf0)>>4)|((data[1]&0xf0)<<0)|((data[2]&0xf0)<<4)|((data[3]&0xf0)<<8);

};
SpriteTools.prototype._memImgSrc_MarkBox=function(_xs,_ys,_xe,_ye){
var x,y;
	if(_xs<0)_xs=0;
	if(_ys<0)_ys=0;
	if(_xs>this.memImgSrc.length-1)_xs=this.memImgSrc.length-1;
	if(_ys>this.memImgSrc[_xs].length-1)_ys=this.memImgSrc[_xs].length-1;
	for(x=_xs;x<=_xe;x++)for(y=_ys;y<=_ye;y++)this.memImgSrc[x][y]=1;
};

SpriteTools.prototype._GetShrinkBox=function(_cnv,_shkSen){
var xe=_cnv.width-1,ye=_cnv.height-1,ctx=_cnv.getContext("2d"),img=ctx.getImageData(0,0,_cnv.width,_cnv.height),p=img.data,w=_cnv.width,i;
var x,y,bc0=p[0],bc1=p[1],bc2=p[2],bc3=p[3];
var ret={xs:0,ys:0,xe:xe,ye:ye,w:xe-1,h:ye-1,xo:0,yo:0};

	if(_shkSen==0){
		// check top bound...
		looptop:
			for(y=0;y<=ye;y++){
				for(x=0;x<=xe;x++){
					i=(x+y*w)<<2;
					if(bc0!=p[i]||bc1!=p[i+1]||bc2!=p[i+2]||bc3!=p[i+3]){
						ret.ys=y;
						break looptop;
					};
				};
			};
		loopbot:
			for(y=ye;y>=0;y--){
				for(x=0;x<=xe;x++){
					i=(x+y*w)<<2;
					if(bc0!=p[i]||bc1!=p[i+1]||bc2!=p[i+2]||bc3!=p[i+3]){
						ret.ye=y;
						break loopbot;
					};
				};
			};
		loopleft:
			for(x=0;x<=xe;x++){
				for(y=0;y<=ye;y++){
					i=(x+y*w)<<2;
					if(bc0!=p[i]||bc1!=p[i+1]||bc2!=p[i+2]||bc3!=p[i+3]){
						ret.xs=x;
						break loopleft;
					};
				};
			};
		loopright:
			for(x=xe;x>=0;x--){
				for(y=0;y<=ye;y++){
					i=(x+y*w)<<2;
					if(bc0!=p[i]||bc1!=p[i+1]||bc2!=p[i+2]||bc3!=p[i+3]){
						ret.xe=x;
						break loopright;
					};
				};
			};
	}else{
		// check top bound...
		senlooptop:
			for(y=0;y<=ye;y++){
				for(x=0;x<=xe;x++){
					i=(x+y*w)<<2;
					if(Math.abs(bc0-p[i])>_shkSen||Math.abs(bc1-p[i+1])>_shkSen||Math.abs(bc2-p[i+2])>_shkSen||Math.abs(bc3-p[i+3])>_shkSen){
						ret.ys=y;
						break senlooptop;
					};
				};
			};
		senloopbot:
			for(y=ye;y>=0;y--){
				for(x=0;x<=xe;x++){
					i=(x+y*w)<<2;
					if(Math.abs(bc0-p[i])>_shkSen||Math.abs(bc1-p[i+1])>_shkSen||Math.abs(bc2-p[i+2])>_shkSen||Math.abs(bc3-p[i+3])>_shkSen){
						ret.ye=y;
						break senloopbot;
					};
				};
			};
		senloopleft:
			for(x=0;x<=xe;x++){
				for(y=0;y<=ye;y++){
					i=(x+y*w)<<2;
					if(Math.abs(bc0-p[i])>_shkSen||Math.abs(bc1-p[i+1])>_shkSen||Math.abs(bc2-p[i+2])>_shkSen||Math.abs(bc3-p[i+3])>_shkSen){
						ret.xs=x;
						break senloopleft;
					};
				};
			};
		senloopright:
			for(x=xe;x>=0;x--){
				for(y=0;y<=ye;y++){
					i=(x+y*w)<<2;
					if(Math.abs(bc0-p[i])>_shkSen||Math.abs(bc1-p[i+1])>_shkSen||Math.abs(bc2-p[i+2])>_shkSen||Math.abs(bc3-p[i+3])>_shkSen){
						ret.xe=x;
						break senloopright;
					};
				};
			};		
	};
	ret.xo=_cnv.width/2-ret.xs-1;
	ret.yo=_cnv.height/2-ret.ys-1;
	ret.w=ret.xe-ret.xs+1;
	ret.h=ret.ye-ret.ys+1;
	if(ret.w==192&&ret.h==192)ret={xs:95,ys:95,xe:95,ye:95,xo:0,yo:0,w:1,h:1};
	return ret;
};

SpriteTools.prototype._MaskingOrgImage=function(_cnvOrg,_cnvMsk,_isInvMsk,_box){
var xe=_cnvOrg.width-1,ye=_cnvOrg.height-1,ctxOrg=_cnvOrg.getContext("2d"),imgOrg=ctxOrg.getImageData(0,0,_cnvOrg.width,_cnvOrg.height),po=imgOrg.data,w=_cnvOrg.width,i;
var ctxMsk=_cnvMsk.getContext("2d"),imgMsk=ctxMsk.getImageData(0,0,_cnvMsk.width,_cnvMsk.height),pm=imgMsk.data,c;
var xs=0,ys=0,x,y,mskValue=_isInvMsk?255:0;
	if(_box!==undefined){
		xs=_box.xs;
		ys=_box.ys;
		xe=_box.xe;
		ye=_box.ye;
	};
	for(x=xs;x<=xe;x++){
		for(y=ys;y<=ye;y++){
			i=(x+y*w)<<2;
			c=((mskValue^(((pm[i+2]+pm[i+1]+pm[i])/3))&0xFF)<<24)|((po[i+3]<<24|po[i+2]|po[i+1]<<8|po[i]<<16)&0x00FFFFFF)
			po[i+3]=c>>24&0xFF;
			po[i+2]=c&0xFF;
			po[i+1]=c>>8&0xFF;
			po[i]=c>>16&0xFF;
		};
	};
	ctxOrg.putImageData(imgOrg,0,0);
};

SpriteTools.prototype._ShadowImageMasking=function(_cnvShd,_cnvMsk,_isInvMsk,_isInvShd,_shdTrig,_box){
var xe=_cnvShd.width-1,ye=_cnvShd.height-1,ctxShd=_cnvShd.getContext("2d"),imgShd=ctxShd.getImageData(0,0,_cnvShd.width,_cnvShd.height),ps=imgShd.data,w=_cnvShd.width,i;
var ctxMsk=_cnvMsk.getContext("2d"),imgMsk=ctxMsk.getImageData(0,0,_cnvMsk.width,_cnvMsk.height),pm=imgMsk.data,i;
var xs=0,ys=0,x,y,mskValue=_isInvMsk?0:255,shdValue=_isInvShd?0:255,c,d;
	_shdTrig=~_shdTrig;
	if(_box!==undefined){
		xs=_box.xs;
		ys=_box.ys;
		xe=_box.xe;
		ye=_box.ye;
	};
	for(x=xs;x<=xe;x++){
		for(y=ys;y<=ye;y++){
			i=(x+y*w)<<2;
			d=(shdValue^(((ps[i+2]+ps[i+1]+ps[i])/3))&0xFF);
			c=((mskValue^(((pm[i+2]+pm[i+1]+pm[i])/3))&0xFF)*d)>>8;
			ps[i+3]=d>_shdTrig?c:0
			ps[i+2]=0;
			ps[i+1]=0;
			ps[i]=0;
		};
	};
	ctxShd.putImageData(imgShd,0,0);
};


SpriteTools.prototype._ShadowImagePrepare=function(_cnvShd,_box){
var xe=_cnvShd.width-1,ye=_cnvShd.height-1,ctxShd=_cnvShd.getContext("2d"),imgShd=ctxShd.getImageData(0,0,_cnvShd.width,_cnvShd.height),ps=imgShd.data,w=_cnvShd.width,i;
var xs=0,ys=0,x,y,mskValue=255,c;
	if(_box!==undefined){
		xs=_box.xs;
		ys=_box.ys;
		xe=_box.xe;
		ye=_box.ye;
	};
	for(x=xs;x<=xe;x++){
		for(y=ys;y<=ye;y++){
			i=(x+y*w)<<2;
			c=((mskValue^(((ps[i+2]+ps[i+1]+ps[i])/3))&0xFF)<<24)|((ps[i+3]<<24|ps[i+2]|ps[i+1]<<8|ps[i]<<16)&0x00FFFFFF);
			ps[i+3]=c>>24&0xFF;
			ps[i+2]=c&0xFF;
			ps[i+1]=c>>8&0xFF;
			ps[i]=c>>16&0xFF;
		};
	};
	ctxShd.putImageData(imgShd,0,0);
};

SpriteTools.prototype._ShadowImageCut=function(_imgCnv,_cuts){
var cnv=_imgCnv.cnv;
if(cnv===undefined)cnv=_imgCnv;
if(cnv===undefined)return;
var ctx=cnv.getContext("2d");
var img=ctx.getImageData(0,0,cnv.width,cnv.height),ps=img.data;
	function _cut(_xs,_ys){
	var x,y,xe=_xs+64-1,ye=_ys+64-1;
		for(x=_xs;x<=xe;x++){
			for(y=_ys;y<=ye;y++){
				i=(x+y*192)<<2;
				ps[i+3]=255;
				ps[i+2]=255;
				ps[i+1]=255;
				ps[i]=255;
			};
		};
	};
	// 1 4
	// 2 3
	if(_cuts&1)_cut(128,64);
	if(_cuts&2)_cut(128,128);
	if(_cuts&4)_cut(64,128);
	if(_cuts&8)_cut(64,64);
	ctx.putImageData(img,0,0);
	_imgCnv.cnvCtx=cnv.getContext("2d");
};

SpriteTools.prototype._ShadowImageCopy=function(_imgCnv,_mode){
var cnv=_imgCnv.cnv;
if(cnv===undefined)cnv=_imgCnv;
if(cnv===undefined)return;
var ctx=cnv.getContext("2d");
var img=ctx.getImageData(0,0,cnv.width,cnv.height),ps=img.data;
var x,y,xe,ye,xs,ys,yc,xc,j;

	switch(_mode){
		case 1:
			// bottom shadow copy mid to left (clear shadow of left and left bottom stone)
			xc=64+32;
			xs=64;
			ys=128;
			xe=xs+31;
			ye=191;
			for(x=xs;x<=xe;x++){
				for(y=ys;y<=ye;y++){
					j=(xc+(x%4)+y*192)<<2;
					i=(x+y*192)<<2;
					ps[i+3]=ps[j+3];
					ps[i+2]=ps[j+2];
					ps[i+1]=ps[j+1];
					ps[i]=ps[j];
				};
			};
			break;
		case 2:
			// right shadow copy mid to top (clear shadow of top and top right stone)
			yc=64+32;
			xs=128;
			ys=64;
			xe=191;
			ye=ys+31;
			for(x=xs;x<=xe;x++){
				for(y=ys;y<=ye;y++){
					j=(x+(yc+y%4)*192)<<2;
					i=(x+y*192)<<2;
					ps[i+3]=ps[j+3];
					ps[i+2]=ps[j+2];
					ps[i+1]=ps[j+1];
					ps[i]=ps[j];
				};
			};
			break;
	};
	ctx.putImageData(img,0,0);
	_imgCnv.cnvCtx=cnv.getContext("2d");
};

SpriteTools.prototype._NormalizeShadow=function(_cnvShd,_shdTrig,_box){
var xe=_cnvShd.width-1,ye=_cnvShd.height-1,ctxShd=_cnvShd.getContext("2d"),imgShd=ctxShd.getImageData(0,0,_cnvShd.width,_cnvShd.height),ps=imgShd.data,w=_cnvShd.width,i;
var xs=0,ys=0,x,y,minValue=255,maxValue=0,delta;
	if(_box!==undefined){
		xs=_box.xs;
		ys=_box.ys;
		xe=_box.xe;
		ye=_box.ye;
	};
	for(x=xs;x<=xe;x++){
		for(y=ys;y<=ye;y++){
			i=(x+y*w)<<2;
			maxValue=Math.max(maxValue,ps[i+3]);
			if(ps[i+3]>_shdTrig)minValue=Math.min(minValue,ps[i+3]);
		};
	};
	//delta=255-((maxValue-minValue)>>1+minValue);
	log(minValue,maxValue,delta,((maxValue-minValue)+minValue));
	delta=255-maxValue;
	for(x=xs;x<=xe;x++){
		for(y=ys;y<=ye;y++){
			i=(x+y*w)<<2;
			if(ps[i+3]>_shdTrig)ps[i+3]=Math.min(255,ps[i+3]+delta);
		};
	};
	ctxShd.putImageData(imgShd,0,0);
};

SpriteTools.prototype._CreateTileLightingMask=function(_cnv){
var ctx=_cnv.getContext("2d");
var img=ctx.getImageData(64,64,64,64),p=img.data;
var x,y,i;
	for(x=0;x<64;x++){
		for(y=0;y<64;y++){
			i=(x+y*64)<<2;
			p[i+3]=p[i];
			p[i+2]=p[i+1]=p[i]=0;
		};
	};
	ctx.putImageData(img,64,64);
	//µWriteFile(".\\dev\\newmodels\\test\\test.png",_cnv.toDataURL("image/png").split(",")[1],true);
};
SpriteTools.prototype._CreateSpriteLightingMask=function(_cnv){
var ctx=_cnv.getContext("2d");
var img=ctx.getImageData(0,0,192,192),p=img.data;
var x,y,i;
	for(x=0;x<192;x++){
		for(y=0;y<192;y++){
			i=(x+y*192)<<2;
			p[i+3]=p[i];
			p[i+2]=p[i+1]=p[i]=0;
		};
	};
	ctx.putImageData(img,0,0);
};
SpriteTools.prototype._CreateTileShadowMask=function(_cnv){
var ctx=_cnv.getContext("2d");
var img=ctx.getImageData(64,64,64,64),p=img.data;
var x,y,i;
	for(x=0;x<64;x++){
		for(y=0;y<64;y++){
			i=(x+y*64)<<2;
			p[i+3]=p[i];
			p[i+2]=p[i+1]=p[i]=255;
		};
	};
	ctx.putImageData(img,64,64);
};
SpriteTools.prototype._CreateSpriteShadowMask=function(_cnv){
var ctx=_cnv.getContext("2d");
var img=ctx.getImageData(0,0,192,192),p=img.data;
var x,y,i;
	for(x=0;x<192;x++){
		for(y=0;y<192;y++){
			i=(x+y*192)<<2;
			p[i+3]=p[i];
			p[i+2]=p[i+1]=p[i]=255;
		};
	};
	ctx.putImageData(img,0,0);
};
SpriteTools.prototype._CombineLightingAndBlending=function(_cnvL,_cnvB,_box){
var xe=_cnvL.width-1,ye=_cnvL.height-1,ctxL=_cnvL.getContext("2d");
var imgL=ctxL.getImageData(0,0,_cnvL.width,_cnvL.height),pl=imgL.data;
var imgB=ctxL.getImageData(0,0,_cnvB.width,_cnvB.height),pb=imgB.data;
var xs=0,ys=0,x,y,i,w=_cnvL.width;
	if(_box!==undefined){
		xs=_box.xs;
		ys=_box.ys;
		xe=_box.xe;
		ye=_box.ye;
	};
	for(x=xs;x<=xe;x++){
		for(y=ys;y<=ye;y++){
			i=(x+y*w)<<2;
			if(pb[i+3]>pl[i+3])pl[i+3]=pb[i+3];
			if(pb[i+2]>pl[i+2])pl[i+2]=pb[i+2];
			if(pb[i+1]>pl[i+1])pl[i+1]=pb[i+1];
			if(pb[i]>pl[i])pl[i]=pb[i];
		};
	};
	ctxL.putImageData(imgL,0,0);
};
SpriteTools.prototype._SetBgrd=function(_imgCnv,_r,_g,_b,_box=null){
var cnv=_imgCnv.cnv;
if(cnv===undefined)cnv=_imgCnv;
if(cnv===undefined)return;
var xe=cnv.width-1,ye=cnv.height-1,ctx=cnv.getContext("2d");
var img=ctx.getImageData(0,0,cnv.width,cnv.height),p=img.data;
var xs=0,ys=0,x,y,i,w=cnv.width,b0,b1;
	if(_box!=null){
		xs=_box.xs;
		ys=_box.ys;
		xe=_box.xe;
		ye=_box.ye;
	};
	for(x=xs;x<=xe;x++){
		for(y=ys;y<=ye;y++){
			i=(x+y*w)<<2;
			if(p[i+3]!=255){
				b0=p[i+3];
				b1=255-b0;
				p[i+2]=Math.floor((b1*_b+b0*p[i+2])/255);
				p[i+1]=Math.floor((b1*_g+b0*p[i+1])/255);
				p[i+0]=Math.floor((b1*_r+b0*p[i+0])/255);
				p[i+3]=255;
			};
		};
	};
	ctx.putImageData(img,0,0);
	_imgCnv.cnvCtx=cnv.getContext("2d");
};
SpriteTools.prototype._SortImageListByImgName=function(_imgs,_opt){
// sorting original, mask and shadow images into an array based on naming of the images...
var ret=[],i,l=_imgs.length,suffix,purename,imgNo;
	for(i=0;i<l;i++){
		suffix=_imgs[i].name.suffix();
		purename=_imgs[i].name.withoutSuffix().cutLastAtCharOf("/");
		imgNo=parseInt(purename.right(4));
		//log(purename,purename.substr(0,_opt.mskPrefix.length)==_opt.mskPrefix);
		if(purename.substr(0,_opt.mskPrefix.length)==_opt.mskPrefix){
			if(ret[imgNo]===undefined)ret[imgNo]={org:null,msk:null,shd:null};
			ret[imgNo].msk=_imgs[i];
		}else if(purename.substr(0,_opt.shdPrefix.length)==_opt.shdPrefix){
			if(ret[imgNo]===undefined)ret[imgNo]={org:null,msk:null,shd:null};
			ret[imgNo].shd=_imgs[i];
		}else if(purename.substr(0,_opt.orgPrefix.length)==_opt.orgPrefix){
			if(ret[imgNo]===undefined)ret[imgNo]={org:null,msk:null,shd:null};
			ret[imgNo].org=_imgs[i];
		};
	};
	return ret;
};

SpriteTools.prototype._DoDSDFormatScan=function(_opt,_callBack){
const DSDF_SIGN_NONE=-1;
const DSDF_SIGN_FIRST=0;
const DSDF_SIGN_ZERO=0;
const DSDF_SIGN_ONE=1;
const DSDF_SIGN_TWO=2;
const DSDF_SIGN_THREE=3;
const DSDF_SIGN_FOUR=4;
const DSDF_SIGN_FIVE=5;
const DSDF_SIGN_SIX=6;
const DSDF_SIGN_SEVEN=7;
const DSDF_SIGN_EIGHT=8;
const DSDF_SIGN_NINE=9;
const DSDF_SIGN_ORIGINAL=10;
const DSDF_SIGN_MASK=11;
const DSDF_SIGN_SHADOW=12;
const DSDF_SIGN_LIGHT=13;
const DSDF_SIGN_ORIGINALANDMASK=14;
const DSDF_SIGN_LAST=14;

var self=this;
var DSDFSignPatterns=[];
	DSDFSignPatterns[DSDF_SIGN_ZERO]=[0b111101101101111,0b010101101101010,0b010101101101010];
	DSDFSignPatterns[DSDF_SIGN_ONE]=[0b010010010010010,0b001001001001001,0b100100100100100,0b110010010010111];
	DSDFSignPatterns[DSDF_SIGN_TWO]=[0b111001111100111,0b110001010100111];
	DSDFSignPatterns[DSDF_SIGN_THREE]=[0b111001111001111,0b110001110001110];
	DSDFSignPatterns[DSDF_SIGN_FOUR]=[0b101101111001001];
	DSDFSignPatterns[DSDF_SIGN_FIVE]=[0b111100111001111,0b111100110001110];
	DSDFSignPatterns[DSDF_SIGN_SIX]=[0b111100111101111,0b010100110101010];
	DSDFSignPatterns[DSDF_SIGN_SEVEN]=[0b111001001001001,0b111001001001001];
	DSDFSignPatterns[DSDF_SIGN_EIGHT]=[0b111101111101111,0b010101010101010];
	DSDFSignPatterns[DSDF_SIGN_NINE]=[0b111101111001111,0b010101011001010];
	DSDFSignPatterns[DSDF_SIGN_ORIGINAL]=[0b111101111000000,0b111100111100100];
	DSDFSignPatterns[DSDF_SIGN_MASK]=[0b111111111000000,0b000000111000000];
	DSDFSignPatterns[DSDF_SIGN_SHADOW]=[0b000000000000111,0b111111111000111];
	DSDFSignPatterns[DSDF_SIGN_LIGHT]=[0b101010101000111];
	DSDFSignPatterns[DSDF_SIGN_ORIGINALANDMASK]=[0b011100010001110,0b111101111000111];

	function _ReadDSDFSign(_x,_y,_signcolor){
	var	ret=DSDF_SIGN_NONE,d,x,y,xe,ye,i,c,j;
		d=0;
		ye=_y+4;
		xe=_x+2;
		for(y=_y;y<=ye;y++){
			for(x=_x;x<=xe;x++){
				if(self._cnvImgSrc_GetPixel(x,y)==_signcolor){
					d=d<<1|1;
				}else{
					d<<=1;
				};
			};
		};
		for(i=DSDF_SIGN_FIRST;i<=DSDF_SIGN_LAST;i++){
			c=DSDFSignPatterns[i].length;
			for(j=0;j<c;j++){
				if(DSDFSignPatterns[i][j]==d){
					ret=i;
					break;
				};
			};
		};
		return ret;
	};
	
	function _ReadDSDFValue(_noOfDSDFDigits,_x,_y,_signcolor){
	var ret=0,wvx,wvy,j,k;
		wvx=0;
		wvy=_y;
		for(j=0;j<_noOfDSDFDigits;j++){
			wvx=_x+4*j;
			k=_ReadDSDFSign(wvx,wvy,_signcolor);
			if(k>=DSDF_SIGN_ZERO&&k<=DSDF_SIGN_NINE){
				ret=ret*10+k;
			}else{
				return -1;
			};
		};
		return ret;
	};

	function _ReadSpriteInfo(_x,_y,_signcolor){
	var ret={firstsign:-1,valid:false,value:0};
		ret.firstsign=_ReadDSDFSign(_x,_y,_signcolor);
		ret.valid=false;
		switch(ret.firstsign){
			case DSDF_SIGN_MASK:
				ret.valid=true;
				break;
			case DSDF_SIGN_ORIGINAL:
				ret.valid=true;
				break;
			case DSDF_SIGN_SHADOW:
				if(_opt.doShd)ret.valid=true;
				break;
			case DSDF_SIGN_LIGHT:
				ret.valid=true;
				break;
			case DSDF_SIGN_ORIGINALANDMASK:
				ret.valid=true;
				break;
		};
		if(ret.valid){
			ret.value=_ReadDSDFValue(3,_x+4,_y,_signcolor);
			if(ret.value<0)ret.valid=false;
		};
		return ret;
	};

	function SortRect(_rect){
	var i;
		if(_rect.xs>_rect.xe){i=_rect.xs;_rect.xs=_rect.xe;_rect.xe=i;};
		if(_rect.ys>_rect.ye){i=_rect.ys;_rect.ys=_rect.ye;_rect.ye=i;};
	};

	function InitMem(){
	var x;
		self.memImgSrc=new Array(self.cnvImgSrc.width);
		for(x=0;x<self.cnvImgSrc.width;x++)self.memImgSrc[x]=new Array(self.cnvImgSrc.height);
	};
	
	function GetSpriteRects(){
	var xs,ys,basecolor,signcolor,x,y,sx,sy,sox,soy,s2x,s2y,valid,found,infos,h;
	var ret={};
		// are there a converted version available?
		// ...no converted version available, so convert dsd-formated sprites...
		self.eventType=SpriteTools.EVENT_SPRITESCANSTART;
		_callBack(self);
		xs=self.cnvImgSrc.width-1;
		ys=self.cnvImgSrc.height-1;
		basecolor=self._cnvImgSrc_GetPixel(0,0);
		for(y=0;y<ys;y++){
			for(x=0;x<xs;x++){
				signcolor=self._cnvImgSrc_GetPixel(x,y);
				valid=true;
				if(signcolor!=basecolor){
					if(!self.memImgSrc[x][y]){
						// is there already a sprite in this rectangle ?...
						completeSpriteRect={xs:x,ys:y,xe:x,ye:y};
						// minus one pixel of frame and one pixel of empty row...
						spriteRect={xs:x+2,ys:y+2,xe:x+2,ye:y+2};
						
						// whats the height of definition ?...
						sy=y;
						while(self._cnvImgSrc_GetPixel(x,sy)==signcolor)sy++;
						// whats the width of definition ?...
						sx=x;
						while(self._cnvImgSrc_GetPixel(sx,y)==signcolor)sx++;
						
						spriteRect.xe=sx-3
						spriteRect.ye=sy-3;
						SortRect(spriteRect);
						completeSpriteRect.xe=sx-1;
						completeSpriteRect.ye=sy+5;
						SortRect(completeSpriteRect);
						
						soy=y;
						h=completeSpriteRect.xe;
						while(self._cnvImgSrc_GetPixel(h,soy)==signcolor)soy++;
						sox=x;
						while(self._cnvImgSrc_GetPixel(sox,sy-1)==signcolor)sox++;
						
						s2x=sox;
						s2y=soy;
						sox=sox-spriteRect.xs;
						soy=soy-spriteRect.ys;
						sox=-sox;
						soy=-soy;
						
						infos=_ReadSpriteInfo(x,sy+1,signcolor);
						valid=infos.valid;
							
						if(valid){
							// mark rectangle area on marking picture...
							self._memImgSrc_MarkBox(completeSpriteRect.xs,completeSpriteRect.ys,completeSpriteRect.xe,completeSpriteRect.ye);
							found={};
							switch(infos.firstsign){
								case DSDF_SIGN_ORIGINAL:
									found.no=infos.value;
									found.dub=null;
									found.pakno=-1;
									found.ox=sox;
									found.oy=soy;
									found.xs=spriteRect.xs;
									found.ys=spriteRect.ys;
									found.xe=spriteRect.xe;
									found.ye=spriteRect.ye;
									found.w=found.xe-found.xs+1;
									found.h=found.ye-found.ys+1;
									SortRect(found);
									if(!ret.hasOwnProperty(infos.value))ret[infos.value]={hasLgt:false,hasShd:false,hasMsk:false,hasOrg:false,lgt:{},shd:{},msk:{},org:{}};
									ret[infos.value].org=found;
									ret[infos.value].hasOrg=true;
									break;
								case DSDF_SIGN_MASK:
									found.no=infos.value;
									found.dub=null;
									found.pakno=-1;
									found.ox=sox;
									found.oy=soy;
									found.xs=spriteRect.xs;
									found.ys=spriteRect.ys;
									found.xe=spriteRect.xe;
									found.ye=spriteRect.ye;
									found.w=found.xe-found.xs+1;
									found.h=found.ye-found.ys+1;
									SortRect(found);
									if(!ret.hasOwnProperty(infos.value))ret[infos.value]={hasLgt:false,hasShd:false,hasMsk:false,hasOrg:false,lgt:{},shd:{},msk:{},org:{}};
									ret[infos.value].msk=found;
									ret[infos.value].hasMsk=true;
									break;
								case DSDF_SIGN_SHADOW:
									found.no=infos.value;
									found.dub=null;
									found.pakno=-1;
									found.ox=sox;
									found.oy=soy;
									found.xs=spriteRect.xs;
									found.ys=spriteRect.ys;
									found.xe=spriteRect.xe;
									found.ye=spriteRect.ye;
									found.w=found.xe-found.xs+1;
									found.h=found.ye-found.ys+1;
									SortRect(found);
									if(!ret.hasOwnProperty(infos.value))ret[infos.value]={hasLgt:false,hasShd:false,hasMsk:false,hasOrg:false,lgt:{},shd:{},msk:{},org:{}};
									ret[infos.value].shd=found;
									ret[infos.value].hasShd=true;
									break;
								case DSDF_SIGN_LIGHT:
									found.no=infos.value;
									found.dub=null;
									found.pakno=-1;
									found.ox=sox;
									found.oy=soy;
									found.xs=spriteRect.xs;
									found.ys=spriteRect.ys;
									found.xe=spriteRect.xe;
									found.ye=spriteRect.ye;
									found.w=found.xe-found.xs+1;
									found.h=found.ye-found.ys+1;
									SortRect(found);
									if(!ret.hasOwnProperty(infos.value))ret[infos.value]={hasLgt:false,hasShd:false,hasMsk:false,hasOrg:false,lgt:{},shd:{},msk:{},org:{}};
									ret[infos.value].lgt=found;
									ret[infos.value].hasLgt=true;
									break;
								case DSDF_SIGN_ORIGINALANDMASK:
									found.no=infos.value;
									found.dub=null;
									found.pakno=-1;
									found.ox=sox;
									found.oy=soy;
									found.xs=spriteRect.xs;
									found.ys=spriteRect.ys;
									found.xe=spriteRect.xe;
									found.ye=spriteRect.ye;
									found.w=found.xe-found.xs+1;
									found.h=found.ye-found.ys+1;
									SortRect(found);
									if(!ret.hasOwnProperty(infos.value))ret[infos.value]={hasLgt:false,hasShd:false,hasMsk:false,hasOrg:false,lgt:{},shd:{},msk:{},org:{}};
									ret[infos.value].org=found;
									ret[infos.value].msk=found;
									ret[infos.value].hasOrg=true;
									break;		
							};
							if(sx==s2x&&sy==s2y){
								// marking a document frame ...
								spriteRect.xs-=2;
								spriteRect.ys-=2;
								spriteRect.xe+=2;
								spriteRect.ye+=2;
								SortRect(spriteRect);
								self._memImgSrc_MarkBox(spriteRect.xs,spriteRect.ys,spriteRect.xe,spriteRect.ye);
							}else{
								// marking impossible sprite parts of scanned rectangle...
								sx=x;
								sy=y;
								//MarkerLoopY:{
									while(self._cnvImgSrc_GetPixel(sx,sy)!=basecolor){
										//MarkerLoopX:{(self._cnvImgSrc
											while(self._cnvImgSrc_GetPixel(sx,sy)!=basecolor){
												//log(sx,sy,self.cnvImgSrc.width,self.cnvImgSrc.height,self.memImgSrc.length);
												self.memImgSrc[sx][sy]=true;
												sx++;
												//if(sx>=xs)break MarkerLoopX;
											};
										//};
										sx=x;
										sy++;
										//if(sy>=ys)break MarkerLoopY;
									};
								//};
							};
						};
					};
				};
			};
		};
		return ret;
	};
	
	InitMem();
	return GetSpriteRects();
};

SpriteTools.prototype._ReduceDuplicates=function(_sprites,_opt,_callBack){
var s,ss=[],i,j,l,x,y,si,sj;
	this.eventType=SpriteTools.EVENT_REDUCEDUPLICATES;
	_callBack(this);
	for(s in _sprites)ss.push(_sprites[s]);
	l=ss.length;
	for(i=0;i<l;i++){
		si=ss[i];
		if(si.hasOrg)if(si.org.dub==null){
			for(j=i+1;j<l;j++){
				sj=ss[j];
				if(sj.org.dub==null&&si.org.dub==null){
					if(sj.hasOrg&&si.hasOrg){
						if(sj.org.w==si.org.w&&sj.org.h==si.org.h){
							if(this._cnvImgSrc_CompareBox(sj.org,si.org,_opt.orgDubRedSen)){
								sj.org.dub=si.org;
								sj.org.xs=sj.org.dub.xs;
								sj.org.xe=sj.org.dub.xe;
								sj.org.ys=sj.org.dub.ys;
								sj.org.ye=sj.org.dub.ye;
							};
						};
					};
				};
			};
		};
		if(si.hasShd)if(si.shd.dub==null){
			for(j=i+1;j<l;j++){
				sj=ss[j];
				if(sj.hasShd&&si.hasShd){
					if(sj.shd.dub==null&&si.shd.dub==null){
						if(sj.shd.w==si.shd.w&&sj.shd.h==si.shd.h){
							if(this._cnvImgSrc_CompareBox(sj.shd,si.shd,_opt.sdhDubRedSen)){
								sj.shd.dub=si.shd;
								sj.shd.xs=sj.shd.dub.xs;
								sj.shd.xe=sj.shd.dub.xe;
								sj.shd.ys=sj.shd.dub.ys;
								sj.shd.ye=sj.shd.dub.ye;
							};
						};
					};
				};
			};
		};	
	};
};


SpriteTools.prototype._DoMaskPrepare=function(_sprites,_callBack,_opt){
var s,so,sm,x,y;
	this.eventType=SpriteTools.EVENT_MASKPREPARESTART;
	_callBack(this);
	if(_opt.hasOwnProperty("removeMaskBaseColor")){
		var basecolor=this._cnvImgSrc_GetPixel(0,0);
		for(s in _sprites){
			if(_sprites[s].hasMsk){
				sm=_sprites[s].msk;
				for(x=sm.xs;x<=sm.xe;x++){
					for(y=sm.ys;y<=sm.ye;y++){
						if(basecolor==this._cnvImgSrc_GetPixel(x,y))this._cnvImgSrc_PutPixel(x,y,0xFFFFFFFF);
					};
				};
			};
			if(_sprites[s].hasShd){
				sm=_sprites[s].shd;
				for(x=sm.xs;x<=sm.xe;x++){
					for(y=sm.ys;y<=sm.ye;y++){
						if(basecolor==this._cnvImgSrc_GetPixel(x,y))this._cnvImgSrc_PutPixel(x,y,0xFFFFFFFF);
					};
				};
			};
		};
	};
	
	for(s in _sprites){
		if(_sprites[s].hasMsk){
			if(_sprites[s].hasOrg){
				so=_sprites[s].org;
				sm=_sprites[s].msk;
				for(x=so.xs;x<=so.xe;x++){
					for(y=so.ys;y<=so.ye;y++){
						this._cnvImgSrc_PutPixel(x,y,this._cnvImgSrc_GetPixelMaskLight(x,y,x-so.xs+sm.xs,y-so.ys+sm.ys));
					};
				};
			};
		};
	};
	for(s in _sprites){
		if(_sprites[s].hasShd){
			sm=_sprites[s].shd;
			for(x=sm.xs;x<=sm.xe;x++){
				for(y=sm.ys;y<=sm.ye;y++){
					this._cnvImgSrc_ShadowPixel(x,y);
				};
			};
		};
	};
};

SpriteTools.prototype.NoPreWorkImgCheck=function(_img){
	return false;
};
SpriteTools.prototype._LoadImages=function(_urlsOrInputOrImages,_preWorkImgCheck,_preWorkImgCallBack,_callBack,_opt,_loadCallBack){
var self=this,img,i;
var readers=[],rd,noOfLoaded=0;
	self.eventType=SpriteTools.EVENT_READYNOIMAGESTOLOAD;
	if(_urlsOrInputOrImages.length==0){_callBack(self);return;}
	self.loadedImgs=[];
	if(typeof _urlsOrInputOrImages[0]=="string"){
		// loading images by array of url strings...
		for(i=0;i<_urlsOrInputOrImages.length;i++){
			img=new Image();
			img.name=_urlsOrInputOrImages[i];
			self.loadedImgs.push(img);
			img.onerror=function(_ev){
				log("load image error:",this);
				self.eventType=SpriteTools.EVENT_ERROR_IMAGELOAD;
				self.errorFileName=this.name;
				_callBack(self);
				_loadCallBack(self);
			};
			img.onload=function(_ev){
				if(!_preWorkImgCheck(this)||_preWorkImgCallBack==NOFUNCTION){
					noOfLoaded++;
				}else{
					_preWorkImgCallBack(self,this,function(_self){
						noOfLoaded++;
						if(noOfLoaded==_urlsOrInputOrImages.length){
							_self.eventType=SpriteTools.EVENT_IMAGESLOADED;
							_callBack(_self);
							_loadCallBack(_self);
						};
					});
				};
				//log("loaded:",noOfLoaded);
				if(noOfLoaded==_urlsOrInputOrImages.length){
					self.eventType=SpriteTools.EVENT_IMAGESLOADED;
					_callBack(self);
					_loadCallBack(self);
				};
			};
			img.src=_urlsOrInputOrImages[i];
		};		
	}else if(_urlsOrInputOrImages[0] instanceof File){
		// loading image by given multiple upload input element...
		for(i=0;i<_urlsOrInputOrImages.length;i++){
			rd=new FileReader();
			readers.push(rd);
			rd.imgName=_urlsOrInputOrImages[i].name;
			rd.onload=function(_ev){
				img=new Image();
				img.name=this.imgName;
				self.loadedImgs.push(img);
				img.onerror=function(_ev){
					self.eventType=SpriteTools.EVENT_ERROR_IMAGELOAD;
					_callBack(self);
					_loadCallBack(self);
				};
				img.onload=function(_ev){
					if(!_preWorkImgCheck(this)||_preWorkImgCallBack==NOFUNCTION){
						noOfLoaded++;
					}else{
						_preWorkImgCallBack(self,this,function(_self){
							noOfLoaded++;
							if(noOfLoaded==_urlsOrInputOrImages.length){
								_self.eventType=SpriteTools.EVENT_IMAGESLOADED;
								_callBack(_self);
								_loadCallBack(_self);
							};
						});
					};
					//log("loaded:",noOfLoaded);
					if(noOfLoaded==_urlsOrInputOrImages.length){
						self.eventType=SpriteTools.EVENT_IMAGESLOADED;
						_callBack(self);
						_loadCallBack(self);
					};
				};
				img.src=_ev.target.result;
				//OxydLog.Html(img.name+":<img src=\""+img.src+"\"><br/>");
			};
			rd.readAsDataURL(_urlsOrInputOrImages[i]);
		};
	}else if(_urlsOrInputOrImages[0] instanceof Image){
		//use given array of images, where the name attribut of the images have to set...
		self.loadedImgs=__urlsOrInputOrImages;
		self.eventType=SpriteTools.EVENT_IMAGESLOADED;
		_callBack(self);
		_loadCallBack(self);
	}else{
		self.eventType=SpriteTools.EVENT_ERROR_IMAGELOAD;
		_callBack(self);
		_loadCallBack(self);
	};
};

SpriteTools.prototype._finishSpriteDefinition=function(_sprites,_nameSuffix,_opts,_callBack){
var self=this,dataURL;
	if(_opts.reduceDub)self._ReduceDuplicates(_sprites,_opts,_callBack);
	self.resImg=new Image();
	self.resImg.onload=function(){
		var packers=[],s,i=0;
		for(s in _sprites){
			if(_sprites[s].hasOrg){
				if(_sprites[s].org.dub===null){
					_sprites[s].org.pakno=packers.length;
					packers.push({w:_sprites[s].org.w,h:_sprites[s].org.h});
				}else{
					_sprites[s].org.pakno=_sprites[s].org.dub.pakno;
				};
			};
			if(_sprites[s].hasShd){
				if(_sprites[s].shd.dub===null){
					_sprites[s].shd.pakno=packers.length;
					packers.push({w:_sprites[s].shd.w,h:_sprites[s].shd.h});
				}else{
					_sprites[s].shd.pakno=_sprites[s].shd.dub.pakno;
				};
			};
		};
		var packres=self._SpriteToolsBitPacker(packers),p,q;
		//log("packres",packres,packers.length);
		self.resImgSrc=document.createElement('canvas');
		self.resImgSrc.width=packres[0];
		self.resImgSrc.height=packres[1];
		self.resImgSrcCtx=self.resImgSrc.getContext("2d");
		self.resImgSrcCtx.imageSmoothingEnabled=false;
		var sprites={imageData:"",spriteData:[]};
		for(s in _sprites){
			var sprite={x:0,y:0,w:0,h:0,ox:0,oy:0,shd:false,sx:0,sy:0,sw:0,sh:0,sox:0,soy:0};
			p=packers[_sprites[s].org.pakno];
			if(_sprites[s].hasShd)q=packers[_sprites[s].shd.pakno];
			if(!_sprites[s].hasShd)q={x:0,y:0,w:0,h:0,ox:0,oy:0};
			if(_sprites[s].hasOrg){
				sprite.x=p.x;
				sprite.y=p.y;
				sprite.w=p.w;
				sprite.h=p.h;
				sprite.ox=_sprites[s].org.ox;
				sprite.oy=_sprites[s].org.oy;
				if(_sprites[s].org.dub==null)self.resImgSrcCtx.drawImage(this,_sprites[s].org.xs,_sprites[s].org.ys,p.w,p.h,p.x,p.y,p.w,p.h);
			};
			if(_sprites[s].hasShd){
				sprite.shd=true;
				sprite.sx=q.x;
				sprite.sy=q.y;
				sprite.sw=q.w;
				sprite.sh=q.h;
				sprite.sox=_sprites[s].org.ox;
				sprite.soy=_sprites[s].shd.oy;
				if(_sprites[s].shd.dub==null)self.resImgSrcCtx.drawImage(this,_sprites[s].shd.xs,_sprites[s].shd.ys,q.w,q.h,q.x,q.y,q.w,q.h);
			};
			if(_sprites[s].hasOrg||_sprites[s].hasShd)sprites.spriteData[parseInt(s,10)]=sprite;
		};
		if(_opts.hasOwnProperty("scaleWidth")){
			var ncnv=document.createElement('canvas');
			ncnv.width=self.resImgSrc.width*_opts.scaleWidth;
			ncnv.height=self.resImgSrc.height*_opts.scaleHeight;
			var nctx=ncnv.getContext("2d");
			nctx.imageSmoothingQuality="high";
			nctx.imageSmoothingEnabled=_opts.scaleWithQuality;
			nctx.drawImage(self.resImgSrc,0,0,self.resImgSrc.width,self.resImgSrc.height,0,0,ncnv.width,ncnv.height);
			dataURL=ncnv.toDataURL("image/png");
		}else{
			dataURL=self.resImgSrc.toDataURL("image/png");
		};
		
		// convert to new format...
		var nsprites={info:{scaleWithQuality:_opts.scaleWithQuality,imgData:dataURL},series:{},sprites:[]};
		nsprites.series[_nameSuffix]=0;
		var sn,so;
		for(x=0;x<sprites.spriteData.length;x++){
			sn=new Array(SPRITE_DATA_LENGTH).fill(0);
			if(sprites.spriteData[x]!==undefined){
				so=sprites.spriteData[x];
				sn[SPRITE_INFOBITS]=so.shd?SPRITE_INFOBITS_SHDW:0;
				sn[SPRITE_NORM_XS]=so.x*2;
				sn[SPRITE_NORM_YS]=so.y*2;
				sn[SPRITE_NORM_W]=so.w*2;
				sn[SPRITE_NORM_H]=so.h*2;
				sn[SPRITE_NORM_XO]=-so.ox*2;
				sn[SPRITE_NORM_YO]=-so.oy*2;
				sn[SPRITE_SHDW_XS]=so.sx*2;
				sn[SPRITE_SHDW_YS]=so.sy*2;
				sn[SPRITE_SHDW_W]=so.sw*2;
				sn[SPRITE_SHDW_H]=so.sh*2;
				sn[SPRITE_SHDW_XO]=so.sox*2;
				sn[SPRITE_SHDW_YO]=so.soy*2;
			};
			nsprites.sprites.push(sn);
		};
		
		nsprites.info.imgData=dataURL;
		self.eventType=SpriteTools.EVENT_READY;
		self.result={imgDataURLs:[dataURL],sprites:nsprites};
		_callBack(self);
	};
	self.resImg.src=self.cnvImgSrc.toDataURL("image/png");
};

// SpriteTools.ConvertClassicsDSDFormat2Sprites
SpriteTools.prototype.ConvertClassicsDSDFormat2Sprites=function(_url,_nameSuffix,_callBack,_opt){
var self=this,x;
var img=new Image(),resImg=new Image();
var optDef={hasMsk:true,doShd:true,invMsk:false,normShd:true,shdTrig:20,reduceDub:true,orgDubRedSen:0,sdhDubRedSen:0,orgShkSen:0,shsShkSen:0};
	if(_opt===undefined)_opt=optDef;
	if(ObjIsEmpty(_opt))_opt=optDef;
	_opt=Object.assign(optDef,_opt);
	self.eventType=SpriteTools.EVENT_NONE;
	img.onload=function(){
		self.eventType=SpriteTools.EVENT_IMAGELOADED;
		_callBack(self);
		self.cnvImgSrc=document.createElement('canvas');
		self.cnvImgSrc.width=this.width;
		self.cnvImgSrc.height=this.height;
		self.cnvImgSrcCtx=self.cnvImgSrc.getContext("2d");
		self.cnvImgSrcCtx.imageSmoothingEnabled=false;
		self.cnvImgSrcCtx.drawImage(this,0,0);
		self.cnvImgSrcCtxImage=self.cnvImgSrcCtx.getImageData(0,0,this.width,this.height);
		self.cnvImgSrcCtxImageData=self.cnvImgSrcCtxImage.data;
		self.memImgSrc=null;
		var sprites=self._DoDSDFormatScan(_opt,_callBack);
		if(_opt.hasMsk)self._DoMaskPrepare(sprites,_callBack,_opt);
		self.cnvImgSrcCtx.putImageData(self.cnvImgSrcCtxImage,0,0);
		
		self._finishSpriteDefinition(sprites,_nameSuffix,_opt,_callBack);
	};
	img.onerror=function(){
		self.eventType=SpriteTools.EVENT_ERROR_IMAGELOAD;
		_callBack(self);
	};
	img.src=_url;
};

SpriteTools.prototype.ConvertDSDFormat2SpriteImage=function(_url,_callBack,_opt){
var self=this,x,imgDataURLs=[];
var img=new Image(),resImg=new Image();
var optDef={hasMsk:true,doShd:true,invMsk:false,normShd:true,shdTrig:20,reduceDub:true,orgDubRedSen:0,sdhDubRedSen:0,orgShkSen:0,shsShkSen:0};
	if(_opt===undefined)_opt=optDef;
	if(ObjIsEmpty(_opt))_opt=optDef;
	_opt=Object.assign(optDef,_opt);
	self.eventType=SpriteTools.EVENT_NONE;
	img.onload=function(){
		self.eventType=SpriteTools.EVENT_IMAGELOADED;
		_callBack(self);
		self.cnvImgSrc=document.createElement('canvas');
		self.cnvImgSrc.width=this.width;
		self.cnvImgSrc.height=this.height;
		self.cnvImgSrcCtx=self.cnvImgSrc.getContext("2d");
		self.cnvImgSrcCtx.imageSmoothingEnabled=false;
		self.cnvImgSrcCtx.drawImage(this,0,0);
		self.cnvImgSrcCtxImage=self.cnvImgSrcCtx.getImageData(0,0,this.width,this.height);
		self.cnvImgSrcCtxImageData=self.cnvImgSrcCtxImage.data;
		self.memImgSrc=null;
		var rawSprites=self._DoDSDFormatScan(_opt,_callBack);
		if(_opt.hasMsk)self._DoMaskPrepare(rawSprites,_callBack,_opt);
		self.cnvImgSrcCtx.putImageData(self.cnvImgSrcCtxImage,0,0);

		if(true){
			// is not retina, create retina version...
			self.cnvImgSrc2x=document.createElement('canvas');
			self.cnvImgSrc2x.width=this.width*2;
			self.cnvImgSrc2x.height=this.height*2;
			self.cnvImgSrcCtx2x=self.cnvImgSrc2x.getContext("2d");
			self.cnvImgSrcCtx2x.imageSmoothingEnabled=false;
			self.cnvImgSrcCtx2x.drawImage(this,0,0,this.width,this.height,0,0,this.width*2,this.height*2);
			self.cnvImgSrcCtx2xImage=self.cnvImgSrcCtx2x.getImageData(0,0,this.width*2,this.height*2);
			self.cnvImgSrcCtx2xImageData=self.cnvImgSrcCtx2xImage.data;
			for(s in rawSprites){
				if(rawSprites[s].hasOrg){
					u=rawSprites[s].org;
					if(maxNo<u.no)maxNo=u.no;
					u.w*=2;
					u.h*=2;
					u.xs*=2;
					u.xe*=2;
					u.ys*=2;
					u.ye*=2;
					u.ox*=2;
					u.oy*=2;
				};
			};
		}else{
			// is retina, create normal version...
			
		};

		if(_opt.hasOwnProperty("createSpritesStrip")&&_opt.createSpritesStrip){
			var imgDataURLs=[],siCnv,siCtx,siCnv2x,siCtx2x;
			var maxH=0,maxW=0,minX=99999,minY=99999,maxX=0,maxY=0;
			var cx,cy,s,u,maxNo=0,so,sn;
			
			for(s in rawSprites){
				if(rawSprites[s].hasOrg){
					u=rawSprites[s].org;
					if(maxNo<u.no)maxNo=u.no;
					if(minX>u.ox)minX=u.ox;
					if(minY>u.oy)minY=u.oy;
					if(maxX<(u.w+u.ox))maxX=(u.w+u.ox);
					if(maxY<(u.h+u.oy))maxY=(u.h+u.oy);
				};
			};
			if(true){
				maxH=maxY-minY+2;
				maxW=maxX-minX+2;
			}else{
				maxH=maxY-minY+1;
				maxW=maxX-minX+1;
			};
			//if(maxH%2==1)maxH++;
			//if(maxW%2==1)maxW++;
			siCnv=document.createElement('canvas');
			siCnv.width=(maxW*(maxNo+1))/2;
			siCnv.height=maxH/2;
			siCtx=siCnv.getContext("2d");
			siCtx.imageSmoothingEnabled=true;
			siCtx.imageSmoothingEnabled=false;
			siCnv2x=document.createElement('canvas');
			siCnv2x.width=(maxW*(maxNo+1));
			siCnv2x.height=maxH;
			siCtx2x=siCnv2x.getContext("2d");
			siCtx2x.imageSmoothingEnabled=false;
			for(s in rawSprites){
				if(rawSprites[s].hasOrg){
					u=rawSprites[s].org;
					cx=u.xs+u.ox;
					cy=u.ys+u.oy;
					siCtx.drawImage(self.cnvImgSrc,u.xs/2,u.ys/2,u.w/2,u.h/2,((u.no*maxW)+u.ox-minX)/2,(u.oy-minY)/2,u.w/2,u.h/2);
					siCtx2x.drawImage(self.cnvImgSrc2x,u.xs,u.ys,u.w,u.h,(u.no*maxW)+u.ox-minX,u.oy-minY,u.w,u.h);
				};
			};
			imgDataURLs.push(siCnv.toDataURL("image/png"));
			imgDataURLs.push(siCnv2x.toDataURL("image/png"));
			
			sprites={info:{maxWidth:maxW,maxHeight:maxH,offX:0-minX,offY:0-minY},series:{standard:0},sprites:[]};
			for(s in rawSprites){
				sn=new Array(SPRITE_DATA_LENGTH).fill(0);
				if(rawSprites[s]!==undefined){
					so=rawSprites[s].org;
					sn[SPRITE_INFOBITS]=0;
					sn[SPRITE_NORM_XS]=so.no*maxW;
					sn[SPRITE_NORM_YS]=0;
					sn[SPRITE_NORM_W]=maxW;
					sn[SPRITE_NORM_H]=maxH;
					sn[SPRITE_NORM_XO]=minX;
					sn[SPRITE_NORM_YO]=minY;
				};
				sprites.sprites.push(sn);
			};
			
			self.eventType=SpriteTools.EVENT_READY;
			self.result={imgDataURLs:imgDataURLs,sprites:sprites};
			_callBack(self);
		}else{
			self._finishSpriteDefinition(rawSprites,'',_opt,_callBack);
		};
	};
	img.onerror=function(){
		self.eventType=SpriteTools.EVENT_ERROR_IMAGELOAD;
		_callBack(self);
	};
	img.src=_url;
};
// SpriteTools.ConvertImageSequence2SpriteList
// OBSOLETE:!!!!!
SpriteTools.prototype.ConvertImageSequence2SpriteList=function(_urlsOrInputOrImages,_callBack,_opt){
var self=this;
var optDef={orgPrefix:"",mskPrefix:"A_",shdPrefix:"S_",doShd:true,hasMsk:true,invMsk:false,normShd:true,shdTrig:20,digitCount:4,ox:48,oy:48,reduceDub:true,orgDubRedSen:0,sdhDubRedSen:0,orgShkSen:0,shsShkSen:0};
	if(_opt===undefined)_opt=optDef;
	if(ObjIsEmpty(_opt))_opt=optDef;
	_opt=Object.assign(optDef,_opt);
	self._LoadImages(_urlsOrInputOrImages,self.NoPreWorkImgCheck,NOFUNCTION,_callBack,_opt,function(_ev){
		var imgs,i,l,packers,l,maxOrgWidth,maxOrgHeight,maxShdWidth,maxShdHeight,sprites={},p,q,xOrg,xShd;
		if(_ev.eventType==SpriteTools.EVENT_IMAGESLOADED){
			imgs=self._SortImageListByImgName(self.loadedImgs,_opt);
			// create canvas for images...
			l=imgs.length;
			for(i=0;i<l;i++){
				if(imgs[i].org!=null){
					imgs[i].org.cnv=document.createElement('canvas');
					imgs[i].org.cnv.width=imgs[i].org.width;
					imgs[i].org.cnv.height=imgs[i].org.height;
					imgs[i].org.cnvCtx=imgs[i].org.cnv.getContext("2d");
					imgs[i].org.cnvCtx.imageSmoothingEnabled=false;
					imgs[i].org.cnvCtx.drawImage(imgs[i].org,0,0);
				};
				if(imgs[i].msk!=null){
					imgs[i].msk.cnv=document.createElement('canvas');
					imgs[i].msk.cnv.width=imgs[i].msk.width;
					imgs[i].msk.cnv.height=imgs[i].msk.height;
					imgs[i].msk.cnvCtx=imgs[i].msk.cnv.getContext("2d");
					imgs[i].msk.cnvCtx.imageSmoothingEnabled=false;
					imgs[i].msk.cnvCtx.drawImage(imgs[i].msk,0,0);
				};
				if(imgs[i].shd!=null&&_opt.doShd){
					imgs[i].shd.cnv=document.createElement('canvas');
					imgs[i].shd.cnv.width=imgs[i].shd.width;
					imgs[i].shd.cnv.height=imgs[i].shd.height;
					imgs[i].shd.cnvCtx=imgs[i].shd.cnv.getContext("2d");
					imgs[i].shd.cnvCtx.imageSmoothingEnabled=false;
					imgs[i].shd.cnvCtx.drawImage(imgs[i].shd,0,0);
				};
			};
			
			// get bounding boxes of images...
			self.eventType=SpriteTools.EVENT_SPRITESCANSTART;
			_callBack(self);
			for(i=0;i<l;i++){
				if(_opt.hasMsk){
					if(imgs[i].msk!=null){
						imgs[i].msk.box=self._GetShrinkBox(imgs[i].msk.cnv,_opt.orgShkSen);
						if(imgs[i].org!=null)imgs[i].org.box=imgs[i].msk.box;
					};
					if(_opt.doShd)if(imgs[i].shd!=null){
						imgs[i].shd.box=self._GetShrinkBox(imgs[i].shd.cnv,_opt.shsShkSen);
					};
				}else{
					//!!!MA missing: transparent images without mask image...
				};
			};

			// masking original images...
			self.eventType=SpriteTools.EVENT_BITPACKSTART;
			_callBack(self);
			if(_opt.hasMsk){
				for(i=0;i<l;i++){
					if(imgs[i].msk!=null&&imgs[i].org!=null)self._MaskingOrgImage(imgs[i].org.cnv,imgs[i].msk.cnv,_opt.invMsk,imgs[i].org.box);
					//if(imgs[i].shd!=null)self._ShadowImagePrepare(imgs[i].shd.cnv,imgs[i].shd.box);
					if(_opt.doShd)if(imgs[i].shd!=null)self._ShadowImageMasking(imgs[i].shd.cnv,imgs[i].msk.cnv,_opt.invMsk,_opt.shdTrig,false,imgs[i].shd.box);
					if(_opt.doShd&&_opt.normShd)if(imgs[i].shd!=null)self._NormalizeShadow(imgs[i].shd.cnv,_opt.shdTrig,imgs[i].shd.box);
				};
			};
			
			// copy sprites into one extra width canvas...
			maxOrgWidth=0;
			maxOrgHeight=0;
			maxShdWidth=0;
			maxShdHeight=0;
			for(i=0;i<l;i++){
				if(imgs[i].org!=null){
					if(imgs[i].org.box.h>maxOrgHeight)maxOrgHeight=imgs[i].org.box.h;
					maxOrgWidth+=imgs[i].org.box.w;
				};
				if(_opt.doShd)if(imgs[i].shd!=null){
					if(imgs[i].shd.box.h>maxShdHeight)maxShdHeight=imgs[i].shd.box.h;
					maxShdWidth+=imgs[i].shd.box.w;
				};
			};
			if(maxShdWidth<32768&&maxOrgWidth<32768){
				self.cnvImgSrc=document.createElement('canvas');
				self.cnvImgSrc.width=Math.max(maxOrgWidth,maxShdWidth);
				self.cnvImgSrc.height=maxOrgHeight+maxShdHeight;
				self.cnvImgSrcCtx=self.cnvImgSrc.getContext("2d");
				self.cnvImgSrcCtx.imageSmoothingEnabled=false;
				xOrg=0;
				xShd=0;
				var sprites={};
				for(i=0;i<l;i++){
					if(imgs[i].org!=null){
						self.cnvImgSrcCtx.drawImage(imgs[i].org.cnv,imgs[i].org.box.xs,imgs[i].org.box.ys,imgs[i].org.box.w,imgs[i].org.box.h,xOrg,0,imgs[i].org.box.w,imgs[i].org.box.h);
						sprites[i]={};
						sprites[i].hasOrg=true;
						sprites[i].hasShd=false;
						sprites[i].org={no:i,dub:null,pakno:-1,ox:imgs[i].org.box.xs-_opt.ox,oy:imgs[i].org.box.ys-_opt.oy,xs:xOrg,ys:0,xe:xOrg+imgs[i].org.box.w-1,ye:imgs[i].org.box.h-1,w:imgs[i].org.box.w,h:imgs[i].org.box.h};
						xOrg+=imgs[i].org.box.w;
					};
					if(_opt.doShd)if(imgs[i].shd!=null){
						self.cnvImgSrcCtx.drawImage(imgs[i].shd.cnv,imgs[i].shd.box.xs,imgs[i].shd.box.ys,imgs[i].shd.box.w,imgs[i].shd.box.h,xShd,maxOrgHeight,imgs[i].shd.box.w,imgs[i].shd.box.h);
						if(sprites[i]!==undefined){
							sprites[i].hasShd=true;
							sprites[i].shd={no:i,dub:null,pakno:-1,ox:imgs[i].shd.box.xs-_opt.ox,oy:imgs[i].shd.box.ys-_opt.oy,xs:xShd,ys:maxOrgHeight,xe:xShd+imgs[i].shd.box.w-1,ye:maxOrgHeight+imgs[i].shd.box.h-1,w:imgs[i].shd.box.w,h:imgs[i].shd.box.h};
							xShd+=imgs[i].shd.box.w;
						};
					};
				};
				log(self.cnvImgSrc.width,self.cnvImgSrc.height);
				self.cnvImgSrcCtxImage=self.cnvImgSrcCtx.getImageData(0,0,self.cnvImgSrc.width,self.cnvImgSrc.height);
				self.cnvImgSrcCtxImageData=self.cnvImgSrcCtxImage.data;
				
				self._finishSpriteDefinition(sprites,'standard',_opt,_callBack);
			}else{
				self.eventType=SpriteTools.EVENT_ERROR_RESULTIMAGETOBIG;
				_callBack(self);
			};
		};
	});
};

// SpriteTools.ConvertDSDFormat2TileSpriteImage
// creates tile sprite image from DSD-formatted image...
SpriteTools.prototype.ConvertDSDFormat2TileImage=function(_url,_callBack,_opt){
var self=this,x,maxno=0;
var img=new Image(),resImg=new Image();
var optDef={padding:false,doShd:false,hasMsk:true,invMsk:false,normShd:true,shdTrig:20,reduceDub:false,orgDubRedSen:0,sdhDubRedSen:0,orgShkSen:0,shsShkSen:0};
	if(_opt===undefined)_opt=optDef;
	if(ObjIsEmpty(_opt))_opt=optDef;
	_opt=Object.assign(optDef,_opt);
	img.onload=function(){
		self.eventType=SpriteTools.EVENT_IMAGELOADED;
		_callBack(self);
		self.cnvImgSrc=document.createElement('canvas');
		self.cnvImgSrc.width=this.width;
		self.cnvImgSrc.height=this.height;
		self.cnvImgSrcCtx=self.cnvImgSrc.getContext("2d");
		self.cnvImgSrcCtx.imageSmoothingEnabled=false;
		self.cnvImgSrcCtx.drawImage(this,0,0);
		self.cnvImgSrcCtxImage=self.cnvImgSrcCtx.getImageData(0,0,this.width,this.height);
		self.cnvImgSrcCtxImageData=self.cnvImgSrcCtxImage.data;
		self.memImgSrc=null;
		var sprites=self._DoDSDFormatScan(_opt,_callBack);
		self._DoMaskPrepare(sprites,_callBack,_opt);
		self.cnvImgSrcCtx.putImageData(self.cnvImgSrcCtxImage,0,0);
		self.resImg=new Image();
		self.resImg.onload=function(){
			self.resImgSrc=document.createElement('canvas');
			log(sprites);
			for(s in sprites)if(sprites[s].org.no>maxno)maxno=sprites[s].org.no;
			self.resImgSrc.width=(maxno+1)*32;
			if(_opt.doShd){
				self.resImgSrc.height=32*5;
			}else{
				self.resImgSrc.height=32;
			};
			self.resImgSrcCtx=self.resImgSrc.getContext("2d");
			self.resImgSrcCtx.imageSmoothingEnabled=false;
			for(s in sprites){
				p=sprites[s].org;
				q=sprites[s].shd;
				//if(_opt.doShd)if(!sprites[s].hasShd)q={x:0,y:0,w:0,h:0,ox:0,oy:0};
				//res.sprites.push({no:sprites[s].no,name:"",ox:sprites[s].ox,oy:sprites[s].oy,x:p.x,y:p.y,w:p.w,h:p.h,sx:q.x,sy:q.y,sw:q.w,sox.q.ox,soy:q.oy});
				if(sprites[s].hasOrg){
					self.resImgSrcCtx.drawImage(this,p.xs,p.ys,p.w,p.h,p.no*32,0,p.w,p.h);
				};
				if(_opt.doShd){
					if(sprites[s].hasShd){
						//if(sprites[s].shd.dub==null)self.resImgSrcCtx.drawImage(this,sprites[s].shd.xs,sprites[s].shd.ys,q.w,q.h,q.x,q.y,q.w,q.h);
					};
				};
			};
			self.eventType=SpriteTools.EVENT_READY;
			self.result={};
			self.result.imgDataURL=self.resImgSrc.toDataURL("image/png");
			self.result.sprites=sprites;
			//log(res);
			_callBack(self);
		};
		self.resImg.src=self.cnvImgSrc.toDataURL("image/png");
	};
	img.onerror=function(){
		self.eventType=SpriteTools.EVENT_ERROR_IMAGELOAD;
		_callBack(self);
	};
	img.src=_url;

};

// creates sprites from a list of image urls...
SpriteTools.prototype.ConvertGUIImages2Sprites=function(_urlsOrInputOrImages,_callBack,_opt){
var self=this;
var optDef={orgCompare:0,shdCompare:0};
	if(_opt===undefined)_opt=optDef;
	if(ObjIsEmpty(_opt))_opt=optDef;
	_opt=Object.assign(optDef,_opt);
	self._LoadImages(_urlsOrInputOrImages,self.NoPreWorkImgCheck,NOFUNCTION,_callBack,_opt,function(_ev){
		var img,j,k,i,l,packers,maxOrgWidth,maxOrgHeight,maxShdWidth,maxShdHeight,sprites,p,q,xOrg,xShd;
		var imgsByName,imgsBySeries,name,imgCnv,nImgCnv,seriesName;
		var nameComps,ser,seq,x,y,w,h,spritePatterns,u,v,packers=[],box;
		
		if(_ev.eventType==SpriteTools.EVENT_IMAGESLOADED){
			l=self.loadedImgs.length;
			imgsBySeries={};
			imgsByName={};
			for(i=0;i<l;i++){
				name=self.loadedImgs[i].name.basename();
				nameComps=name.split("@");
				if(nameComps.length>1){
					seriesName=nameComps[0];
					params=nameComps[1].split(".");
				}else{
					seriesName=name.withoutSuffix();
					params=[];
				};
				
				imgCnv={};
				imgCnv.img=self.loadedImgs[i];
				imgCnv.cnv=document.createElement('canvas');
				imgCnv.cnv.width=self.loadedImgs[i].width;
				imgCnv.cnv.height=self.loadedImgs[i].height;
				imgCnv.cnvCtx=imgCnv.cnv.getContext("2d");
				imgCnv.cnvCtx.imageSmoothingEnabled=false;
				imgCnv.cnvCtx.drawImage(self.loadedImgs[i],0,0);
				imgCnv.name=name;
				imgCnv.seriesName=seriesName;
				imgCnv.layer="GUI";
				imgCnv.seriesNo=0;
				imgCnv.sequenceNo=0;
				imgsByName[name]=imgCnv;
				if(!imgsBySeries.hasOwnProperty(seriesName))imgsBySeries[seriesName]=[];
				
				if(params.length>0){
					switch(params[0]){
						case"S":
							// sprites by splicing borders...
							w=imgCnv.cnv.width;
							h=imgCnv.cnv.height;
							k=Math.floor(imgCnv.cnv.width/w);
							
							// left top
							nImgCnv=Object.assign({},imgCnv);
							nImgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
							nImgCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LAYER_GUI;
							nImgCnv.sequenceNo=0;
							nImgCnv.org={};
							nImgCnv.org.xs=0;
							nImgCnv.org.ys=0;
							nImgCnv.org.xo=0;
							nImgCnv.org.yo=0;
							nImgCnv.org.w=parseInt(params[1]);
							nImgCnv.org.h=parseInt(params[2]);
							imgsBySeries[seriesName].push(nImgCnv);
							
							// left mid
							nImgCnv=Object.assign({},imgCnv);
							nImgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
							nImgCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LAYER_GUI;
							nImgCnv.sequenceNo=1;
							nImgCnv.org={};
							nImgCnv.org.xs=parseInt(params[1]);
							nImgCnv.org.ys=0;
							nImgCnv.org.xo=0;
							nImgCnv.org.yo=0;
							nImgCnv.org.w=w-(parseInt(params[1])+parseInt(params[3]));
							nImgCnv.org.h=parseInt(params[2]);
							imgsBySeries[seriesName].push(nImgCnv);

							// left right
							nImgCnv=Object.assign({},imgCnv);
							nImgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
							nImgCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LAYER_GUI;
							nImgCnv.sequenceNo=2;
							nImgCnv.org={};
							nImgCnv.org.xs=w-parseInt(params[3]);
							nImgCnv.org.ys=0;
							nImgCnv.org.xo=0;
							nImgCnv.org.yo=0;
							nImgCnv.org.w=parseInt(params[1]);
							nImgCnv.org.h=parseInt(params[2]);
							imgsBySeries[seriesName].push(nImgCnv);
							
							
							// left mid
							nImgCnv=Object.assign({},imgCnv);
							nImgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
							nImgCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LAYER_GUI;
							nImgCnv.sequenceNo=3;
							nImgCnv.org={};
							nImgCnv.org.xs=0;
							nImgCnv.org.ys=parseInt(params[2]);
							nImgCnv.org.xo=0;
							nImgCnv.org.yo=0;
							nImgCnv.org.w=parseInt(params[1]);
							nImgCnv.org.h=h-(parseInt(params[1])+parseInt(params[3]));
							imgsBySeries[seriesName].push(nImgCnv);
							
							// mid mid
							nImgCnv=Object.assign({},imgCnv);
							nImgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
							nImgCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LAYER_GUI;
							nImgCnv.sequenceNo=4;
							nImgCnv.org={};
							nImgCnv.org.xs=parseInt(params[1]);
							nImgCnv.org.ys=parseInt(params[2]);
							nImgCnv.org.xo=0;
							nImgCnv.org.yo=0;
							nImgCnv.org.w=w-(parseInt(params[1])+parseInt(params[3]));
							nImgCnv.org.h=h-(parseInt(params[2])+parseInt(params[4]));
							imgsBySeries[seriesName].push(nImgCnv);

							// right mid 
							nImgCnv=Object.assign({},imgCnv);
							nImgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
							nImgCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LAYER_GUI;
							nImgCnv.sequenceNo=5;
							nImgCnv.org={};
							nImgCnv.org.xs=w-parseInt(params[3]);
							nImgCnv.org.ys=parseInt(params[2]);
							nImgCnv.org.xo=0;
							nImgCnv.org.yo=0;
							nImgCnv.org.w=parseInt(params[1]);
							nImgCnv.org.h=h-(parseInt(params[2])+parseInt(params[4]));
							imgsBySeries[seriesName].push(nImgCnv);
							
							// left bottom
							nImgCnv=Object.assign({},imgCnv);
							nImgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
							nImgCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LAYER_GUI;
							nImgCnv.sequenceNo=6;
							nImgCnv.org={};
							nImgCnv.org.xs=0;
							nImgCnv.org.ys=h-parseInt(params[4]);
							nImgCnv.org.xo=0;
							nImgCnv.org.yo=0;
							nImgCnv.org.w=parseInt(params[1]);
							nImgCnv.org.h=parseInt(params[4]);
							imgsBySeries[seriesName].push(nImgCnv);
							
							// mid bottom
							nImgCnv=Object.assign({},imgCnv);
							nImgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
							nImgCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LAYER_GUI;
							nImgCnv.sequenceNo=7;
							nImgCnv.org={};
							nImgCnv.org.xs=parseInt(params[1]);
							nImgCnv.org.ys=h-parseInt(params[4]);
							nImgCnv.org.xo=0;
							nImgCnv.org.yo=0;
							nImgCnv.org.w=w-(parseInt(params[1])+parseInt(params[3]));
							nImgCnv.org.h=parseInt(params[4]);
							imgsBySeries[seriesName].push(nImgCnv);

							// right bottom
							nImgCnv=Object.assign({},imgCnv);
							nImgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
							nImgCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LAYER_GUI;
							nImgCnv.sequenceNo=8;
							nImgCnv.org={};
							nImgCnv.org.xs=w-parseInt(params[3]);
							nImgCnv.org.ys=h-parseInt(params[4]);
							nImgCnv.org.xo=0;
							nImgCnv.org.yo=0;
							nImgCnv.org.w=parseInt(params[1]);
							nImgCnv.org.h=parseInt(params[4]);
							imgsBySeries[seriesName].push(nImgCnv);
							break;
						case"X":
							// sprites by a single row...
							w=parseInt(params[1]);
							h=imgCnv.cnv.height;
							k=Math.floor(imgCnv.cnv.width/w);
							for(j=0;j<k;j++){
								nImgCnv=Object.assign({},imgCnv);
								nImgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
								nImgCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LAYER_GUI;
								nImgCnv.sequenceNo=i;
								nImgCnv.org={};
								nImgCnv.org.xs=j*w;
								nImgCnv.org.ys=0;
								nImgCnv.org.xo=0;
								nImgCnv.org.yo=0;
								nImgCnv.org.w=w;
								nImgCnv.org.h=h;
								imgsBySeries[seriesName][j]=nImgCnv;
							};
							break;
						case'D':
							// sprites by dsdf defintion...
							self.cnvImgSrc=imgCnv.cnv;
							self.cnvImgSrcCtxImageData=imgCnv.cnvCtx.getImageData(0,0,imgCnv.cnv.width,imgCnv.cnv.height).data;
							var dsprites=self._DoDSDFormatScan({doShd:true,orgDubRedSen:true},NOFUNCTION);
							i=0;
							for(j in dsprites){
								if(dsprites[j].hasOrg){
									nImgCnv=Object.assign({},imgCnv);
									nImgCnv.sequenceNo=i;
									nImgCnv.org={};
									nImgCnv.org.xs=dsprites[j].org.xs;
									nImgCnv.org.ys=dsprites[j].org.ys;
									nImgCnv.org.xo=dsprites[j].org.ox;
									nImgCnv.org.yo=dsprites[j].org.oy;
									nImgCnv.org.w=dsprites[j].org.w;
									nImgCnv.org.h=dsprites[j].org.h;
									nImgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
									nImgCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LAYER_GUI;
									if(dsprites[j].hasShd){
										nImgCnv.shd={};
										nImgCnv.shd.sequenceNo=i;
										nImgCnv.shd.xs=dsprites[j].shd.xs;
										nImgCnv.shd.ys=dsprites[j].shd.ys;
										nImgCnv.shd.xo=dsprites[j].shd.ox;
										nImgCnv.shd.yo=dsprites[j].shd.oy;
										nImgCnv.shd.w=dsprites[j].shd.w;
										nImgCnv.shd.h=dsprites[j].shd.h;
										nImgCnv.shd.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
										nImgCnv.shd.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_SHDW|SPRITE_INFOBITS_LAYER_GUI;
									};
									if(dsprites[j].hasLgt){
										nImgCnv.lgt={};
										nImgCnv.lgt.sequenceNo=i;
										nImgCnv.lgt.xs=dsprites[j].shd.xs;
										nImgCnv.lgt.ys=dsprites[j].shd.ys;
										nImgCnv.lgt.xo=dsprites[j].shd.ox;
										nImgCnv.lgt.yo=dsprites[j].shd.oy;
										nImgCnv.lgt.w=dsprites[j].shd.w;
										nImgCnv.lgt.h=dsprites[j].shd.h;
										nImgCnv.lgt.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
										nImgCnv.lgt.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LIGT|SPRITE_INFOBITS_LAYER_GUI;
									};									
									imgsBySeries[seriesName][i]=nImgCnv;
									sequenceNo++;
								};
							};
							break;
					};
				}else{
					// simple single image sprites
					imgsBySeries[seriesName][0]=imgCnv;
					imgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
					imgCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LAYER_GUI;
					imgCnv.org={};
					imgCnv.org.xs=0;
					imgCnv.org.ys=0;
					imgCnv.org.xo=0;
					imgCnv.org.yo=0;
					imgCnv.org.w=imgCnv.cnv.width;
					imgCnv.org.h=imgCnv.cnv.height;
				};
				
			};
			delete self.loadedImgs;
			log(imgsBySeries);
			spritePatterns=[];
			var no=0;
			for(seriesName in imgsBySeries){
				ser=imgsBySeries[seriesName];
				l=ser.length;
				for(i=0;i<l;i++){
					ser[i].no=no;
					u=ser[i];
					spritePatterns.push({cnv:u,oCnv:null,subIndex:SPRITE_NORM_XS,xs:u.org.xs,ys:u.org.ys,xo:u.org.xo,yo:u.org.yo,w:u.org.w,h:u.org.h,equalTo:-1,packerNo:-1});
					if(u.hasOwnProperty("shd"))spritePatterns.push({cnv:u,oCnv:u,subIndex:SPRITE_SHDW_XS,xs:u.shd.xs,ys:u.shd.ys,xo:u.shd.xo,yo:u.shd.yo,w:u.shd.w,h:u.shd.h,equalTo:-1,packerNo:-1});
					if(u.hasOwnProperty("lgt"))spritePatterns.push({cnv:u,oCnv:u,subIndex:SPRITE_LIGT_XS,xs:u.lgt.xs,ys:u.lgt.ys,xo:u.lgt.xo,yo:u.lgt.yo,w:u.lgt.w,h:u.lgt.h,equalTo:-1,packerNo:-1});
					no++;
				};
			};

			l=spritePatterns.length;
			// binpack image...
			packers=[];
			for(i=0;i<l;i++){
				u=spritePatterns[i];
				if(u.equalTo==-1){
					u.packerNo=packers.length;
					packers.push({w:Math.ceil(u.w/2),h:Math.ceil(u.h/2)});
				};
			};
			var packres=self._SpriteToolsBitPacker(packers),p,q;
			
			self.eventType=SpriteTools.EVENT_SPRITECOPY;
			_callBack(self);
			self.resImgSrc=document.createElement('canvas');
			self.resImgSrc.width=packres[0]*2;
			self.resImgSrc.height=packres[1]*2;
			self.resImgSrcCtx=self.resImgSrc.getContext("2d");
			self.resImgSrcCtx.imageSmoothingEnabled=false;
			for(i=0;i<l;i++){
				u=spritePatterns[i];
				if(u.equalTo==-1){
					v=u.packerNo;
					self.resImgSrcCtx.drawImage(u.cnv.cnv,u.xs,u.ys,u.w,u.h,packers[v].x*2,packers[v].y*2,u.w,u.h);
				}else{
					log("shit");
					v=spritePatterns[u.equalTo].packerNo;
				};

				switch(u.subIndex){
					case SPRITE_NORM_XS:
						u.cnv.sprite[u.subIndex]=packers[v].x*2;
						u.cnv.sprite[u.subIndex+1]=packers[v].y*2;
						u.cnv.sprite[u.subIndex+2]=u.w;
						u.cnv.sprite[u.subIndex+3]=u.h;
						u.cnv.sprite[u.subIndex+4]=u.xo;
						u.cnv.sprite[u.subIndex+5]=u.yo;
						break;
					case SPRITE_SHDW_XS:
						u.oCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_SHDW;
						u.oCnv.sprite[u.subIndex]=packers[v].x*2;
						u.oCnv.sprite[u.subIndex+1]=packers[v].y*2;
						u.oCnv.sprite[u.subIndex+2]=u.w;
						u.oCnv.sprite[u.subIndex+3]=u.h;
						u.oCnv.sprite[u.subIndex+4]=u.xo;
						u.oCnv.sprite[u.subIndex+5]=u.yo;
						break;
					case SPRITE_LIGT_XS:
						u.oCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LIGT;
						u.oCnv.sprite[u.subIndex]=packers[v].x*2;
						u.oCnv.sprite[u.subIndex+1]=packers[v].y*2;
						u.oCnv.sprite[u.subIndex+2]=u.w;
						u.oCnv.sprite[u.subIndex+3]=u.h;
						u.oCnv.sprite[u.subIndex+4]=u.xo;
						u.oCnv.sprite[u.subIndex+5]=u.yo;
						break;
				};
			};
			
			sprites={info:{scaleWithQuality:true,imgData:""},series:{},sprites:[]};
			for(seriesName in imgsBySeries){
				ser=imgsBySeries[seriesName];
				sprites.series[seriesName]=ser[0].no;
				l=ser.length;
				for(i=0;i<l;i++){
					sprites.sprites.push(ser[i].sprite);
				};
			};
			
			if(true){
				self.eventType=SpriteTools.EVENT_READY;
				self.result={imgDataURL:self.resImgSrc.toDataURL("image/png"),sprites:sprites};
				_callBack(self);
			}else{
				self.eventType=SpriteTools.EVENT_ERROR_RESULTIMAGETOBIG;
				_callBack(self);
			};
		};
		
	});
};

// SpriteTools.ConvertImageSequence2Sprites
// creates sprites from an image sequences containing sprites (192x192)...
SpriteTools.prototype.ConvertImageSequence2Sprites=function(_urlsOrInputOrImages,_callBack,_opt){
var self=this;
var optDef={orgCompare:0,shdCompare:0};
	if(_opt===undefined)_opt=optDef;
	if(ObjIsEmpty(_opt))_opt=optDef;
	if(!_opt.hasOwnProperty('orgCompare'))_opt.orgCompare=0;
	if(!_opt.hasOwnProperty('shdCompare'))_opt.shdCompare=0;
	_opt=Object.assign(optDef,_opt);
	self._LoadImages(_urlsOrInputOrImages,self.TileImageAntialiasingShrinkCheck,self.TileImageAntialiasingShrink,_callBack,_opt,function(_ev){
		var img,j,i,l,packers,l,maxOrgWidth,maxOrgHeight,maxShdWidth,maxShdHeight,sprites,p,q,xOrg,xShd;
		var imgsByName,imgsByPrefixSeries,name,prefixes,layers,prefix,layer,layersBitsets,seriesNo,sequenceNo,imgCnv,nImgCnv,seriesNames;
		var ser,seq,x,y,w,h,spritePatterns,u,v,packers=[],box;
		if(_ev.eventType==SpriteTools.EVENT_IMAGESLOADED){
			l=self.loadedImgs.length;
			imgsByPrefixSeries={"O":[],"L":[],"S":[],"D":[],"T":[],"B":[],"M":[],"N":[]};
			imgsByName={};
			seriesNames=[];
			prefixes=["O","L","S","B","D","T","M","N"];
			layers=["ACT","EFX","EDS","IVS"];
			layersBitsets={"ACT":SPRITE_INFOBITS_LAYER_ACT,"EFX":SPRITE_INFOBITS_LAYER_EFX,"EDS":SPRITE_INFOBITS_LAYER_EDS,"IVS":SPRITE_INFOBITS_LAYER_IVS,"GUI":SPRITE_INFOBITS_LAYER_GUI};
			for(i=0;i<l;i++){
				name=self.loadedImgs[i].name.basename();
				prefix=name.substr(0,1);
				layer=name.substr(2,3);
				seriesNo=parseInt(name.substr(6,2),10);
				sequenceNo=parseInt(name.split(".")[1],10);
				if(prefixes.indexOf(prefix)>=0&&layers.indexOf(layer)>=0){
					imgCnv={};
					imgCnv.img=self.loadedImgs[i];
					imgCnv.cnv=document.createElement('canvas');
					imgCnv.cnv.width=self.loadedImgs[i].width;
					imgCnv.cnv.height=self.loadedImgs[i].height;
					imgCnv.cnvCtx=imgCnv.cnv.getContext("2d");
					imgCnv.cnvCtx.imageSmoothingEnabled=false;
					imgCnv.cnvCtx.drawImage(self.loadedImgs[i],0,0);
					imgCnv.name=name;
					imgCnv.prefix=prefix;
					imgCnv.layer=layer;
					imgCnv.seriesNo=seriesNo;
					imgCnv.sequenceNo=sequenceNo;
					imgsByName[name]=imgCnv;
					if(imgsByPrefixSeries[prefix][seriesNo]===undefined){
						imgsByPrefixSeries[prefix][seriesNo]=[];
						seriesNames[seriesNo]=name.split(".")[0].substr(9);
					};
					switch(prefix){
						case'T':
						case'O':
							imgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
							imgsByPrefixSeries[prefix][seriesNo][sequenceNo]=imgCnv;
							imgCnv.sprite[SPRITE_INFOBITS]|=layersBitsets[layer];
							break;
						case'D':
							self.cnvImgSrc=imgCnv.cnv;
							self.cnvImgSrcCtxImageData=imgCnv.cnvCtx.getImageData(0,0,imgCnv.cnv.width,imgCnv.cnv.height).data;
							var dsprites=self._DoDSDFormatScan({doShd:true,orgDubRedSen:true},NOFUNCTION);
							sequenceNo=0;
							for(j in dsprites){
								if(dsprites[j].hasOrg){
									nImgCnv=Object.assign({},imgCnv);
									nImgCnv.sequenceNo=sequenceNo;
									nImgCnv.org={};
									nImgCnv.org.xs=dsprites[j].org.xs;
									nImgCnv.org.ys=dsprites[j].org.ys;
									nImgCnv.org.xo=dsprites[j].org.ox;
									nImgCnv.org.yo=dsprites[j].org.oy;
									nImgCnv.org.w=dsprites[j].org.w;
									nImgCnv.org.h=dsprites[j].org.h;
									nImgCnv.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
									nImgCnv.sprite[SPRITE_INFOBITS]|=layersBitsets[layer];
									if(dsprites[j].hasShd){
										nImgCnv.shd={};
										nImgCnv.shd.sequenceNo=sequenceNo;
										nImgCnv.shd.xs=dsprites[j].shd.xs;
										nImgCnv.shd.ys=dsprites[j].shd.ys;
										nImgCnv.shd.xo=dsprites[j].shd.ox;
										nImgCnv.shd.yo=dsprites[j].shd.oy;
										nImgCnv.shd.w=dsprites[j].shd.w;
										nImgCnv.shd.h=dsprites[j].shd.h;
										nImgCnv.shd.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
										nImgCnv.shd.sprite[SPRITE_INFOBITS]|=layersBitsets[layer];
									};
									if(dsprites[j].hasLgt){
										nImgCnv.lgt={};
										nImgCnv.lgt.sequenceNo=sequenceNo;
										nImgCnv.lgt.xs=dsprites[j].shd.xs;
										nImgCnv.lgt.ys=dsprites[j].shd.ys;
										nImgCnv.lgt.xo=dsprites[j].shd.ox;
										nImgCnv.lgt.yo=dsprites[j].shd.oy;
										nImgCnv.lgt.w=dsprites[j].shd.w;
										nImgCnv.lgt.h=dsprites[j].shd.h;
										nImgCnv.lgt.sprite=new Array(SPRITE_DATA_LENGTH).fill(0);
										nImgCnv.lgt.sprite[SPRITE_INFOBITS]|=layersBitsets[layer];
									};									
									imgsByPrefixSeries[prefix][seriesNo][sequenceNo]=nImgCnv;
									sequenceNo++;
								};
							};
							break;
						default:
							imgsByPrefixSeries[prefix][seriesNo][sequenceNo]=imgCnv;
					};
				};
			};
			delete self.loadedImgs;
			
			// combinate floor lighting and blending images to one lighting image and delete all blending images...
			for(ser=0;ser<imgsByPrefixSeries["B"].length;ser++){
				if(imgsByPrefixSeries["L"][ser]===undefined){
					imgsByPrefixSeries["L"][ser]=imgsByPrefixSeries["B"][ser];
					delete imgsByPrefixSeries["B"][ser];
				}else{
					if(imgsByPrefixSeries["B"][ser]!==undefined){
						for(seq=0;seq<imgsByPrefixSeries["B"][ser].length;seq++){
							if(imgsByPrefixSeries["L"][ser][seq]===undefined){
								imgsByPrefixSeries["L"][ser][seq]=imgsByPrefixSeries["B"][ser][seq];
								delete imgsByPrefixSeries["B"][ser][seq];
							};
						};
					};
				};
			};
			for(ser=0;ser<imgsByPrefixSeries["L"].length;ser++){
				if(imgsByPrefixSeries["B"][ser]!==undefined){
					for(seq=0;seq<imgsByPrefixSeries["L"][ser].length;seq++){
						if(imgsByPrefixSeries["B"][ser][seq]!==undefined){
							self._CombineLightingAndBlending(imgsByPrefixSeries["L"][ser][seq].cnv,imgsByPrefixSeries["B"][ser][seq].cnv);
						};
					};
				};
			};			
			delete imgsByPrefixSeries["B"];
			
			// prework lighting mask (original without transparent and white mask, convert to transparent with black mask)...
			for(ser=0;ser<imgsByPrefixSeries["M"].length;ser++){
				if(imgsByPrefixSeries["M"][ser]!==undefined){
					for(seq=0;seq<imgsByPrefixSeries["M"][ser].length;seq++){
						if(imgsByPrefixSeries["M"][ser][seq]!==undefined){
							self._CreateSpriteLightingMask(imgsByPrefixSeries["M"][ser][seq].cnv);
						};
					};
				};
			};
			// prework shadow mask (original without transparent and white mask, convert to transparent with black mask)...
			for(ser=0;ser<imgsByPrefixSeries["N"].length;ser++){
				if(imgsByPrefixSeries["N"][ser]!==undefined){
					for(seq=0;seq<imgsByPrefixSeries["N"][ser].length;seq++){
						if(imgsByPrefixSeries["N"][ser][seq]!==undefined){
							self._CreateSpriteShadowMask(imgsByPrefixSeries["N"][ser][seq].cnv);
						};
					};
				};
			};
			
			
			spritePatterns=[];
			
			for(ser=0;ser<imgsByPrefixSeries["O"].length;ser++){
				if(imgsByPrefixSeries["O"][ser]!==undefined){
					for(seq=0;seq<imgsByPrefixSeries["O"][ser].length;seq++){
						if(imgsByPrefixSeries["O"][ser][seq]!==undefined){
							box=self._GetShrinkBox(imgsByPrefixSeries["O"][ser][seq].cnv,0);
							spritePatterns.push({cnv:imgsByPrefixSeries["O"][ser][seq],oCnv:null,subIndex:SPRITE_NORM_XS,xs:box.xs,ys:box.ys,w:box.w,h:box.h,xo:box.xo,yo:box.yo,equalTo:-1,packerNo:-1});
							if(imgsByPrefixSeries["S"][ser]!==undefined&&imgsByPrefixSeries["S"][ser][seq]!==undefined){
								// shadow exists...
								box=self._GetShrinkBox(imgsByPrefixSeries["S"][ser][seq].cnv,0);
								spritePatterns.push({cnv:imgsByPrefixSeries["S"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:SPRITE_SHDW_XS,xs:box.xs,ys:box.ys,w:box.w,h:box.h,xo:box.xo,yo:box.yo,equalTo:-1,packerNo:-1});
							};
							if(imgsByPrefixSeries["L"][ser]!==undefined&&imgsByPrefixSeries["L"][ser][seq]!==undefined){
								// lighting exists...
								box=self._GetShrinkBox(imgsByPrefixSeries["L"][ser][seq].cnv,0);
								spritePatterns.push({cnv:imgsByPrefixSeries["L"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:SPRITE_LIGT_XS,xs:box.xs,ys:box.ys,w:box.w,h:box.h,xo:box.xo,yo:box.yo,equalTo:-1,packerNo:-1});
							};
							if(imgsByPrefixSeries["M"][ser]!==undefined&&imgsByPrefixSeries["M"][ser][seq]!==undefined){
								// lighting exists...
								box=self._GetShrinkBox(imgsByPrefixSeries["M"][ser][seq].cnv,0);
								spritePatterns.push({cnv:imgsByPrefixSeries["M"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:SPRITE_LMSK_XS,xs:box.xs,ys:box.ys,w:box.w,h:box.h,xo:box.xo,yo:box.yo,equalTo:-1,packerNo:-1});
							};
							if(imgsByPrefixSeries["N"][ser]!==undefined&&imgsByPrefixSeries["N"][ser][seq]!==undefined){
								// lighting exists...
								box=self._GetShrinkBox(imgsByPrefixSeries["N"][ser][seq].cnv,0);
								spritePatterns.push({cnv:imgsByPrefixSeries["N"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:SPRITE_SMSK_XS,xs:box.xs,ys:box.ys,w:box.w,h:box.h,xo:box.xo,yo:box.yo,equalTo:-1,packerNo:-1});
							};
						};
					};
				};
			};
			
			// add dsdf image sprites...
			self.eventType=SpriteTools.EVENT_SPRITESCANSTART;
			_callBack(self);
			for(ser=0;ser<imgsByPrefixSeries["D"].length;ser++){
				if(imgsByPrefixSeries["D"][ser]!==undefined){
					for(seq=0;seq<imgsByPrefixSeries["D"][ser].length;seq++){
						u=imgsByPrefixSeries["D"][ser][seq];
						spritePatterns.push({cnv:u,oCnv:null,subIndex:SPRITE_NORM_XS,xs:u.org.xs,ys:u.org.ys,xo:u.org.xo,yo:u.org.yo,w:u.org.w,h:u.org.h,equalTo:-1,packerNo:-1});
						if(u.hasOwnProperty("shd"))spritePatterns.push({cnv:u,oCnv:u,subIndex:SPRITE_SHDW_XS,xs:u.shd.xs,ys:u.shd.ys,xo:u.shd.xo,yo:u.shd.yo,w:u.shd.w,h:u.shd.h,equalTo:-1,packerNo:-1});
						if(u.hasOwnProperty("lgt"))spritePatterns.push({cnv:u,oCnv:u,subIndex:SPRITE_LIGT_XS,xs:u.lgt.xs,ys:u.lgt.ys,xo:u.lgt.xo,yo:u.lgt.yo,w:u.lgt.w,h:u.lgt.h,equalTo:-1,packerNo:-1});
					};
				};
			};

			// add textures image sprites...
			for(ser=0;ser<imgsByPrefixSeries["T"].length;ser++){
				if(imgsByPrefixSeries["T"][ser]!==undefined){
					for(seq=0;seq<imgsByPrefixSeries["T"][ser].length;seq++){
						u=imgsByPrefixSeries["T"][ser][seq];
						spritePatterns.push({cnv:u,oCnv:null,subIndex:SPRITE_NORM_XS,xs:0,ys:0,w:u.img.width,h:u.img.height,xo:0,yo:0,equalTo:-1,packerNo:-1});
					};
				};
			};

			if(_opt.hasOwnProperty("createSingleImages")){
				var imgDataURLs=[],siCnv,siCtx;
				l=spritePatterns.length;
				for(i=0;i<l;i++){
					u=spritePatterns[i];
					switch(u.cnv.prefix){
						case"O":
							siCnv=document.createElement('canvas');
							siCnv.width=u.w;
							siCnv.height=u.h;
							siCtx=siCnv.getContext("2d");
							siCtx.imageSmoothingEnabled=false;
							siCtx.drawImage(u.cnv.cnv,u.xs,u.ys,u.w,u.h,0,0,u.w,u.h);
							imgDataURLs.push(siCnv.toDataURL("image/png"));
							u.cnv.sprite[u.subIndex]=0;
							u.cnv.sprite[u.subIndex+1]=0;
							u.cnv.sprite[u.subIndex+2]=u.w;
							u.cnv.sprite[u.subIndex+3]=u.h;
							u.cnv.sprite[u.subIndex+4]=u.xo;
							u.cnv.sprite[u.subIndex+5]=u.yo;
							break;
					};
				};

				sprites={info:{maxWidth:maxW,maxHeight:maxH,offX:offX,offY:offY},series:{},sprites:[]};
				for(ser=0;ser<imgsByPrefixSeries["O"].length;ser++){
					if(imgsByPrefixSeries["O"][ser]!==undefined){
						sprites.series[seriesNames[ser]]=sprites.sprites.length;
						for(seq=0;seq<imgsByPrefixSeries["O"][ser].length;seq++){
							if(imgsByPrefixSeries["O"][ser][seq]!==undefined)sprites.sprites.push(imgsByPrefixSeries["O"][ser][seq].sprite);
						};
					};
				};

				self.eventType=SpriteTools.EVENT_READY;
				self.result={imgDataURLs:imgDataURLs,sprites:sprites};
				_callBack(self);

			
			}else if(_opt.hasOwnProperty("createSpritesStrip")){
				
				var imgDataURLs=[],siCnv,siCtx,siCnv2x,siCtx2x;
				var maxH=0,maxW=0,minX=99999,minY=99999,maxX=0,maxY=0;
				var cx,cy;
				l=spritePatterns.length;
				
				for(i=0;i<l;i++){
					u=spritePatterns[i];
					if(minX>u.xs)minX=u.xs;
					if(minY>u.ys)minY=u.ys;
					if(maxX<u.xs+u.w)maxX=u.xs+u.w;
					if(maxY<u.ys+u.h)maxY=u.ys+u.h;
				};
				maxH=maxY-minY+1;
				maxW=maxX-minX+1;
				if(maxH%2==1)maxH++;
				if(maxW%2==1)maxW++;
				siCnv=document.createElement('canvas');
				siCnv.width=maxW*l/2;
				siCnv.height=maxH/2;
				siCtx=siCnv.getContext("2d");
				siCtx.imageSmoothingEnabled=true;
				siCnv2x=document.createElement('canvas');
				siCnv2x.width=maxW*l;
				siCnv2x.height=maxH;
				siCtx2x=siCnv2x.getContext("2d");
				siCtx2x.imageSmoothingEnabled=false;
				for(i=0;i<l;i++){
					u=spritePatterns[i];
					switch(u.cnv.prefix){
						case"O":
							cx=u.xs+u.xo-minX;
							cy=u.ys+u.yo-minY;
							siCtx.drawImage(u.cnv.cnv,u.xs,u.ys,u.w,u.h,(i*maxW+cx-u.xo)/2,(cy-u.yo)/2,u.w/2,u.h/2);
							siCtx2x.drawImage(u.cnv.cnv,u.xs,u.ys,u.w,u.h,i*maxW+cx-u.xo,cy-u.yo,u.w,u.h);
							u.cnv.sprite[u.subIndex]=i*maxW;
							u.cnv.sprite[u.subIndex+1]=0;
							u.cnv.sprite[u.subIndex+2]=u.w;
							u.cnv.sprite[u.subIndex+3]=u.h;
							u.cnv.sprite[u.subIndex+4]=u.xo;
							u.cnv.sprite[u.subIndex+5]=u.yo;
							break;
					};
				};
				imgDataURLs.push(siCnv.toDataURL("image/png"));
				imgDataURLs.push(siCnv2x.toDataURL("image/png"));
				
				sprites={info:{maxWidth:maxW,maxHeight:maxH,offX:cx,offY:cy},series:{},sprites:[]};
				for(ser=0;ser<imgsByPrefixSeries["O"].length;ser++){
					if(imgsByPrefixSeries["O"][ser]!==undefined){
						sprites.series[seriesNames[ser]]=sprites.sprites.length;
						for(seq=0;seq<imgsByPrefixSeries["O"][ser].length;seq++){
							if(imgsByPrefixSeries["O"][ser][seq]!==undefined)sprites.sprites.push(imgsByPrefixSeries["O"][ser][seq].sprite);
						};
					};
				};
				self.eventType=SpriteTools.EVENT_READY;
				self.result={imgDataURLs:imgDataURLs,sprites:sprites};
				_callBack(self);
			
			}else{

				l=spritePatterns.length;
				p=0;
				// double reduction...
				for(i=0;i<l;i++){
					u=spritePatterns[i];
					if(u.equalTo==-1){
						for(j=i+1;j<l;j++){
							v=spritePatterns[j];
							if(v.equalTo==-1){
								if(u.w==v.w&&u.h==v.h)if(self._CompareBox(u.cnv.cnv,v.cnv.cnv,u.xs,u.ys,v.xs,v.ys,u.w,u.h,(v.cnv.prefix=="O"||u.cnv.prefix=="O"?_opt.orgCompare:_opt.shdCompare))){v.equalTo=i;p++;};
							};
						};
					};
				};
				
				// binpack image...
				packers=[];
				for(i=0;i<l;i++){
					u=spritePatterns[i];
					if(u.equalTo==-1){
						u.packerNo=packers.length;
						packers.push({w:Math.ceil(u.w/2),h:Math.ceil(u.h/2)});
					};
				};
				var packres=self._SpriteToolsBitPacker(packers),p,q;
				
				self.eventType=SpriteTools.EVENT_SPRITECOPY;
				_callBack(self);
				self.resImgSrc=document.createElement('canvas');
				self.resImgSrc.width=packres[0]*2;
				self.resImgSrc.height=packres[1]*2;
				self.resImgSrcCtx=self.resImgSrc.getContext("2d");
				self.resImgSrcCtx.imageSmoothingEnabled=false;
				for(i=0;i<l;i++){
					u=spritePatterns[i];
					if(u.equalTo==-1){
						v=u.packerNo;
						self.resImgSrcCtx.drawImage(u.cnv.cnv,u.xs,u.ys,u.w,u.h,packers[v].x*2,packers[v].y*2,u.w,u.h);
					}else{
						v=spritePatterns[u.equalTo].packerNo;
					};
					
					switch(u.cnv.prefix){
						case"T":
						case"O":
							u.cnv.sprite[u.subIndex]=packers[v].x*2;
							u.cnv.sprite[u.subIndex+1]=packers[v].y*2;
							u.cnv.sprite[u.subIndex+2]=u.w;
							u.cnv.sprite[u.subIndex+3]=u.h;
							u.cnv.sprite[u.subIndex+4]=u.xo;
							u.cnv.sprite[u.subIndex+5]=u.yo;
							break;
						case"D":
							switch(u.subIndex){
								case SPRITE_NORM_XS:
									u.cnv.sprite[u.subIndex]=packers[v].x*2;
									u.cnv.sprite[u.subIndex+1]=packers[v].y*2;
									u.cnv.sprite[u.subIndex+2]=u.w;
									u.cnv.sprite[u.subIndex+3]=u.h;
									u.cnv.sprite[u.subIndex+4]=u.xo;
									u.cnv.sprite[u.subIndex+5]=u.yo;
									break;
								case SPRITE_SHDW_XS:
									u.oCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_SHDW;
									u.oCnv.sprite[u.subIndex]=packers[v].x*2;
									u.oCnv.sprite[u.subIndex+1]=packers[v].y*2;
									u.oCnv.sprite[u.subIndex+2]=u.w;
									u.oCnv.sprite[u.subIndex+3]=u.h;
									u.oCnv.sprite[u.subIndex+4]=u.xo;
									u.oCnv.sprite[u.subIndex+5]=u.yo;
									break;
								case SPRITE_LIGT_XS:
									u.oCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LIGT;
									u.oCnv.sprite[u.subIndex]=packers[v].x*2;
									u.oCnv.sprite[u.subIndex+1]=packers[v].y*2;
									u.oCnv.sprite[u.subIndex+2]=u.w;
									u.oCnv.sprite[u.subIndex+3]=u.h;
									u.oCnv.sprite[u.subIndex+4]=u.xo;
									u.oCnv.sprite[u.subIndex+5]=u.yo;
									break;
								};
								break;
						case"S":
							u.oCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_SHDW;
							u.oCnv.sprite[u.subIndex]=packers[v].x*2;
							u.oCnv.sprite[u.subIndex+1]=packers[v].y*2;
							u.oCnv.sprite[u.subIndex+2]=u.w;
							u.oCnv.sprite[u.subIndex+3]=u.h;
							u.oCnv.sprite[u.subIndex+4]=u.xo;
							u.oCnv.sprite[u.subIndex+5]=u.yo;
							break;
						case"L":
							u.oCnv.sprite[SPRITE_INFOBITS]|=SPRITE_INFOBITS_LIGT;
							u.oCnv.sprite[u.subIndex]=packers[v].x*2;
							u.oCnv.sprite[u.subIndex+1]=packers[v].y*2;
							u.oCnv.sprite[u.subIndex+2]=u.w;
							u.oCnv.sprite[u.subIndex+3]=u.h;
							u.oCnv.sprite[u.subIndex+4]=u.xo;
							u.oCnv.sprite[u.subIndex+5]=u.yo;
							break;
					};
				};
				
				sprites={info:{scaleWithQuality:true,imgData:""},series:{},sprites:[]};
				for(ser=0;ser<imgsByPrefixSeries["D"].length;ser++){
					if(imgsByPrefixSeries["D"][ser]!==undefined)imgsByPrefixSeries["O"][ser]=imgsByPrefixSeries["D"][ser];
				};
				for(ser=0;ser<imgsByPrefixSeries["T"].length;ser++){
					if(imgsByPrefixSeries["T"][ser]!==undefined)imgsByPrefixSeries["O"][ser]=imgsByPrefixSeries["T"][ser];
				};
				for(ser=0;ser<imgsByPrefixSeries["O"].length;ser++){
					if(imgsByPrefixSeries["O"][ser]!==undefined){
						sprites.series[seriesNames[ser]]=sprites.sprites.length;
						for(seq=0;seq<imgsByPrefixSeries["O"][ser].length;seq++){
							if(imgsByPrefixSeries["O"][ser][seq]!==undefined)sprites.sprites.push(imgsByPrefixSeries["O"][ser][seq].sprite);
						};
					};
				};
				
				if(true){
					self.eventType=SpriteTools.EVENT_READY;
					self.result={imgDataURL:self.resImgSrc.toDataURL("image/png"),sprites:sprites};
					_callBack(self);
				}else{
					self.eventType=SpriteTools.EVENT_ERROR_RESULTIMAGETOBIG;
					_callBack(self);
				};
			};
		};
	});
};

SpriteTools.prototype.TileImageAntialiasingShrinkCheck=function(_img){
var prefixes=["O","S","L","B","N","M","X"];
	return ((_img.width==384&&_img.height==384)||(_img.width==768&&_img.height==768))&&prefixes.indexOf(_img.name.basename().split("_")[0])>=0;
};
 
SpriteTools.prototype.TileImageAntialiasingShrink=function(_ev,_img,_callBack){
var newcnv=document.createElement('canvas'),newcnvctx,retimg=new Image(),w=_img.width,h=_img.height;
var x,y,s;
	newcnv.width=192;
	newcnv.height=192;
	newcnvctx=newcnv.getContext('2d');
	newcnvctx.imageSmoothingEnabled=false;
	//newcnvctx.drawImage(_img,0,0,w,h,0,0,192,192);
	newcnvctx.imageSmoothingEnabled=true;
	newcnvctx.imageSmoothingQuality="high";
	if(_img.width==384)s=128;
	if(_img.width==768)s=256;
	for(x=0;x<3;x++){
		for(y=0;y<3;y++){
			newcnvctx.drawImage(_img,x*s,y*s,s,s,x*64,y*64,64,64);
			//newcnvctx.drawImage(_img,x*s+2,y*s+2,s-2,s-2,x*64+1,y*64+1,64-2,64-2);
		};
	};
	_img.onload=function(){
		_callBack(_ev);
	};
	//µWriteFile("E:\\Sites\\oxyd\\dev\\newmodels\\test\\"+_img.src.basename()+".tiles.png",newcnv.toDataURL("image/png").split(",")[1],true);
	_img.src=newcnv.toDataURL("image/png");
};

SpriteTools.prototype.CreateCrackTile=function(_imgCnv,_loadedImages){
var rDD,rD,xD,yD,zD,wD,x,y;
	function _GetPrefixImageIndex(_prefix){
	var i,l=_loadedImages.length,name,prefix,layer,seriesNo,sequenceNo,imgCnv;
		for(i=0;i<l;i++){
			name=_loadedImages[i].name.basename();
			prefix=name.substr(0,1);
			layer=name.substr(2,3);
			seriesNo=parseInt(name.substr(6,2),10);
			sequenceNo=parseInt(name.split(".")[1],10);
			if(prefix=="W")sequenceNo=_imgCnv.sequenceNo;
			if(prefix==_prefix){
				if(_imgCnv.layer==layer&&_imgCnv.seriesNo==seriesNo&&_imgCnv.sequenceNo==sequenceNo){
					imgCnv={};
					imgCnv.cnv=document.createElement('canvas');
					imgCnv.cnv.width=_loadedImages[i].width;
					imgCnv.cnv.height=_loadedImages[i].height;
					imgCnv.cnvCtx=imgCnv.cnv.getContext("2d");
					imgCnv.cnvCtx.imageSmoothingEnabled=false;
					imgCnv.cnvCtx.drawImage(_loadedImages[i],0,0);
					imgCnv.data=imgCnv.cnvCtx.getImageData(256,256,256,256).data;
					return imgCnv.data;
				};
			};
		};
	};
	rCnv=document.createElement('canvas');
	rCnv.width=256;
	rCnv.height=256;
	rDD=rCnv.getContext("2d").getImageData(0,0,256,256);
	rD=rDD.data;
	wD=_GetPrefixImageIndex("W");
	xD=_GetPrefixImageIndex("X");
	yD=_GetPrefixImageIndex("Y");
	zD=_GetPrefixImageIndex("Z");
	
	for(x=0;x<256;x++){
		for(y=0;y<256;y++){
			i=(y*256+x)<<2;
			if(zD[i]>0){
				// original crack image...
				rD[i]=xD[i];
				rD[i+1]=xD[i+1];
				rD[i+2]=xD[i+2];
				rD[i+3]=xD[i+3];
			}else{
				// water or abyss plus shadow...
				rD[i]=(wD[i]*yD[i])>>8;
				rD[i+1]=(wD[i+1]*yD[i+1])>>8;
				rD[i+2]=(wD[i+2]*yD[i+2])>>8;
				rD[i+3]=wD[i+3];
			};
		};
	};

	rCnv.getContext("2d").putImageData(rDD,0,0);
	
	_imgCnv.cnv.width=192;
	_imgCnv.cnv.height=192;
	_imgCnv.cnvCtx=_imgCnv.cnv.getContext("2d");
	_imgCnv.cnvCtx.imageSmoothingEnabled=true;
	_imgCnv.cnvCtx.drawImage(rCnv,0,0,256,256,64,64,64,64);
};

// SpriteTools.ConvertImageSequence2Tiles
// creates tiles from an image sequences containing tiles (192x192)...
SpriteTools.prototype.ConvertImageSequence2Tiles=function(_urlsOrInputOrImages,_callBack,_opt){
var self=this,optDef={shdTrig:20},centerPreSortColors={};
	if(_opt===undefined)_opt=optDef
	if(ObjIsEmpty(_opt))_opt=optDef;
	if(!_opt.hasOwnProperty('orgCompare'))_opt.orgCompare=0;
	if(!_opt.hasOwnProperty('shdCompare'))_opt.shdCompare=0;
	_opt=Object.assign(optDef,_opt);
	self._LoadImages(_urlsOrInputOrImages,self.TileImageAntialiasingShrinkCheck,self.TileImageAntialiasingShrink,_callBack,_opt,function(_ev){
		var img,j,i,l,packers,l,maxOrgWidth,maxOrgHeight,maxShdWidth,maxShdHeight,tiles,p,q,xOrg,xShd;
		var imgsByName,imgsByPrefixSeries,name,prefixes,layers,prefix,layer,layersBitsets,seriesNo,sequenceNo,imgCnv,nImgCnv,seriesNames,extaInfoBits,shadowCuts,shadowCut;
		var ser,seq,x,y,w,h,tilePatterns,u,v,packers=[],shadowCopy;
		if(_ev.eventType==SpriteTools.EVENT_IMAGESLOADED){
			l=self.loadedImgs.length;
			// prefixes:
			// O = original
			// L = lighting
			// S = shadow
			// P = pattern (64x64xX)
			// B = blending
			// M = lighning mask
			// N = shadow mask
			// T = shader special texture
			// W,X,Y,Z = crack special
			imgsByPrefixSeries={"O":[],"L":[],"S":[],"P":[],"B":[],"M":[],"N":[]};
			imgsByName={};
			seriesNames=[];
			prefixes=["O","L","S","P","B","M","N","X"];
			layers=["FLR","THG","STO","INV","EDT"];
			layersBitsets={"FLR":TILE_INFOBITS_LAYER_FLR,"THG":TILE_INFOBITS_LAYER_THG,"STO":TILE_INFOBITS_LAYER_STO,"INV":TILE_INFOBITS_LAYER_INV,"EDT":TILE_INFOBITS_LAYER_EDT};
			for(i=0;i<l;i++){
				//log("SpriteTool2:",self.loadedImgs[i].name.basename());
				name=self.loadedImgs[i].name.basename();
				prefix=name.substr(0,1);
				layer=name.substr(2,3);
				seriesNo=parseInt(name.substr(6,2),10);
				shadowCuts=null;
				shadowCut=0;
				shadowCopy=0;
				if(name.noOfChars(".")>2){
					// extra info bits available...
					if(name.noOfChars(".")>3){
						extaInfoBits=parseInt(name.split(".")[1],2)<<16;
						sequenceNo=parseInt(name.split(".")[3],10);
						if(name.split(".")[2]=="O"){
							// outer...
							shadowCuts="0111-0111-0011-0111-0111-0011-0110-0110-0000".split("-")
							shadowCut=parseInt(shadowCuts[sequenceNo%9],2);
						}else if(name.split(".")[2]=="I"){
							// inner...
							shadowCuts="0010-0001-0110-0110-0110-0011-0001-0111".split("-")
							if(shadowCuts.length<sequenceNo)shadowCut=parseInt(shadowCuts[sequenceNo%8],2);
						}else if(name.split(".")[2]=="F"){
							// frame...
							shadowCuts="0101-0011-0100-0110-0110-0011-0011-0000".split("-")
							shadowCut=parseInt(shadowCuts[sequenceNo%8],2);
							switch(sequenceNo%8){
								case 1:
									shadowCopy=1;
									// bottom shadow copy mid to left (clear shadow of left and left bottom stone)
									break;
								case 3:
									shadowCopy=2;
									// right shadow copy mid to top (clear shadow of top and top right stone)
									break;
							};
						}else if(name.split(".")[2]=="C"){
							// cross...
							shadowCuts="0110-0001-0101-0000-0000".split("-")
							shadowCut=parseInt(shadowCuts[sequenceNo%5],2);
							switch(sequenceNo%5){
								case 3:
									shadowCopy=1;
									// bottom shadow copy mid to left (clear shadow of left and left bottom stone)
									break;
								case 4:
									shadowCopy=2;
									// right shadow copy mid to top (clear shadow of top and top right stone)
									break;
							};
						}else if(!isNaN(parseInt(name.split(".")[2],2))){
							// numeric...
							shadowCut=parseInt(name.split(".")[2],2);
						};
					}else{
						extaInfoBits=parseInt(name.split(".")[1],2)<<16;
						sequenceNo=parseInt(name.split(".")[2],10);
					};
				}else{
					extaInfoBits=0;
					sequenceNo=parseInt(name.split(".")[1],10);
				};
				if(prefixes.indexOf(prefix)>=0&&layers.indexOf(layer)>=0){
					imgCnv={};
					imgCnv.cnv=document.createElement('canvas');
					imgCnv.cnv.width=self.loadedImgs[i].width;
					imgCnv.cnv.height=self.loadedImgs[i].height;
					//log("shit",imgCnv.cnv.width,imgCnv.cnv.height);
					imgCnv.cnvCtx=imgCnv.cnv.getContext("2d");
					imgCnv.cnvCtx.imageSmoothingEnabled=false;
					//OxydLog.Html("<img src=\""+self.loadedImgs[i].src+"\"><br/>");
					imgCnv.cnvCtx.drawImage(self.loadedImgs[i],0,0);
					imgCnv.name=name;
					imgCnv.prefix=prefix;
					imgCnv.layer=layer;
					imgCnv.seriesNo=seriesNo;
					imgCnv.sequenceNo=sequenceNo;
					if(prefix=="X"){
						imgCnv.tile=new Array(TILE_DATA_LENGTH).fill(0);
						imgCnv.tile[TILE_INFOBITS]|=extaInfoBits;
						imgCnv.tile[TILE_INFOBITS]|=layersBitsets[layer];
						prefix="O";
						imgCnv.prefix=prefix;
						self.CreateCrackTile(imgCnv,self.loadedImgs);
					};
					if(prefix=="O"){
						imgCnv.tile=new Array(TILE_DATA_LENGTH).fill(0);
						imgCnv.tile[TILE_INFOBITS]|=extaInfoBits;
						imgCnv.tile[TILE_INFOBITS]|=layersBitsets[layer];
						if(layer=="FLR")self._SetBgrd(imgCnv,0,0,0);
					};
					imgsByName[name]=imgCnv;
					if(imgsByPrefixSeries[prefix][seriesNo]===undefined){
						imgsByPrefixSeries[prefix][seriesNo]=[];
						seriesNames[seriesNo]=name.split(".")[0].substr(9);
					};
					if(prefix=="S"&&shadowCut>0){
						// clear not needed shadow boxes...
						self._ShadowImageCut(imgCnv,shadowCut);
					};
					if(prefix=="S"&&shadowCopy>0){
						// clear not needed shadow boxes...
						self._ShadowImageCopy(imgCnv,shadowCopy);
					};
					if(prefix=="P"){
						w=Math.floor(imgCnv.cnv.width/64);
						h=Math.floor(imgCnv.cnv.height/64);
						sequenceNo=0;
						for(y=0;y<h;y++){
							for(x=0;x<w;x++){
								nImgCnv=Object.assign({},imgCnv);
								nImgCnv.sequenceNo=sequenceNo;
								nImgCnv.xs=x*64;
								nImgCnv.ys=y*64;
								imgsByPrefixSeries[prefix][seriesNo][sequenceNo]=nImgCnv;
								nImgCnv.tile=new Array(TILE_DATA_LENGTH).fill(0);
								nImgCnv.tile[TILE_INFOBITS]|=layersBitsets[layer];
								sequenceNo++;
							};
						};
					}else{
						imgsByPrefixSeries[prefix][seriesNo][sequenceNo]=imgCnv;
					};
				};
			};
			delete self.loadedImgs;

			// combinate floor lighting and blending images to one lighting image and delete all blending images...
			for(ser=0;ser<imgsByPrefixSeries["B"].length;ser++){
				if(imgsByPrefixSeries["L"][ser]===undefined){
					imgsByPrefixSeries["L"][ser]=imgsByPrefixSeries["B"][ser];
					delete imgsByPrefixSeries["B"][ser];
				}else{
					if(imgsByPrefixSeries["B"][ser]!==undefined){
						for(seq=0;seq<imgsByPrefixSeries["B"][ser].length;seq++){
							if(imgsByPrefixSeries["L"][ser]===undefined&&imgsByPrefixSeries["L"][ser][seq]===undefined){
								imgsByPrefixSeries["L"][ser][seq]=imgsByPrefixSeries["B"][ser][seq];
								delete imgsByPrefixSeries["B"][ser][seq];
							};
						};
					};
				};
			};
			for(ser=0;ser<imgsByPrefixSeries["L"].length;ser++){
				if(imgsByPrefixSeries["B"][ser]!==undefined){
					for(seq=0;seq<imgsByPrefixSeries["L"][ser].length;seq++){
						if(imgsByPrefixSeries["B"][ser]!==undefined&&imgsByPrefixSeries["B"][ser][seq]!==undefined){
							self._CombineLightingAndBlending(imgsByPrefixSeries["L"][ser][seq].cnv,imgsByPrefixSeries["B"][ser][seq].cnv);
						};
					};
				};
			};			
			delete imgsByPrefixSeries["B"];
			
			// prework lighting mask (original without transparent and white mask, convert to transparent with black mask)...
			for(ser=0;ser<imgsByPrefixSeries["M"].length;ser++){
				if(imgsByPrefixSeries["M"][ser]!==undefined){
					for(seq=0;seq<imgsByPrefixSeries["M"][ser].length;seq++){
						if(imgsByPrefixSeries["M"][ser][seq]!==undefined){
							self._CreateTileLightingMask(imgsByPrefixSeries["M"][ser][seq].cnv);
						};
					};
				};
			};
			// prework shadow mask (original without transparent and white mask, convert to transparent with black mask)...
			for(ser=0;ser<imgsByPrefixSeries["N"].length;ser++){
				if(imgsByPrefixSeries["N"][ser]!==undefined){
					for(seq=0;seq<imgsByPrefixSeries["N"][ser].length;seq++){
						if(imgsByPrefixSeries["N"][ser][seq]!==undefined){
							self._CreateTileShadowMask(imgsByPrefixSeries["N"][ser][seq].cnv);
						};
					};
				};
			};
			
			tilePatterns=[];
			for(ser=0;ser<imgsByPrefixSeries["O"].length;ser++){
				if(imgsByPrefixSeries["O"][ser]!==undefined){
					for(seq=0;seq<imgsByPrefixSeries["O"][ser].length;seq++){
						if(imgsByPrefixSeries["O"][ser][seq]!==undefined){
							tilePatterns.push({cnv:imgsByPrefixSeries["O"][ser][seq],oCnv:null,subIndex:TILE_NORM_XS,xs:64,ys:64,equalTo:-1,packerNo:-1});
							if(imgsByPrefixSeries["S"][ser]!==undefined&&imgsByPrefixSeries["S"][ser][seq]!==undefined){
								// shadow exists...
								if(!self._IsFullWhiteTile(imgsByPrefixSeries["S"][ser][seq],64,64))tilePatterns.push({cnv:imgsByPrefixSeries["S"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_SHDW_XS,xs:64,ys:64,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_SHDW_SELF});
								if(!self._IsFullWhiteTile(imgsByPrefixSeries["S"][ser][seq],128,64))tilePatterns.push({cnv:imgsByPrefixSeries["S"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_SHDW_R_XS,xs:128,ys:64,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_SHDW_R});
								if(!self._IsFullWhiteTile(imgsByPrefixSeries["S"][ser][seq],64,128))tilePatterns.push({cnv:imgsByPrefixSeries["S"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_SHDW_B_XS,xs:64,ys:128,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_SHDW_B});
								if(!self._IsFullWhiteTile(imgsByPrefixSeries["S"][ser][seq],128,128))tilePatterns.push({cnv:imgsByPrefixSeries["S"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_SHDW_BR_XS,xs:128,ys:128,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_SHDW_BR});
							};
							if(imgsByPrefixSeries["L"][ser]!==undefined&&imgsByPrefixSeries["L"][ser][seq]!==undefined){
								// lighting exists...
								if(!self._IsFullBlackTile(imgsByPrefixSeries["L"][ser][seq],0,0))tilePatterns.push({cnv:imgsByPrefixSeries["L"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_LIGT_TL_XS,xs:0,ys:0,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_LIGT_TL});
								if(!self._IsFullBlackTile(imgsByPrefixSeries["L"][ser][seq],64,0))tilePatterns.push({cnv:imgsByPrefixSeries["L"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_LIGT_T_XS,xs:64,ys:0,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_LIGT_T});
								if(!self._IsFullBlackTile(imgsByPrefixSeries["L"][ser][seq],128,0))tilePatterns.push({cnv:imgsByPrefixSeries["L"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_LIGT_TR_XS,xs:128,ys:0,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_LIGT_TR});
								if(!self._IsFullBlackTile(imgsByPrefixSeries["L"][ser][seq],0,64))tilePatterns.push({cnv:imgsByPrefixSeries["L"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_LIGT_L_XS,xs:0,ys:64,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_LIGT_L});
								if(!self._IsFullBlackTile(imgsByPrefixSeries["L"][ser][seq],64,64))tilePatterns.push({cnv:imgsByPrefixSeries["L"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_LIGT_XS,xs:64,ys:64,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_LIGT_SELF});
								if(!self._IsFullBlackTile(imgsByPrefixSeries["L"][ser][seq],128,64))tilePatterns.push({cnv:imgsByPrefixSeries["L"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_LIGT_R_XS,xs:128,ys:64,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_LIGT_R});
								if(!self._IsFullBlackTile(imgsByPrefixSeries["L"][ser][seq],0,128))tilePatterns.push({cnv:imgsByPrefixSeries["L"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_LIGT_BL_XS,xs:0,ys:128,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_LIGT_BL});
								if(!self._IsFullBlackTile(imgsByPrefixSeries["L"][ser][seq],64,128))tilePatterns.push({cnv:imgsByPrefixSeries["L"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_LIGT_B_XS,xs:64,ys:128,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_LIGT_B});
								if(!self._IsFullBlackTile(imgsByPrefixSeries["L"][ser][seq],128,128))tilePatterns.push({cnv:imgsByPrefixSeries["L"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_LIGT_BR_XS,xs:128,ys:128,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_LIGT_BR});
							};
							if(imgsByPrefixSeries["M"][ser]!==undefined&&imgsByPrefixSeries["M"][ser][seq]!==undefined){
								// lighting mask exists...
								if(!self._IsFullBlackTile(imgsByPrefixSeries["M"][ser][seq],64,64)&&!self._IsFullTransparentTile(imgsByPrefixSeries["M"][ser][seq],64,64))tilePatterns.push({cnv:imgsByPrefixSeries["M"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_LMSK_XS,xs:64,ys:64,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_LMSK});
							};
							if(imgsByPrefixSeries["N"][ser]!==undefined&&imgsByPrefixSeries["N"][ser][seq]!==undefined){
								// shadow mask exists...
								if(!self._IsFullWhiteTile(imgsByPrefixSeries["N"][ser][seq],64,64)&&!self._IsFullTransparentTile(imgsByPrefixSeries["N"][ser][seq],64,64))tilePatterns.push({cnv:imgsByPrefixSeries["N"][ser][seq],oCnv:imgsByPrefixSeries["O"][ser][seq],subIndex:TILE_SMSK_XS,xs:64,ys:64,equalTo:-1,packerNo:-1,infoBits:TILE_INFOBITS_SMSK});
							};
						};
					};
				};
			};
			// add pattern image tiles...
			for(ser=0;ser<imgsByPrefixSeries["P"].length;ser++){
				if(imgsByPrefixSeries["P"][ser]!==undefined){
					for(seq=0;seq<imgsByPrefixSeries["P"][ser].length;seq++){
						u=imgsByPrefixSeries["P"][ser][seq];
						tilePatterns.push({cnv:u,oCnv:u,subIndex:TILE_NORM_XS,xs:u.xs,ys:u.ys,equalTo:-1,packerNo:-1});
					};
				};
			};
			self.eventType=SpriteTools.EVENT_SPRITESCANSTART;
			_callBack(self);

			l=tilePatterns.length;
			// double reduction...
			centerPreSortColors={};
			for(i=0;i<l;i++){
				u=tilePatterns[i];
				v=self._CenterPreSortColor(u.cnv.cnv,u.ys,u.xs,64,64);
				if(!centerPreSortColors.hasOwnProperty(v))centerPreSortColors[v]={};
				centerPreSortColors[v][i]=true;
				tilePatterns[i].cpsc=v;
			};
			
			for(i=0;i<l;i++){
				u=tilePatterns[i];
				if(u.equalTo==-1){
					if(centerPreSortColors.hasOwnProperty(u.cpsc)){
						for(j in centerPreSortColors[u.cpsc]){
							if(j>i){
								v=tilePatterns[j];
								if(v.equalTo==-1){
									if(self._CompareBox(u.cnv.cnv,v.cnv.cnv,u.xs,u.ys,v.xs,v.ys,64,64,(v.cnv.prefix=="O"||u.cnv.prefix=="O"||v.cnv.prefix=="P"||u.cnv.prefix=="P"?_opt.orgCompare:_opt.shdCompare)))v.equalTo=i;
								};
							};
						};
					};
				};
			};
			
			/*-- @<BUILD_ONLY_ON_BUILDS:Never ----
			for(i=0;i<l;i++){
				u=tilePatterns[i];
				if(u.equalTo==-1){
					for(j=i+1;j<l;j++){
						v=tilePatterns[j];
						if(v.equalTo==-1){
							if(self._CompareBox(u.cnv.cnv,v.cnv.cnv,u.xs,u.ys,v.xs,v.ys,64,64,(v.cnv.prefix=="O"||u.cnv.prefix=="O"||v.cnv.prefix=="P"||u.cnv.prefix=="P"?_opt.orgCompare:_opt.shdCompare)))v.equalTo=i;
						};
					};
				};
			};
			---- @>BUILD_ONLY_ON_BUILDS --*/
			
			// binpack image...
			packers=[];
			for(i=0;i<l;i++){
				u=tilePatterns[i];
				if(u.equalTo==-1){
					u.packerNo=packers.length;
					packers.push({w:64,h:64});
				};
			};
			var packres=self._SpriteToolsBitPacker(packers),p,q;
			
			self.eventType=SpriteTools.EVENT_SPRITECOPY;
			_callBack(self);
			self.resImgSrc=document.createElement('canvas');
			self.resImgSrc.width=packres[0];
			self.resImgSrc.height=packres[1];
			self.resImgSrcCtx=self.resImgSrc.getContext("2d");
			self.resImgSrcCtx.imageSmoothingEnabled=false;
			for(i=0;i<l;i++){
				u=tilePatterns[i];
				if(u.equalTo==-1){
					v=u.packerNo;
					self.resImgSrcCtx.drawImage(u.cnv.cnv,u.xs,u.ys,64,64,packers[v].x,packers[v].y,64,64);
				}else{
					v=tilePatterns[u.equalTo].packerNo;
				};
				switch(u.cnv.prefix){
					case"O":
						u.cnv.tile[u.subIndex]=packers[v].x;
						u.cnv.tile[u.subIndex+1]=packers[v].y;
						break;
					case"P":
						u.oCnv.tile[u.subIndex]=packers[v].x;
						u.oCnv.tile[u.subIndex+1]=packers[v].y;
						break;
					case"S":
						u.oCnv.tile[TILE_INFOBITS]|=u.infoBits;
						u.oCnv.tile[u.subIndex]=packers[v].x;
						u.oCnv.tile[u.subIndex+1]=packers[v].y;
						break;
					case"L":
						u.oCnv.tile[TILE_INFOBITS]|=u.infoBits;
						u.oCnv.tile[u.subIndex]=packers[v].x;
						u.oCnv.tile[u.subIndex+1]=packers[v].y;
						break;
					case"M":
						u.oCnv.tile[TILE_INFOBITS]|=u.infoBits;
						u.oCnv.tile[u.subIndex]=packers[v].x;
						u.oCnv.tile[u.subIndex+1]=packers[v].y;
						break;
					case"N":
						u.oCnv.tile[TILE_INFOBITS]|=u.infoBits;
						u.oCnv.tile[u.subIndex]=packers[v].x;
						u.oCnv.tile[u.subIndex+1]=packers[v].y;
						break;
				};
			};
			
			tiles={info:{scaleWithQuality:true,imgData:""},series:{},tiles:[]};
			for(ser=0;ser<imgsByPrefixSeries["P"].length;ser++){
				if(imgsByPrefixSeries["P"][ser]!==undefined)imgsByPrefixSeries["O"][ser]=imgsByPrefixSeries["P"][ser];
			};
			for(ser=0;ser<imgsByPrefixSeries["O"].length;ser++){
				if(imgsByPrefixSeries["O"][ser]!==undefined){
					tiles.series[seriesNames[ser]]=tiles.tiles.length;
					for(seq=0;seq<imgsByPrefixSeries["O"][ser].length;seq++){
						if(imgsByPrefixSeries["O"][ser][seq]!==undefined)tiles.tiles.push(imgsByPrefixSeries["O"][ser][seq].tile);
					};
				};
			};
			
			if(true){
				self.eventType=SpriteTools.EVENT_READY;
				self.result={imgDataURL:self.resImgSrc.toDataURL("image/png"),tiles:tiles};
				//OxydLog.Html("<image src=\""+self.result.imgDataURL+"\">");
				_callBack(self);
			}else{
				self.eventType=SpriteTools.EVENT_ERROR_RESULTIMAGETOBIG;
				_callBack(self);
			};
		};
	});
};

// SpriteTools.CreateClassicsShadowImage
SpriteTools.prototype.CreateClassicsShadowImage=function(_callback){
var shadowImgNone=new Image(),shadowImgSolid=new Image(),shadowImgHover=new Image(),shadowImgFuture=new Image();
	shadowImgFuture.onload=function(){
	var rescanvas=document.createElement('canvas'),resctxt;
	var finalrescanvas=document.createElement('canvas'),finalresctxt;
	var imgs=[shadowImgNone,shadowImgSolid,shadowImgHover,shadowImgFuture];
	var lefttop,top,left,self,no,ni=0,x,y,p,idata,data=0,info=[];
	var ret=new Image();
		rescanvas.width=32*256;
		rescanvas.height=32;
		resctxt=rescanvas.getContext('2d');
		resctxt.imageSmoothingEnabled=false;
		for(lefttop=OXSTONESHADOW_NONE;lefttop<=OXSTONESHADOW_FUTURE;lefttop++){
			for(top=OXSTONESHADOW_NONE;top<=OXSTONESHADOW_FUTURE;top++){
				for(left=OXSTONESHADOW_NONE;left<=OXSTONESHADOW_FUTURE;left++){
					for(self=OXSTONESHADOW_NONE;self<=OXSTONESHADOW_FUTURE;self++){
						no=self|left<<2|top<<4|lefttop<<6;
						resctxt.drawImage(imgs[lefttop],32,32,32,32,ni*32,0,32,32);
						resctxt.drawImage(imgs[top],0,32,32,32,ni*32,0,32,32);
						resctxt.drawImage(imgs[left],32,0,32,32,ni*32,0,32,32);
						resctxt.drawImage(imgs[self],0,0,32,32,ni*32,0,32,32);
						data=0;
						idata=resctxt.getImageData(ni*32,0,32,32);
						for(x=0;x<32;x++)for(y=0;y<32;y++){
							p=y*32*4+x*4;
							data+=idata.data[p+0]+idata.data[p+1]+idata.data[p+2]+idata.data[p+3];
						};
						if(data!=0){
							info[no]=ni*32;
							ni++;
						}else{
							info[no]=-1;
						};
					};
				};
			};
		};
		ret.src=rescanvas.toDataURL("image/png");
		finalrescanvas.width=32*ni;
		finalrescanvas.height=32;
		finalresctxt=finalrescanvas.getContext('2d');
		finalresctxt.imageSmoothingEnabled=false;
		finalresctxt.drawImage(ret,0,0,32*ni,32,0,0,32*ni,32);
		ret.src=finalrescanvas.toDataURL("image/png");
		log(info);
		_callback(ret,info);
	};
	shadowImgNone.src="./dev/drafts/shadowtemplates2d/shadow_templay_none.png";
	shadowImgSolid.src="./dev/drafts/shadowtemplates2d/shadow_templay_solid.png";
	shadowImgHover.src="./dev/drafts/shadowtemplates2d/shadow_templay_hover.png";
	shadowImgFuture.src="./dev/drafts/shadowtemplates2d/shadow_templay_future.png";
};

// SpriteTools.ClassicsSpritesMaskCorrections
// the original mask images has white masks for tiles which are fully used as mask, this function fills this parts with black color...
SpriteTools.prototype.ClassicsSpritesMaskCorrections=function(_callback){
var org=new Image(),msk=new Image();
	msk.onload=function(){
	var rescanvas=document.createElement('canvas'),resctxt;
	var ret=new Image(),x,y,xx,yy,data,idata,p;
		rescanvas.width=640;
		rescanvas.height=800;
		resctxt=rescanvas.getContext('2d');
		resctxt.imageSmoothingEnabled=false;
		resctxt.drawImage(msk,0,0);
		resctxt.fillStyle="#000000"
		for(x=0;x<20;x++){
			for(y=0;y<20;y++){
				data=0;
				idata=resctxt.getImageData(x<<5,y<<5,32,32);
				for(xx=0;xx<32;xx++){
					for(yy=0;yy<32;yy++){
						p=yy*32*4+xx*4;
						data+=idata.data[p+0]+idata.data[p+1]+idata.data[p+2]+idata.data[p+3];
					};
				};
				log(data);
				if(data==(32*32*4*255))resctxt.fillRect(x<<5,y<<5,32,32); 
			};
		};
		ret.src=rescanvas.toDataURL("image/png");
		_callback(ret);
	};
	msk.src="./dev/testdata/classicmasksprites.png";
	//org.src="./dev/testdata/classicsprites.png";
};

// SpriteTools.MakeURLArray
SpriteTools.prototype.MakeURLArray=function(_baseURL,_name,_maxFrameNo,_opt){
var ret=[],f;
var optDef={orgPrefix:"",mskPrefix:"A_",shdPrefix:"S_",doShd:true,digitCount:4,suffix:"png"}
	if(_opt===undefined)_opt=optDef;
	if(ObjIsEmpty(_opt))_opt=optDef;
	_opt=Object.assign(optDef,_opt);
	for(f=0;f<=_maxFrameNo;f++)ret.push(_baseURL+"/"+_opt.mskPrefix+_name+f.PreZero(_opt.digitCount)+"."+_opt.suffix);
	for(f=0;f<=_maxFrameNo;f++)ret.push(_baseURL+"/"+_opt.orgPrefix+_name+f.PreZero(_opt.digitCount)+"."+_opt.suffix);
	if(_opt.doShd)for(f=0;f<=_maxFrameNo;f++)ret.push(_baseURL+"/"+_opt.shdPrefix+_name+f.PreZero(_opt.digitCount)+"."+_opt.suffix);
	return ret;
};


SpriteTools.prototype.CreateTileSpriteTexture=function(_layerTexture,_imgNoStart=0,_tiles,_sprites,_tileRscs,_spriteRscs,_unusedSeries,_opts){
// example for reduce: reduceResourcesSeriesExceptOf:{tiles:{"NGPlayerMarbleActors.tiles.png":["PlayerMarble<colorName/>.*"]},sprites:{"NGPlayerMarbleActors.sprites.png":["PlayerMarble<colorName/>.*"]}},
var ret={imgData:{},tiles:{series:{},tiles:[]},sprites:{series:{},sprites:[]}},packers=[],t,s,n,ts,tt,ss,no;
var patterns=[],p,q,r,l,u,v,w,k,scale=1,halfTile=32,rxp,useRegExps,useSeries,seriesToDelete,seriesFound,nextSeries;
var optDef={orgCompare:0,shdCompare:0,dblReduction:true,doRetina:true};
var tileRscs,spriteRscs,cpsc,spriteTileSplitDone=false;
var data,w,i,doublePreGroups=[],ok,imgNo=_imgNoStart,imgStartPacker,maxSize,tileSize;
var doUnitTest=false,uTestTilesInfo=[],uTestSpritesInfo=[];
var newTileSprites=false,layerImgIndexTiles=TILE_NORM_IMGNO,layerImgIndexSprites=SPRITE_NORM_IMGNO,nop,imgSizes={},retCnv={};
	if(_tiles==null||_sprites==null)newTileSprites=true;
	
	if(_opts===undefined)_opts=optDef;
	if(ObjIsEmpty(_opts))_opts=optDef;
	if(!_opts.hasOwnProperty('orgCompare'))_opts.orgCompare=0;
	if(!_opts.hasOwnProperty('shdCompare'))_opts.shdCompare=0;
	if(!_opts.hasOwnProperty('dblReduction'))_opts.dblReduction=true;
	if(!_opts.hasOwnProperty('doRetina'))_opts.doRetina=true;
	if(!_opts.hasOwnProperty('maxSize'))_opts.maxSize=2048;
	if(!_opts.hasOwnProperty('spriteTileSplit'))_opts.spriteTileSplit=true;
	if(!_opts.hasOwnProperty('tileRaster'))_opts.tileRaster=true;
	if(!_opts.hasOwnProperty('spriteRaster'))_opts.spriteRaster=false;
	if(!_opts.hasOwnProperty('squareTexture'))_opts.squareTexture=true;
	if(!_opts.hasOwnProperty('fullTextures'))_opts.fullTextures=[128,256,1024,2048,4096];
	if(!_opts.hasOwnProperty('sameSize'))_opts.sameSize=true;
	if(!_opts.hasOwnProperty('layerSeparationTextures'))_opts.layerSeparationTextures=true;

	if(_opts.layerSeparationTextures){
		if(_layerTexture==LAYERTEXURES_FLR||_layerTexture==LAYERTEXURES_THG||_layerTexture==LAYERTEXURES_STO||_layerTexture==LAYERTEXURES_INV||_layerTexture==LAYERTEXURES_ACT||_layerTexture==LAYERTEXURES_EFX||_layerTexture==LAYERTEXURES_IVS){
			layerImgIndexTiles=TILE_NORM_IMGNO;
			layerImgIndexSprites=SPRITE_NORM_IMGNO;
		}else if(_layerTexture==LAYERTEXURES_TSHDW||_layerTexture==LAYERTEXURES_SSHDW){
			layerImgIndexTiles=TILE_SHDW_IMGNO;
			layerImgIndexSprites=SPRITE_SHDW_IMGNO;
		}else if(_layerTexture==LAYERTEXURES_TLIGT||_layerTexture==LAYERTEXURES_SLIGT){
			layerImgIndexTiles=TILE_LIGT_IMGNO;
			layerImgIndexSprites=SPRITE_LIGT_IMGNO;
		};
	};

	
	function _DefUnitTileTest(_no,_subIndex){
		if(!uTestTilesInfo.hasOwnProperty(_no))uTestTilesInfo[_no]={subIndices:{}};
		uTestTilesInfo[_no][_subIndex]={imgNo:-1};
	};
	
	function _DefUnitSpriteTest(_no,_subIndex){
		if(!uTestSpritesInfo.hasOwnProperty(_no))uTestSpritesInfo[_no]={subIndices:{}};
		uTestSpritesInfo[_no][_subIndex]={imgNo:-1};
	};
	
	_opts=Object.assign(optDef,_opts);
	scale=_opts.doRetina?1:2;
	halfTile=_opts.doRetina?32:16;
	tileSize=_opts.doRetina?64:32;
	maxSize=_opts.maxSize;
	
	spriteRscs=ObjCopySimple(_spriteRscs);
	for(s in spriteRscs)spriteRscs[s].img=_spriteRscs[s].img;
	tileRscs=ObjCopySimple(_tileRscs);
	for(t in tileRscs)tileRscs[t].img=_tileRscs[t].img;
	
	for(i=0;i<256;i++)doublePreGroups[i]=[];
	// collect all tiles, create patterns and create canvases for images...
	
	no=0;
	if(!newTileSprites)ret.tiles=_tiles;
	for(t in tileRscs){
		equals={};
		ts=tileRscs[t];
		ts.img.cnv=document.createElement('canvas');
		ts.img.cnv.width=ts.img.width;
		ts.img.cnv.height=ts.img.height;
		ts.img.cnv.isTile=true;
		ts.img.ctx=ts.img.cnv.getContext("2d");
		ts.img.ctx.drawImage(ts.img,0,0);
		w=ts.img.width;
		data=ts.img.ctx.getImageData(0,0,ts.img.width,ts.img.height).data;
		if(_unusedSeries!=null){
			seriesToDelete={};
			for(series in ts.series){
				useSeries=!_unusedSeries.tiles.hasOwnProperty(series);
				if(!useSeries){
					seriesToDelete[series]=true;
					ts.tiles.splice(ts.series[series],_unusedSeries.tiles[series]);
					seriesFound=false;
					// series index start corrections...
					for(nextSeries in ts.series){
						if(!seriesFound)if(nextSeries==series)seriesFound=true;
						if(seriesFound)ts.series[nextSeries]-=_unusedSeries.tiles[series];
					};
				};
			};
			for(series in seriesToDelete)delete ts.series[series];
		};
		for(series in ts.series)ret.tiles.series[series]=no+ts.series[series];

		for(n=0;n<ts.tiles.length;n++){
			nop=no;
			no++;
			if(newTileSprites){
				ts.tiles[n][TILE_NORM_IMGNO]=-1;
				ts.tiles[n][TILE_SHDW_IMGNO]=-1;
				ts.tiles[n][TILE_LIGT_IMGNO]=-1;
				p=ts.tiles[n];
				ret.tiles.tiles.push(p);
			}else{
				p=ts.tiles[n];
			};
			if(!_opts.layerSeparationTextures||
					(_layerTexture==LAYERTEXURES_FLR&&(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_LAYER_FLR)!=0)||
					(_layerTexture==LAYERTEXURES_THG&&(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_LAYER_THG)!=0)||
					(_layerTexture==LAYERTEXURES_STO&&(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_LAYER_STO)!=0)||
					(_layerTexture==LAYERTEXURES_INV&&(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_LAYER_INV)!=0)){
				if(ts.tiles[n][TILE_SHAD_ID]==TILE_SHAD_ID_NORMAL){
					i=(p[TILE_NORM_XS]/scale+halfTile+((p[TILE_NORM_YS]/scale)+halfTile)*w)*4;
					cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
					if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
					doublePreGroups[cpsc][patterns.length]=true;
					if(doUnitTest)_DefUnitTileTest(nop,TILE_NORM_XS);
					patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_NORM_XS,isShdwOrLigt:false,xs:p[TILE_NORM_XS]/scale,ys:p[TILE_NORM_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
				};
			};
			if(ts.tiles[n][TILE_SHAD_ID]==TILE_SHAD_ID_NORMAL){
				if(!_opts.layerSeparationTextures||_layerTexture==LAYERTEXURES_TSHDW){
					if(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_SHDW_SELF){
						i=(p[TILE_SHDW_XS]/scale+halfTile+((p[TILE_SHDW_YS]/scale)+halfTile)*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitTileTest(nop,TILE_SHDW_XS);
						patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_SHDW_XS,isShdwOrLigt:true,xs:p[TILE_SHDW_XS]/scale,ys:p[TILE_SHDW_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
					};
					if(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_SHDW_R){
						i=(p[TILE_SHDW_R_XS]/scale+halfTile+((p[TILE_SHDW_R_YS]/scale)+halfTile)*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitTileTest(nop,TILE_SHDW_R_XS);
						patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_SHDW_R_XS,isShdwOrLigt:true,xs:p[TILE_SHDW_R_XS]/scale,ys:p[TILE_SHDW_R_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
					};
					if(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_SHDW_B){
						i=(p[TILE_SHDW_B_XS]/scale+halfTile+((p[TILE_SHDW_B_YS]/scale)+halfTile)*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitTileTest(nop,TILE_SHDW_B_XS);
						patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_SHDW_B_XS,isShdwOrLigt:true,xs:p[TILE_SHDW_B_XS]/scale,ys:p[TILE_SHDW_B_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
					};
					if(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_SHDW_BR){
						i=(p[TILE_SHDW_BR_XS]/scale+halfTile+((p[TILE_SHDW_BR_YS]/scale)+halfTile)*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitTileTest(nop,TILE_SHDW_BR_XS);
						patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_SHDW_BR_XS,isShdwOrLigt:true,xs:p[TILE_SHDW_BR_XS]/scale,ys:p[TILE_SHDW_BR_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
					};
				};
				if(!_opts.layerSeparationTextures||_layerTexture==LAYERTEXURES_TLIGT){
					if(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_LIGT_TL){
						i=(p[TILE_LIGT_TL_XS]/scale+halfTile+((p[TILE_LIGT_TL_YS]/scale)+halfTile)*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitTileTest(nop,TILE_LIGT_TL_XS);
						patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_LIGT_TL_XS,isShdwOrLigt:true,xs:p[TILE_LIGT_TL_XS]/scale,ys:p[TILE_LIGT_TL_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
					};
					if(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_LIGT_T){
						i=(p[TILE_LIGT_T_XS]/scale+halfTile+((p[TILE_LIGT_T_YS]/scale)+halfTile)*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitTileTest(nop,TILE_LIGT_T_XS);
						patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_LIGT_T_XS,isShdwOrLigt:true,xs:p[TILE_LIGT_T_XS]/scale,ys:p[TILE_LIGT_T_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
					};
					if(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_LIGT_TR){
						i=(p[TILE_LIGT_TR_XS]/scale+halfTile+((p[TILE_LIGT_TR_YS]/scale)+halfTile)*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitTileTest(nop,TILE_LIGT_TR_XS);
						patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_LIGT_TR_XS,isShdwOrLigt:true,xs:p[TILE_LIGT_TR_XS]/scale,ys:p[TILE_LIGT_TR_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
					};
					if(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_LIGT_L){
						i=(p[TILE_LIGT_L_XS]/scale+halfTile+((p[TILE_LIGT_L_YS]/scale)+halfTile)*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitTileTest(nop,TILE_LIGT_L_XS);
						patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_LIGT_L_XS,isShdwOrLigt:true,xs:p[TILE_LIGT_L_XS]/scale,ys:p[TILE_LIGT_L_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
					};
					if(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_LIGT_SELF){
						i=(p[TILE_LIGT_XS]/scale+halfTile+((p[TILE_LIGT_YS]/scale)+halfTile)*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitTileTest(nop,TILE_LIGT_XS);
						patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_LIGT_XS,isShdwOrLigt:true,xs:p[TILE_LIGT_XS]/scale,ys:p[TILE_LIGT_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
					};
					if(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_LIGT_R){
						i=(p[TILE_LIGT_R_XS]/scale+halfTile+((p[TILE_LIGT_R_YS]/scale)+halfTile)*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitTileTest(nop,TILE_LIGT_R_XS);
						patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_LIGT_R_XS,isShdwOrLigt:true,xs:p[TILE_LIGT_R_XS]/scale,ys:p[TILE_LIGT_R_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
					};
					if(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_LIGT_BL){
						i=(p[TILE_LIGT_BL_XS]/scale+halfTile+((p[TILE_LIGT_BL_YS]/scale)+halfTile)*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitTileTest(nop,TILE_LIGT_BL_XS);
						patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_LIGT_BL_XS,isShdwOrLigt:true,xs:p[TILE_LIGT_BL_XS]/scale,ys:p[TILE_LIGT_BL_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
					};
					if(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_LIGT_B){
						i=(p[TILE_LIGT_B_XS]/scale+halfTile+((p[TILE_LIGT_B_YS]/scale)+halfTile)*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitTileTest(nop,TILE_LIGT_B_XS);
						patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_LIGT_B_XS,isShdwOrLigt:true,xs:p[TILE_LIGT_B_XS]/scale,ys:p[TILE_LIGT_B_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
					};
					if(ts.tiles[n][TILE_INFOBITS]&TILE_INFOBITS_LIGT_BR){
						i=(p[TILE_LIGT_BR_XS]/scale+halfTile+((p[TILE_LIGT_BR_YS]/scale)+halfTile)*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitTileTest(nop,TILE_LIGT_BR_XS);
						patterns.push({isTile:true,cpsc:cpsc,img:ts.img,no:nop,subIndex:TILE_LIGT_BR_XS,isShdwOrLigt:true,xs:p[TILE_LIGT_BR_XS]/scale,ys:p[TILE_LIGT_BR_YS]/scale,w:64/scale,h:64/scale,equalTo:-1,packerNo:-1});
					};
				};
			};
		};
	};
	
	// collect all sprites and create canvases for images...
	no=0;
	if(!newTileSprites)ret.sprites=_sprites;
	for(s in spriteRscs){
		equals={};
		ss=spriteRscs[s];
		ss.img.cnv=document.createElement('canvas');
		ss.img.cnv.width=ss.img.width;
		ss.img.cnv.height=ss.img.height;
		ss.img.cnv.isTile=false;
		ss.img.cnv.getContext("2d").drawImage(ss.img,0,0);
		if(_unusedSeries!=null){
			seriesToDelete={};
			for(series in ss.series){
				useSeries=!_unusedSeries.sprites.hasOwnProperty(series);
				if(!useSeries){
					seriesToDelete[series]=true;
					ss.sprites.splice(ss.series[series],_unusedSeries.sprites[series]);
					seriesFound=false;
					// series index start corrections...
					for(nextSeries in ss.series){
						if(!seriesFound)if(nextSeries==series)seriesFound=true;
						if(seriesFound)ss.series[nextSeries]-=_unusedSeries.sprites[series];
					};
				};
			};
			//log("seriesToDelete:",seriesToDelete,seriesCounts);
			for(series in seriesToDelete)delete ss.series[series];
		};
		for(series in ss.series)ret.sprites.series[series]=no+ss.series[series];
		for(n=0;n<ss.sprites.length;n++){
			nop=no;
			no++;
			if(newTileSprites){
				ss.sprites[n][SPRITE_NORM_IMGNO]=-1;
				ss.sprites[n][SPRITE_SHDW_IMGNO]=-1;
				ss.sprites[n][SPRITE_LIGT_IMGNO]=-1;
				p=ss.sprites[n];
				ret.sprites.sprites.push(p);
			}else{
				p=ss.sprites[n];
			};
			if(p[SPRITE_NORM_W]>0&&p[SPRITE_NORM_H]>0){
				if(!_opts.layerSeparationTextures||
					(_layerTexture==LAYERTEXURES_ACT&&(ss.sprites[n][SPRITE_INFOBITS]&SPRITE_INFOBITS_LAYER_ACT)!=0)||
					(_layerTexture==LAYERTEXURES_EFX&&(ss.sprites[n][SPRITE_INFOBITS]&SPRITE_INFOBITS_LAYER_EFX)!=0)||
					(_layerTexture==LAYERTEXURES_IVS&&(ss.sprites[n][SPRITE_INFOBITS]&SPRITE_INFOBITS_LAYER_IVS)!=0)){
						i=(p[SPRITE_NORM_XS]/scale+Math.floor(p[SPRITE_NORM_W]/scale/2)+((p[SPRITE_NORM_YS]/scale)+Math.floor(p[SPRITE_NORM_H]/scale/2))*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitSpriteTest(nop,SPRITE_NORM_XS);
						patterns.push({isTile:false,cpsc:cpsc,img:ss.img,no:nop,subIndex:SPRITE_NORM_XS,isShdwOrLigt:false,xs:p[SPRITE_NORM_XS]/scale,ys:p[SPRITE_NORM_YS]/scale,w:Math.ceil(p[SPRITE_NORM_W]/scale),h:Math.ceil(p[SPRITE_NORM_H]/scale),xo:Math.ceil(p[SPRITE_NORM_XO]/scale),yo:Math.ceil(p[SPRITE_NORM_YO]/scale),equalTo:-1,packerNo:-1});
				};
				if(!_opts.layerSeparationTextures||_layerTexture==LAYERTEXURES_SSHDW){
					if(ss.sprites[n][SPRITE_INFOBITS]&SPRITE_INFOBITS_SHDW){
						i=(p[SPRITE_SHDW_XS]/scale+Math.floor(p[SPRITE_SHDW_W]/scale/2)+((p[SPRITE_SHDW_YS]/scale)+Math.floor(p[SPRITE_SHDW_H]/scale/2))*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitSpriteTest(nop,SPRITE_SHDW_XS);
						patterns.push({isTile:false,cpsc:cpsc,img:ss.img,no:nop,subIndex:SPRITE_SHDW_XS,isShdwOrLigt:true,xs:p[SPRITE_SHDW_XS]/scale,ys:p[SPRITE_SHDW_YS]/scale,w:Math.ceil(p[SPRITE_SHDW_W]/scale),h:Math.ceil(p[SPRITE_SHDW_H]/scale),xo:Math.ceil(p[SPRITE_SHDW_XO]/scale),yo:Math.ceil(p[SPRITE_SHDW_YO]/scale),equalTo:-1,packerNo:-1});
					};
				};
				if(!_opts.layerSeparationTextures||_layerTexture==LAYERTEXURES_SLIGT){
					if(ss.sprites[n][SPRITE_INFOBITS]&SPRITE_INFOBITS_LIGT){
						i=(p[SPRITE_LIGT_XS]/scale+Math.floor(p[SPRITE_LIGT_YS]/scale/2)+((p[SPRITE_LIGT_W]/scale)+Math.floor(p[SPRITE_LIGT_W]/scale/2))*w)*4;
						cpsc=data[i+3]<<24|data[i+2]|data[i+1]<<8|data[i]<<16;
						if(!doublePreGroups.hasOwnProperty(cpsc))doublePreGroups[cpsc]={};
						doublePreGroups[cpsc][patterns.length]=true;
						if(doUnitTest)_DefUnitSpriteTest(nop,SPRITE_LIGT_XS);
						patterns.push({isTile:false,cpsc:cpsc,img:ss.img,no:nop,subIndex:SPRITE_LIGT_XS,isShdwOrLigt:true,xs:p[SPRITE_LIGT_XS]/scale,ys:p[SPRITE_LIGT_YS]/scale,w:Math.ceil(p[SPRITE_LIGT_W]/scale),h:Math.ceil(p[SPRITE_LIGT_H]/scale),xo:Math.ceil(p[SPRITE_LIGT_XO]/scale),yo:Math.ceil(p[SPRITE_LIGT_YO]/scale),equalTo:-1,packerNo:-1});
					};
				};
			};
		};
	};	
	
	if(_opts.dblReduction){
		l=patterns.length;
		for(p=0;p<l;p++){
			u=patterns[p];
			if(u.equalTo==-1){
				if(doublePreGroups.hasOwnProperty(u.cpsc)){
					for(q in doublePreGroups[u.cpsc]){
						if(q>p){
							v=patterns[q];
							if(v.equalTo==-1){
								if(u.w==v.w&&u.h==v.h&&u.isShdwOrLigt==v.isShdwOrLigt)if(this._CompareBox(u.img.cnv,v.img.cnv,u.xs,u.ys,v.xs,v.ys,u.w,u.h,(v.isShdwOrLigt||u.isShdwOrLigt?_opts.shdCompare:_opts.orgCompare))){
									v.equalTo=p;
									for(r=0;r<l;r++){
										if(patterns[r].equalTo==q)patterns[r].equalTo=p;
									};
								};
							};
						};
					};
				};
			};
		};
	};
	
	imgStartPacker=0;
	while(!ok){
		
		// equalTo corrections...
		l=patterns.length;
		for(p=0;p<l;p++){
			if(p>=imgStartPacker){
				u=patterns[p];
				if(u.equalTo!=-1){
					if(u.equalTo<imgStartPacker){
						v=u.equalTo;
						u.equalTo=-1;
						for(r=p+1;r<l;r++){
							if(r>=imgStartPacker){
								if(patterns[r].equalTo==v){
									patterns[r].equalTo=p;
								};
							};
						};
					};
				};
			};
		};
		
		// currently no double reducement...
		//l=patterns.length;
		//for(p=0;p<l;p++){
		//	patterns[p].equalTo=-1;
		//};
		
		// set up bit packer...
		l=patterns.length;
		packers=[];
		for(p=0;p<l;p++){
			patterns[p].packerNo=-1;
			if(p>=imgStartPacker){
				u=patterns[p];
				if(u.equalTo==-1){
					u.packerNo=packers.length;
					if(_opts.spriteRaster&&!u.isTile){
						packers.push({w:Math.ceil(u.w/tileSize)*tileSize,h:Math.ceil(u.h/tileSize)*tileSize});
					}else{
						packers.push({w:u.w,h:u.h});
					};
				};
			};
		};
		
		// create tiles and sprites data, create global texture image...
		var packres,noUsed,wasUsed;
		packres=this._SpriteToolsBitPackerStrictSquare(packers,maxSize);
		noUsed={};
		wasUsed=true;
		// ...easy way: if one pattern not fit, stop patterns above... not optimized but works...
		l=patterns.length;
		for(p=0;p<l;p++){
			u=patterns[p];
			if(!wasUsed){
				noUsed[u.no+(u.isTile?0:100000)]=true;
			}else if(p>=imgStartPacker){
				v=u.packerNo;
				if(u.equalTo!=-1)v=patterns[u.equalTo].packerNo;
				if(v>=0){
					if(u.equalTo==-1){
						if(packers[u.packerNo].fit&&wasUsed){
						}else{
							wasUsed=false;
							noUsed[u.no+(u.isTile?0:100000)]=true;
						};
					}else{
						v=patterns[u.equalTo];
						if(packers[v.packerNo].fit&&wasUsed){
							//if(noUsed[u.no+(u.isTile?0:100000)])
						}else{
							wasUsed=false;
							//noUsed[v.no+(v.isTile?0:100000)]=true;
							noUsed[u.no+(u.isTile?0:100000)]=true;
						};
					};
				}else{
					if(u.equalTo==-1)noUsed[u.no+(u.isTile?0:100000)]=true;
				};
			};
		};
	
		wasUsed=false;
		for(p=0;p<l;p++){
			u=patterns[p];
			if(wasUsed){
				u.packerNo=-1;
			}else{
				if(noUsed[u.no+(u.isTile?0:100000)]){
					u.packerNo=-1;
					wasUsed=true;
				}else{
					//if(p>=imgStartPacker)log("==",u.no);
				};
			};
		};
		//log("noUsed",ObjCopySimple(noUsed));
	
		// split tile and sprite textures...
		if(_opts.spriteTileSplit&&!spriteTileSplitDone){
			// not implemented: special case: if sprite patterns are equal to tile patterns...
			wasUsed=false;
			for(p=0;p<l;p++){
				u=patterns[p];
				if(u.packerNo!=-1){if(u.isTile)wasUsed=true;break;};
			};
			if(wasUsed){
				for(p=0;p<l;p++){
					u=patterns[p];
					if(!u.isTile)u.packerNo=-1;
				};
			}else{
				spriteTileSplitDone=true;
			};		
		};
		
	
		var oldpackers=ObjCopy(packers);
		var oldpackres=packres;
		packers=[];
		l=patterns.length;
		for(p=0;p<l;p++){
			u=patterns[p];
			if(u.packerNo!=-1){
				packers.push(oldpackers[u.packerNo]);
				u.packerNo=packers.length-1;
				if(p>=imgStartPacker)imgStartPacker=p+1;
			};
		};
		if(imgStartPacker<l){
			for(p=imgStartPacker;p<l;p++){
				if(patterns[p].equalTo!=-1){
					imgStartPacker=p+1;
				}else{
					break;
				};
			};
		};
		
		packres=this._SpriteToolsBitPacker(packers,true);
		if(packres[0]>maxSize||packres[1]>maxSize){
			packres=oldpackres;
			packers=oldpackers;
		};
		if(_opts.tileRaster){
			packres[0]=Math.ceil(packres[0]/tileSize)*tileSize
			packres[1]=Math.ceil(packres[1]/tileSize)*tileSize
		};
		if(_opts.squareTexture){
			if(packres[0]>packres[1])packres[1]=packres[0];
			if(packres[1]>packres[0])packres[0]=packres[1];
		};
	
		var imgCnv=document.createElement('canvas');
		if(_opts.fullTextures.length>0){
			for(var ft=0;ft<_opts.fullTextures.length;ft++){
				if(packres[0]<=_opts.fullTextures[ft]&&packres[1]<=_opts.fullTextures[ft]){
					imgCnv.width=_opts.fullTextures[ft];
					imgCnv.height=_opts.fullTextures[ft];
					break;
				};
			};
		}else{
			imgCnv.width=packres[0];
			imgCnv.height=packres[1];
		};
		imgSizes[imgNo]=[imgCnv.width,imgCnv.height];
		var imgCnvCtx=imgCnv.getContext("2d");
		l=patterns.length;
		for(p=0;p<l;p++){
			u=patterns[p];
			v=u.packerNo;
			if(u.equalTo!=-1)v=patterns[u.equalTo].packerNo;
			if(v>=0){
				//if(p>=imgStartPacker)imgStartPacker=p+1;
				if(u.equalTo==-1){
					v=u.packerNo;
					imgCnvCtx.drawImage(u.img,u.xs,u.ys,u.w,u.h,packers[v].x,packers[v].y,u.w,u.h);
				}else{
					v=patterns[u.equalTo].packerNo;
				};

				//log("no:",u.no);
				if(u.isTile){
					switch(u.subIndex){
						case TILE_NORM_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							//if(_layerTexture==LAYERTEXURES_FLR)log("AA:",u.no,imgNo);
							break;
						case TILE_SHDW_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][TILE_INFOBITS]|=TILE_INFOBITS_SHDW_SELF;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							break;
						case TILE_SHDW_R_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][TILE_INFOBITS]|=TILE_INFOBITS_SHDW_R;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							break;
						case TILE_SHDW_B_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][TILE_INFOBITS]|=TILE_INFOBITS_SHDW_B;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							break;
						case TILE_SHDW_BR_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][TILE_INFOBITS]|=TILE_INFOBITS_SHDW_BR;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							break;
						case TILE_LIGT_TL_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][TILE_INFOBITS]|=TILE_INFOBITS_LIGT_TL;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							break;
						case TILE_LIGT_T_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][TILE_INFOBITS]|=TILE_INFOBITS_LIGT_T;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							break;
						case TILE_LIGT_TR_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][TILE_INFOBITS]|=TILE_INFOBITS_LIGT_TR;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							break;
						case TILE_LIGT_L_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][TILE_INFOBITS]|=TILE_INFOBITS_LIGT_L;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							break;
						case TILE_LIGT_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][TILE_INFOBITS]|=TILE_INFOBITS_LIGT_SELF;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							break;
						case TILE_LIGT_R_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][TILE_INFOBITS]|=TILE_INFOBITS_LIGT_R;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							break;
						case TILE_LIGT_BL_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][TILE_INFOBITS]|=TILE_INFOBITS_LIGT_BL;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							break;
						case TILE_LIGT_B_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][TILE_INFOBITS]|=TILE_INFOBITS_LIGT_B;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							break;
						case TILE_LIGT_BR_XS:
							if(doUnitTest)uTestTilesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.tiles.tiles[u.no][TILE_INFOBITS]|=TILE_INFOBITS_LIGT_BR;
							ret.tiles.tiles[u.no][u.subIndex]=packers[v].x;
							ret.tiles.tiles[u.no][u.subIndex+1]=packers[v].y;
							ret.tiles.tiles[u.no][layerImgIndexTiles]=imgNo;
							break;
					};
				}else{
					//log(u.no,u.equalTo,v,packers.length);
					//log("layerImgIndexSprites",layerImgIndexSprites,_layerTexture);
					switch(u.subIndex){
						case SPRITE_NORM_XS:
							if(doUnitTest)uTestSpritesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.sprites.sprites[u.no][u.subIndex]=packers[v].x;
							ret.sprites.sprites[u.no][u.subIndex+1]=packers[v].y;
							ret.sprites.sprites[u.no][u.subIndex+2]=u.w;
							ret.sprites.sprites[u.no][u.subIndex+3]=u.h;
							ret.sprites.sprites[u.no][u.subIndex+4]=u.xo;
							ret.sprites.sprites[u.no][u.subIndex+5]=u.yo;
							ret.sprites.sprites[u.no][layerImgIndexSprites]=imgNo;
							break;
						case SPRITE_SHDW_XS:
							if(doUnitTest)uTestSpritesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.sprites.sprites[u.no][SPRITE_INFOBITS]|=SPRITE_INFOBITS_SHDW;
							ret.sprites.sprites[u.no][u.subIndex]=packers[v].x;
							ret.sprites.sprites[u.no][u.subIndex+1]=packers[v].y;
							ret.sprites.sprites[u.no][u.subIndex+2]=u.w;
							ret.sprites.sprites[u.no][u.subIndex+3]=u.h;
							ret.sprites.sprites[u.no][u.subIndex+4]=u.xo;
							ret.sprites.sprites[u.no][u.subIndex+5]=u.yo;
							ret.sprites.sprites[u.no][layerImgIndexSprites]=imgNo;
							break;
						case SPRITE_LIGT_XS:
							if(doUnitTest)uTestSpritesInfo[u.no][u.subIndex].imgNo=imgNo;
							ret.sprites.sprites[u.no][SPRITE_INFOBITS]|=SPRITE_INFOBITS_LIGT;
							ret.sprites.sprites[u.no][u.subIndex]=packers[v].x;
							ret.sprites.sprites[u.no][u.subIndex+1]=packers[v].y;
							ret.sprites.sprites[u.no][u.subIndex+2]=u.w;
							ret.sprites.sprites[u.no][u.subIndex+3]=u.h;
							ret.sprites.sprites[u.no][u.subIndex+4]=u.xo;
							ret.sprites.sprites[u.no][u.subIndex+5]=u.yo;
							ret.sprites.sprites[u.no][layerImgIndexSprites]=imgNo;
							break;
					};
				};
			};
		};
		//log("###imgStartPacker:",imgStartPacker,patterns.length,patterns[imgStartPacker-1],patterns[imgStartPacker]);
		//log("BB:",_layerTexture,ObjCopy(ret.tiles));
		retCnv[imgNo]=imgCnv;
		ok=imgStartPacker>=patterns.length;
		imgNo++;
		ok=ok||imgNo>60;
	};
	
	if(_opts.removeTransparence){
		if(_layerTexture==LAYERTEXURES_TSHDW||_layerTexture==LAYERTEXURES_SSHDW){
			for(t in retCnv){
				this._SetBgrd(retCnv[t],255,255,255);
			};
		};
		if(_layerTexture==LAYERTEXURES_TLIGT||_layerTexture==LAYERTEXURES_SLIGT){
			for(t in retCnv){
				this._SetBgrd(retCnv[t],0,0,0);
			};
		};
	};
	
	if(doUnitTest){
		for(t=0;t<ret.tiles.tiles.length;t++){
			u=ret.tiles.tiles[t];
			if(u[TILE_SHAD_ID]==TILE_SHAD_ID_NORMAL){
				if(u[TILE_NORM_IMGNO]==-1)log("!!!!Missing Tile",t,ret.tiles.tiles[t]);
				if(u[TILE_INFOBITS]&TILE_INFOBITS_SHDW_SELF)if(uTestTilesInfo[t][TILE_SHDW_XS].imgNo!=u[TILE_NORM_IMGNO])log("!!!!Missing Tile TILE_SHDW_XS",t);
				if(u[TILE_INFOBITS]&TILE_INFOBITS_SHDW_R)if(uTestTilesInfo[t][TILE_SHDW_R_XS].imgNo!=u[TILE_NORM_IMGNO])log("!!!!Missing Tile TILE_SHDW_R_XS",t,uTestTilesInfo[t][TILE_SHDW_R_XS].imgNo,u);
				if(u[TILE_INFOBITS]&TILE_INFOBITS_SHDW_B)if(uTestTilesInfo[t][TILE_SHDW_B_XS].imgNo!=u[TILE_NORM_IMGNO])log("!!!!Missing Tile TILE_SHDW_B_XS",t,uTestTilesInfo[t][TILE_SHDW_B_XS].imgNo,u);
				if(u[TILE_INFOBITS]&TILE_INFOBITS_SHDW_BR)if(uTestTilesInfo[t][TILE_SHDW_BR_XS].imgNo!=u[TILE_NORM_IMGNO])log("!!!!Missing Tile TILE_SHDW_BR_XS",t,uTestTilesInfo[t][TILE_SHDW_BR_XS].imgNo,u);
				if(u[TILE_INFOBITS]&TILE_INFOBITS_LIGT_TL)if(uTestTilesInfo[t][TILE_LIGT_TL_XS].imgNo!=u[TILE_NORM_IMGNO])log("!!!!Missing Tile TILE_LIGT_TL_XS",t);
				if(u[TILE_INFOBITS]&TILE_INFOBITS_LIGT_T)if(uTestTilesInfo[t][TILE_LIGT_T_XS].imgNo!=u[TILE_NORM_IMGNO])log("!!!!Missing Tile TILE_LIGT_T_XS",t);
				if(u[TILE_INFOBITS]&TILE_INFOBITS_LIGT_TR)if(uTestTilesInfo[t][TILE_LIGT_TR_XS].imgNo!=u[TILE_NORM_IMGNO])log("!!!!Missing Tile TILE_LIGT_TR_XS",t);
				if(u[TILE_INFOBITS]&TILE_INFOBITS_LIGT_L)if(uTestTilesInfo[t][TILE_LIGT_L_XS].imgNo!=u[TILE_NORM_IMGNO])log("!!!!Missing Tile TILE_LIGT_L_XS",t);
				if(u[TILE_INFOBITS]&TILE_INFOBITS_LIGT_SELF)if(uTestTilesInfo[t][TILE_LIGT_XS].imgNo!=u[TILE_NORM_IMGNO])log("!!!!Missing Tile TILE_LIGT_XS",t);
				if(u[TILE_INFOBITS]&TILE_INFOBITS_LIGT_R)if(uTestTilesInfo[t][TILE_LIGT_R_XS].imgNo!=u[TILE_NORM_IMGNO])log("!!!!Missing Tile TILE_LIGT_R_XS",t);
				if(u[TILE_INFOBITS]&TILE_INFOBITS_LIGT_BL)if(uTestTilesInfo[t][TILE_LIGT_BL_XS].imgNo!=u[TILE_NORM_IMGNO])log("!!!!Missing Tile TILE_LIGT_BL_XS",t);
				if(u[TILE_INFOBITS]&TILE_INFOBITS_LIGT_B)if(uTestTilesInfo[t][TILE_LIGT_B_XS].imgNo!=u[TILE_NORM_IMGNO])log("!!!!Missing Tile TILE_LIGT_B_XS",t);
				if(u[TILE_INFOBITS]&TILE_INFOBITS_LIGT_BR)if(uTestTilesInfo[t][TILE_LIGT_BR_XS].imgNo!=u[TILE_NORM_IMGNO])log("!!!!Missing Tile TILE_LIGT_BR_XS",t);
			};
		};
		for(s=0;s<ret.sprites.sprites.length;s++){
			u=ret.sprites.sprites[s];
			if(u[SPRITE_NORM_IMGNO]==-1)log("!!!!Missing Sprite",s,ret.sprites.sprites[s]);
			if(u[SPRITE_INFOBITS]&SPRITE_INFOBITS_SHDW)if(uTestSpritesInfo[s][SPRITE_SHDW_XS].imgNo!=u[SPRITE_NORM_IMGNO])log("!!!!Missing Sprite SPRITE_SHDW_XS",s);
			if(u[SPRITE_INFOBITS]&SPRITE_INFOBITS_LIGT)if(uTestSpritesInfo[s][SPRITE_LIGT_XS].imgNo!=u[SPRITE_NORM_IMGNO])log("!!!!Missing Sprite SPRITE_LIGT_XS",s);
		};
	};
	
	if(_opts.sameSize){
		var xMaxSize=0,yMaxSize=0;
		for(imgNo in retCnv){
			if(imgSizes[imgNo][0]>xMaxSize)xMaxSize=imgSizes[imgNo][0];
			if(imgSizes[imgNo][1]>yMaxSize)yMaxSize=imgSizes[imgNo][1];
		};
		for(imgNo in retCnv){
			if(imgSizes[imgNo][0]<xMaxSize||imgSizes[imgNo][1]<yMaxSize)retCnv[imgNo]=this._ResizeImage(retCnv[imgNo],xMaxSize,yMaxSize);
		};		
	};
	for(imgNo in retCnv){
		ret.imgData[imgNo]=retCnv[imgNo].toDataURL("image/png");
		delete retCnv[imgNo];
	};
	
	return ret;
};

