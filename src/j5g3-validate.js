/**
 * j5g3 v0.9.0 - Javascript Graphics Engine
 * http://j5g3.com
 *
 * Copyright 2010-2012, Giancarlo F Bellido
 *
 * j5g3 is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * j5g3 is distributed in the hope that it will be useful
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with j5g3. If not, see <http://www.gnu.org/licenses/>.
 *
 */
(function(j5g3, undefined) {
'use strict';

/** @namespace Validation functions */
j5g3.Validate = {

	Stage: function()
	{
		var BB = this.dbox.reset();

		if (this.is_dirty())
			this.commit(BB);

		// Figure out a better way to clear box
		this.box.store().reset();

		if (validateChildren(this, this.box))
		{
			BB.union(this.box.stored);
			BB.union(this.box);
			BB.clip(0, 0, this.width, this.height);
		} else
			this.box.restore();

		return this;
	},

	Clip: function(BB)
	{
		if (this.is_dirty(this))
			this.commit(BB);

		this.box.store().reset();

		if (validateChildren(this, this.box))
		{
			BB.union(this.box.stored);
			BB.union(this.box);
			return true;
		} else
			this.box.restore();
	},

	DisplayObject: function(BB)
	{
		if (this.is_dirty())
		{
			BB.union(this.box);
			this.commit(BB);
			transform(this);
			BB.union(this.box);

			return true;
		}
	}

};

j5g3.IsDirty = {

	Map: function()
	{
	var
		A = this,
		B = this.dirty
	;
		B.$map = A.tw !== B.tw || A.th !== B.th || A.offsetX !== B.offsetX || A.offsetY !== B.offsetY || A.sprites !== B.sprites ||
		A.map !== B.map;

		B.$redraw = j5g3.IsDirty.DisplayObject.call(this) || B.$map;

		return B.$redraw;
	},

	Shape: function()
	{
		if (this.radius !== this.dirty.radius)
		{
			this.width = this.height = this.radius * 2;
			this.dirty.radius = this.radius;
		}

		return j5g3.IsDirty.DisplayObject.call(this);
	},

	Clip: function()
	{
	var
		A = this,
		B = A.dirty
	;
		B.$clip = A._frame !== B._frame;

		// TODO optimize
		B.$redraw = j5g3.IsDirty.DisplayObject.call(A) || B.$clip;

		return B.$redraw;
	},

	DisplayObject: function()
	{
	var
		A = this,
		// TODO maybe not do this.
		parentDirty = A.parent && A.parent.dirty || false,
		B = A.dirty
	;
		B.$ignore = B.$redraw = parentDirty.$ignore || A.alpha===0 || A.width === 0 ||
			A.height === 0 || A.sx === 0 || A.sy === 0;

		if (B.$ignore)
			return false;

		B.$position = parentDirty.$position || A.x !== B.x || A.y !== B.y ||
			A.cy !== B.cy || A.cx !== B.cx;

		B.$dimension = parentDirty.$dimension || A.width !== B.width ||
			A.height !== B.height || A.sy !== B.sy || A.sx !== B.sx;

		B.$angle = parentDirty.$angle || A.rotation !== B.rotation;

		B.$image = parentDirty.$image || A.alpha !== B.alpha || A.blending !== B.blending;

		B.$shape = parentDirty.$shape || A.line_cap !== B.line_cap ||
			A.line_join !== B.line_join || A.line_width !== B.line_width ||
			A.miter_limit !== B.miter_limit || A.stroke !== B.stroke || A.fill !== B.fill;

		B.$container = parentDirty.$container || A.parent !== B.parent;

		B.$redraw = parentDirty.$redraw || B.$position || B.$dimension || B.$angle || B.$image || B.$shape || B.$container;

		return B.$redraw;
	}

};

j5g3.Commit = {

	Map: function(BB)
	{
		var A = this, B = A.dirty;

		if (B.$map)
		{
			B.tw = A.tw;
			B.th = A.th;
			B.offsetX = A.offsetX;
			B.offsetY = A.offsetY;
			B.sprites = A.sprites;
			B.map = A.map;
		}

		j5g3.Commit.DisplayObject.call(A, BB);
	},

	Clip: function(BB)
	{
		var A = this;

		if (A.dirty.$clip)
			A.dirty._frame = A._frame;

		j5g3.Commit.DisplayObject.call(A, BB);
	},

	DisplayObject: function(BB)
	{
	var
		A = this,
		B = A.dirty,
		box = A.box,
		M = box.M
	;
		if (B.$angle)
			commitAngle(A, B, M);

		if (B.$shape)
			commitShape(A, B);

		if (B.$angle || B.$dimension || B.$position || B.$container)
			commitBox(A, B, BB, M);

		if (B.$dimension)
			commitDimension(A, B, M);

		if (B.$position)
			commitPosition(A, B, M);

		if (B.$image)
			commitImage(A, B, M);

		if (B.$container)
			commitContainer(A, B, M);

		/*if (M.identity)
		{
			box.x = M.e;
			box.y = M.f;
			box.w = A.width;
			box.h = A.height;
			box.r = box.x + box.w;
			box.b = box.y + box.h;

			return;
		}*/
	}

};

function validateChildren(me, BB)
{
var
	next = me.frame,
	result = 0
;
	while ((next = next._next) !== me.frame)
		if (next.validate && next.validate(BB))
			result++;

	return result;
}

function commitPosition(A, B)
{
	B.x = A.x;
	B.y = A.y;
	B.cx = A.cx;
	B.cy = A.cy;
}

function commitAngle(A, B)
{
	B.cos = Math.cos(A.rotation);
	B.sin = Math.sin(A.rotation);
	B.rotation = A.rotation;
}

function commitDimension(A, B)
{
	B.width = A.width;
	B.height = A.height;
	B.sx = A.sx;
	B.sy = A.sy;
}

function commitImage(A, B)
{
	B.alpha = A.alpha;
	B.blending = A.blending;
}

function commitContainer(A, B)
{
	B.parent = A.parent;
}

function transform(A)
{
var
	box = A.box,
	M = box.M,
	x = M.e,
	y = M.f,
	x2, y2, x3, y3
;
	M.to_world(A.width, A.height);
	x2 = M.x; y2 = M.y;
	M.to_world(0, A.height);
	x3 = M.x; y3 = M.y;
	M.to_world(A.width, 0);

	box.x = Math.min(x, x2, x3, M.x) | 0;
	box.y = Math.min(y, y2, y3, M.y) | 0;
	box.r = Math.ceil(Math.max(x, x2, x3, M.x));
	box.b = Math.ceil(Math.max(y, y2, y3, M.y));
	box.w = box.r - box.x;
	box.h = box.b - box.y;
}

function commitBox(A, B, BB, M)
{
	M.copy(BB.M);

	if (A.sx !== 1 || A.sy !== 1 || A.rotation !== 0)
	{
		M.multiply(
			A.sx * B.cos, A.sx * B.sin,
			-A.sy * B.sin, A.sy * B.cos, 0, 0
		);
	}

	M.e += A.x;
	M.f += A.y;

	if (A.cx !== 0 || B.cy !== 0)
	{
		M.to_world(A.cx, A.cy);
		M.e = M.x;
		M.f = M.y;
	}
}

function commitShape(A, B)
{
	B.line_cap = A.line_cap;
	B.line_join = A.line_join;
	B.line_width = A.line_width;
	B.miter_limit = A.miter_limit;
	B.stroke = A.stroke;
	B.fill = A.fill;
}

})(window.j5g3);
