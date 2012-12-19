
var layer_select = {id: 0};
var nb_layer, array_tiles;
var currentZoom = 1;
var current_map_id = 0;
var events = [];
var autotiles_array = [];
var tmp_autotiles_array = [];
var autotiles_all = {};
var OPACITY_LAYER = .4;
var NB_LAYER = 3;
var current_type_tiles = "tileset";
  var nbAutotiles = 64;

var size_x = getSizeTile().x;
var size_y = getSizeTile().y;

var HEXA_AUTOTILES = [
	0x00, 0x80, 0x20, 0xA0, 0x08, 0x88, 0x28, 0xA8,
	0x02, 0x82, 0x22, 0xA2, 0x0A, 0x8A, 0x2A, 0xAA,
	0x83, 0xA3, 0x8B, 0xAB, 0xE0, 0xE8, 0xE2, 0xEA,
	0x38, 0x3A, 0xB8, 0xBA, 0x0E, 0x8E, 0x2E, 0xAE,
	0xBB, 0xEE, 0xE3, 0xEB, 0xF8, 0xFA, 0x3E, 0xBE,
	0x8F, 0xAF, 0xFB, 0xEF, 0xBF, 0xFE, 0xFF, 0xFF
];
var HEXA_DIR_BORDER_AUTOTILES = {
	left: [0xFE, -1, 0],
	right: [0xEF, 1, 0],
	bottom: [0xFB, 0, 1],
	top: [0xBF, 0, -1]
	
};
var HEXA_DIR_CORNER_AUTOTILES = {
	topleft: [0x7F, -1, -1],
	topright: [0xDF, 1, -1],
	bottomleft: [0xFD, -1, 1],
	bottomright: [0xF7, 1, 1]
};



function loadEditorMap(data_map) {
	
	$("#canvas-map-layer").empty();
	$("#tileset").html("");
	$("#canvas-map-layer").css({
		width: (data_map._width * size_x) + "px",
		height: (data_map._height * size_y) + "px"
	});
	
	
	
	var canvas, layer_name, layer_index;
	for (var i=0 ; i < nb_layer+1 ; i++) {
		canvas = document.createElement("canvas");
		if (i == 3) {
			layer_name = "event";
		}
		else {
			layer_name = i;
		}
		$(canvas).attr("id", "canvas-map-layer_" + layer_name);
		$(canvas).attr("width", data_map._width * size_x);
		$(canvas).attr("height", data_map._height * size_y);
		layer_index = i+1;
		$(canvas).css('z-index', layer_index);
		if (layer_name == "event") {
			$(canvas).hide();
		}
		else {
			if (layer_select.id != i) {
				$(canvas).css('opacity', OPACITY_LAYER);
			}
		}
		$("#canvas-map-layer").append($(canvas));
	}
	
	$("#canvas-map-layer").append('<div id="layer-map-event"></div>');
	var div =  $("#layer-map-event");
	div.css({
		position: 'absolute',
		zIndex: layer_index+1,
		width: (data_map._width * size_x) + "px",
		height: (data_map._height * size_y) + "px"
	});
	
	_memorize("map", data_map);

	
	Ajax.drawMap(data_map.id, function(obj) {
		if (obj.map) {
			events = obj.events;
			drawMap($.parseJSON(obj.map), data_map);
		}
		else {
			Preload.forceLoading();
			$('#manage_maps').trigger('click');
		}
	});
	
}

function drawMap(mapData, data_map) {
	var map_id = current_map_id = data_map.id,
	tileset_id = data_map.tileset;

	if (!mapData) return;
	
	var size_x = getSizeTile().x;
	var size_y = getSizeTile().y;
	
		if (mapData.map.length == 0) {
			for (var i=0 ; i < data_map._width ; i++) {
				mapData.map[i] = [];
				for (var j=0 ; j < data_map._height ; j++) {
					mapData.map[i][j] = [null, null, null];
				}
			}
		}
		else {
			var tmp_map = [];
			for (var i=0 ; i < data_map._width ; i++) {
				tmp_map[i] = [];
				for (var j=0 ; j < data_map._height ; j++) {
					tmp_map[i][j] = mapData.map[i][j];
				}
			}
			mapData.map = tmp_map;
		}
		
		if (mapData.map.length > data_map._width) {
			var diff = mapData.map.length - data_map._width;
			mapData.map.splice(+data_map._width, diff);
		}
	
		var img = new Image();
		img.src = MATERIALS[DATABASE.tilesets[tileset_id].graphic].path;
		
		
		img.onload = function() {
			Preload.load(LANG['LOAD_TILESET']);
			function getIdByHexa(hexa) {
				for (var i=0 ; i < HEXA_AUTOTILES.length ; i++) {
					if (HEXA_AUTOTILES[i] == hexa) {
						return i;
					}
				}
			}
			
			function changeTile(x, y, _default, research, reset) {
				var _x = Math.round(x / Math.ceil(size_x));
				var _y = Math.round(y / Math.ceil(size_y));
				var hexa, hexa2;
				var select = $("#canvas-cursor");
				var pos = select.position();
				var _layer_select = layer_select;
				var ctx = _layer_select.ctx;
	
				var global_id = reset === undefined ? parseInt($('#selectable-autotiles li.ui-selected').attr('data-id')) : reset;
				function loopAutotile(array_dir, _hexa, corner) {
					$.each(array_dir, function(dir, val) {
						var pos_x = _x + val[1];
						var pos_y = _y + val[2];
						if (pos_x < 0) pos_x = 0;
						else if (pos_x >= mapData.map.length) pos_x =  mapData.map.length-1;
						if (pos_y < 0) pos_y = 0;
						else if (pos_y >= mapData.map[0].length) pos_y =  mapData.map[0].length-1;
						
						var data_id = mapData.map[pos_x][pos_y][_layer_select.id];
						var hexa_search, n_hexa;
						if (data_id >= global_id && data_id < global_id+48) {
							n_hexa = _hexa & val[0];
							if ((getIdByHexa(n_hexa) !== undefined && corner) || !corner) {
								_hexa &= val[0];
							}
							switch (dir) {
								case "left": hexa_search = array_dir.right[0]; break;
								case "right": hexa_search = array_dir.left[0]; break;
								case "top": hexa_search = array_dir.bottom[0]; break;
								case "bottom": hexa_search = array_dir.top[0]; break;
								case "topleft": hexa_search = array_dir.bottomright[0]; break;
								case "topright": hexa_search = array_dir.bottomleft[0]; break;
								case "bottomleft": hexa_search = array_dir.topright[0]; break;
								case "bottomright": hexa_search = array_dir.topleft[0]; break;
							}
							if (reset !== undefined) {
								hexa_search = 0xFF;
							}
							if (research) changeTile(pos_x * size_x, pos_y * size_x, hexa_search, false, reset);
						}
					});
					return _hexa;
				}

				hexa = loopAutotile(HEXA_DIR_BORDER_AUTOTILES, _default);
				hexa = loopAutotile(HEXA_DIR_CORNER_AUTOTILES, hexa, true);
				
				var new_id = getIdByHexa(hexa);
				if (new_id !== undefined && (!research || (reset === undefined && research))) {
					new_id += global_id;
					drawArea(x, y, select.width(), select.height(), [[new_id]]);
					if (autotiles_array[new_id]) {
						ctx.drawImage(autotiles_array[new_id], 0, 0, select.width(), select.height(), x, y, select.width(), select.height());
					}
				}
			}
			
			
			var tileset = $('<div>');
			var w = img.width, h = img.height;
			var mousedown = false;
			var rightclick = false;
			var rightclick_pos = {};
			var rightclick_mode = false;
			var rightclick_imgData;
			var history = [];
			var history_pos = 0;
			var map = mapData.map;
			var current_tools = "pencil";
			
			tileset.append(img);
			tileset.css({
				height: img.height,
				width: img.width,
			});
			$('#tileset').width(img.width + 10);
			$('#tileset').append(tileset);
			$(img).disableSelection();
			
			imgSelectable('tileset');
			
			var _tile = $('<div>');
			_tile.addClass('autotile_set');
			_tile.width(256);
		
			autotiles_array = [];
			var autotiles_data = !data_map.autotiles || data_map.autotiles == 0 ? {} : DATABASE['autotiles'][data_map.autotiles];
			autotiles_data.autotiles = autotiles_data.autotiles || [];
			var div;
			for (var i=0 ; i < autotiles_data.autotiles.length ; i++) {
				var a = autotiles_data.autotiles[i];
				if (autotiles_all[a]) {
					div = $('<div>');
					div.append(Object.clone(autotiles_all[a].canvas[47]));
					_tile.append(div);
					autotiles_array = autotiles_array.concat(autotiles_all[a].canvas);
				}
			}
		
			$('#autotiles').empty();
			$('#autotiles').append(_tile);
			$('#autotiles').jScrollPane();
		
			imgSelectable('autotiles');
			
			function imgSelectable(id) {
				var selectable = $('<ul>'), l, mul;
				if (id == "tileset") {
					l = (w / size_x) * (h / size_y);
					mul = function(i) { return i + nbAutotiles * 48};
				}
				else {
					l =  nbAutotiles;
					mul = function(i) { return i * 48};
				}
				selectable.attr('id', 'selectable-' + id);
				selectable.addClass('selectable-tiles');
				selectable.width(w);
			
				
				for (var i=0 ; i < l ; i++) {
					selectable.append('<li class="ui-state-default" data-id="' + mul(i) + '"></li>');
				}
				$("#" + id).append(selectable); 
				selectable.selectable({
					stop: function() {
						rightclick_mode = false;
						rightclick_imgData = false;
						var array = array_tiles = $(".ui-selected", this);
						if (array) {
							var first = $(array[0]).position();
							var last = $(array[array.length-1]).position();
							var cursor_size = {
								w: (last.left - first.left) + size_x,
								h: (last.top - first.top) + size_y
							};
							$("#canvas-cursor").css({
								width: cursor_size.w,
								height: cursor_size.h
							});
						}
					}
				});
				if (id == "tileset") {
					//$("#" + id).jScrollPane();
				}
			}
			
			$("#canvas-map").jScrollPane();
			
			var isCtrl = false;

			$(document).keyup(function (e) {
				if(e.which == 17) isCtrl=false;
			}).keydown(function (e) {
				if(e.which == 17) isCtrl=true;
				if(e.which == 90 && isCtrl == true) {
					$('#undo').trigger('click');
					return false;
				}
			});

	
			$('#undo').click(function() {
				if (history_pos >= 0) {
					var obj = history[history_pos];
					var ctx = obj.layer;
					ctx.clearRect(obj.x, obj.y, obj.w, obj.h);
					ctx.putImageData(obj.data, obj.x, obj.y);
					history_pos--;
				}
			});
			
			$('#save').unbind('click');
			$('#save').bind('click', function() {
				Ajax.updateMap(map_id, mapData, function(ret) {
					displayInfoAjax("", "", ret);
				});
				Ajax.updateEvents(map_id, events, function(ret) {
				
				});
			});
			
			$('#erase').click(function() {
				current_tools = "erase";
				current_type_tiles = "";
				toolSelected(this);
			});
			
			$('#pencil').click(function() {
				current_tools = "pencil";
				toolSelected(this);
			});
			
			$('#fill').click(function() {
				current_tools = "fill";
				toolSelected(this);
			});
			
			function toolSelected(tool) {
				$('#button_draw').children('li').removeClass('selected');
				$(tool).addClass('selected');
			}
			
			
			
			/*$('#redo').click(function() {
				if (history_pos <= history.length) {
					history_pos++;
					var ctx = layer_select.ctx;
					var obj = history[history_pos];
					ctx.clearRect(obj.x, obj.y, obj.w, obj.h);
					ctx.putImageData(obj.data, obj.x, obj.y);
				}
			});*/
			
			function setDataMap(x, y, w, h, data) {
				var size_x = getSizeTile().x;
				var size_y = getSizeTile().y;
				
				x = Math.round(x / Math.ceil(size_x));
				y = Math.round(y / Math.ceil(size_y));
				w = Math.round(w / Math.ceil(size_x));
				h = Math.round(h / Math.ceil(size_y));

				for (var i=x ; i < w+x ; i++) {
					for (var j=y ; j < h+y ; j++) {
						mapData.map[i][j][layer_select.id] = data[i-x][j-y];
					}
				}
				map = mapData.map;
			}
			
			var H_MAP = data_map._height;
			var W_MAP = data_map._width;
			var tab_move_passable = [];
			
			function init_tab_move() {
				for (var i = 0 ; i < H_MAP * 2 + 1 ; i++) {
					tab_move_passable[i] = [];
					for (var j = 0 ; j < H_MAP * 2 + 1 ; j++) {
						tab_move_passable[i][j] = -1;
					}
				}
				var middle = Math.floor(tab_move_passable.length / 2);
				tab_move_passable[middle][middle] = 0;
			}

					
			function fill(x, y) {
				var pos_temporaire = [];
				var pos_semi_tempor = [[x, y]];
				var path = 0;
				var diff_x = pos_semi_tempor[0][0] - H_MAP;
				var diff_y = pos_semi_tempor[0][1] - H_MAP;
				var tab_move = [];
				var l = layer_select.id;
				var id = mapData.map[x][y][l];
				init_tab_move();
				while (!pos_semi_tempor.length == 0) {
					pos_temporaire = [];
					for (var i = 0 ; i < pos_semi_tempor.length ; i++) {
						var new_pos_x = pos_semi_tempor[i][0];
						var new_pos_y = pos_semi_tempor[i][1];
						var tab_x = new_pos_x;
						var tab_y = new_pos_y;
						
						for (var j = 0 ; j < 4 ; j++) {
							switch (j) {
								case 0: 	

									if (mapData.map[new_pos_x][new_pos_y  + 1] && mapData.map[new_pos_x][new_pos_y  + 1][l] == id && tab_move_passable[tab_x][tab_y + 1] == -1) {
										  pos_temporaire.push([new_pos_x,new_pos_y + 1]);
										  tab_move.push([new_pos_x,new_pos_y + 1]);
										  tab_move_passable[tab_x][tab_y + 1] = 0;
									}
								break;
								case 1: 
									
									if (mapData.map[new_pos_x + 1] && mapData.map[new_pos_x + 1][new_pos_y] && mapData.map[new_pos_x + 1][new_pos_y][l] == id && tab_move_passable[tab_x + 1][tab_y] == -1) {
										  pos_temporaire.push([new_pos_x + 1,new_pos_y]);
										  tab_move.push([new_pos_x + 1,new_pos_y]);
										  tab_move_passable[tab_x + 1][tab_y] = 0;
									}
									
								break;
								case 2: 		
									if (mapData.map[new_pos_x][new_pos_y - 1] && mapData.map[new_pos_x][new_pos_y - 1][l] == id && tab_move_passable[tab_x][tab_y - 1] == -1) {
										  pos_temporaire.push([new_pos_x,new_pos_y - 1]);
										  tab_move.push([new_pos_x,new_pos_y - 1]);
										  tab_move_passable[tab_x][tab_y - 1] = 0;
									}
										
								break;
								case 3: 	
									if (mapData.map[new_pos_x - 1] && mapData.map[new_pos_x - 1][new_pos_y] && mapData.map[new_pos_x - 1][new_pos_y][l] == id && tab_move_passable[tab_x - 1][tab_y] == -1) {
										  pos_temporaire.push([new_pos_x - 1,new_pos_y]);
										  tab_move.push([new_pos_x - 1,new_pos_y]);
										  tab_move_passable[tab_x - 1][tab_y] = 0;
									}
								break;
							}
						}
						
					}
					pos_semi_tempor = clone(pos_temporaire);
					path += 1;
				}
				return tab_move;
			}
			
			
			
			function getDataMap(x, y, w, h) {
				var size_x = getSizeTile().x;
				var size_y = getSizeTile().y;
				x = Math.round(x / Math.ceil(size_x));
				y = Math.round(y / Math.ceil(size_y));
				w = Math.round(w / Math.ceil(size_x));
				h = Math.round(h / Math.ceil(size_y));
				var data = [];
				for (var i=x ; i < w+x ; i++) {
					data[i-x] = [];
					for (var j=y ; j < h+y ; j++) {
						 data[i-x][j-y] = mapData.map[i][j][layer_select.id];
					}
				}
				return data;
			}
			
			function memorize(x, y, w, h) {
				if (history_pos > 10) return;
				var ctx = layer_select.ctx;
				var imgData = ctx.getImageData(x, y, w, h);
				history.push({layer: ctx, x: x, y: y, w: w, h: h, data: imgData});
				history_pos = history.length-1;
			}
			
			function drawArea(x, y, w, h, data) {
				var ctx = layer_select.ctx;
				setDataMap(x, y, w, h, data);
				memorize(x, y, w, h);
				ctx.clearRect(x, y, w, h);
				if (layer_select.id == 0) {
					ctx.fillStyle = "#FFFFFF";
					ctx.fillRect(x, y, w, h); 
				}
			}
			
			$('#canvas-map-layer, #canvas-cursor').unbind("mousedown");
			$('#canvas-map-layer, #canvas-cursor').bind("mousedown", function(e) {
				if (current_tools == "event") return;
				var size_x = getSizeTile().x;
				var size_y = getSizeTile().y;
				var _size_x = getSizeTile(false).x;
				var _size_y = getSizeTile(false).y;
				var select = $("#canvas-cursor");
				
				if (layer_select.id == "event") {
					return;
				}
				
				var pos = select.position();
				if (e.which == 3) {
					$("#canvas-cursor").css({
						width: '32px',
						height: '32px'
					});
					rightclick = true;
					rightclick_imgData = false;
					rightclick_pos = select.position();
					return false;
				}
				var ctx = layer_select.ctx;
				var left = pos.left * (1 + (1 - currentZoom));
				var top = pos.top * (1 + (1 - currentZoom));
				var _x = Math.round(left / Math.ceil(size_x));
				var _y = Math.round(top / Math.ceil(size_y));
				var autotile_id = mapData.map[_x][_y][0];
				
				if (current_type_tiles == "autotile") {
					mousedown = true;
					changeTile(left, top, 0xFF, true);
					if (autotile_id <  nbAutotiles*48) {
						changeTile(left, top, 0xFF, true, Math.floor(autotile_id / 48) * 48);
					}
				}
				else {
					
					
					
					//var left = Math.ceil(pos.left / _size_x) * _size_x;
					//var top = Math.ceil(pos.top / _size_y) * _size_y;
					
					
					
					if (rightclick_imgData) {
						drawArea(pos.left, pos.top, select.width(), select.height());
						ctx.putImageData(rightclick_imgData, pos.left, pos.top);
					}
					else {
						if (current_tools == "pencil") {
							if (!array_tiles) return;
							var data_tiles = [], t;

							var _w = Math.round(select.width() / _size_x);
							var h = Math.round(select.height() / _size_y);
							var k =0;
							for (var i=0 ; i < _w ; i++) {
								data_tiles[i] = [];
								for (var j=0 ; j < h ; j++) {
									k = i + j * _w;
									data_tiles[i][j] = $(array_tiles[k]).attr('data-id');
								}
							}
								//
							var _tile = tile(w, $(array_tiles[0]).attr('data-id') - nbAutotiles*48);
							
							drawArea(left, top, select.width(), select.height(), data_tiles);
							ctx.drawImage(img, _tile.x, _tile.y, select.width(), select.height(), left, top, select.width(), select.height());
							

							if (autotile_id && autotile_id <  nbAutotiles*48) {
								changeTile(left, top, 0xFF, true, Math.floor(autotile_id / 48) * 48);
							}
						}
						else if (current_tools == "fill") {
							var array_fill = fill(_x, _y);
							var data_tile = $(array_tiles[0]).attr('data-id');
							var _tile = tile(w, data_tile - nbAutotiles*48);
							for (var i=0 ; i < array_fill.length ; i++) {
								var fill_left = array_fill[i][0] * size_x;
								var fill_top = array_fill[i][1] * size_y;
								drawArea(fill_left, fill_top, select.width(), select.height(), [[data_tile]]);
								ctx.drawImage(img, _tile.x, _tile.y, select.width(), select.height(), fill_left, fill_top, select.width(), select.height());
								
							}
							drawArea(left, top, select.width(), select.height(), [[data_tile]]);
							ctx.drawImage(img, _tile.x, _tile.y, select.width(), select.height(), left, top, select.width(), select.height());
						}
						else {
							drawArea(left, top, select.width(), select.height(), [[null]]);
						}
						
					}
					mousedown = true;
				}
			});
			

			$('#canvas-map-layer, #canvas-cursor').mouseup(function(e) {
				mousedown = false;
				if (rightclick) {
					rightclick_mode = true;
					var ctx = layer_select.ctx;
					var select = $("#canvas-cursor");
					var pos = select.position();
					rightclick_imgData = ctx.getImageData(pos.left,pos.top, select.width(), select.height());
				}
				rightclick = false;
			});
			
			$('#canvas-map-layer, #canvas-cursor').unbind("mousemove");
			$('#canvas-map-layer, #canvas-cursor').bind("mousemove", function(e) {
				var size_x = getSizeTile().x;
				var size_y = getSizeTile().y;
				var ctx = layer_select.ctx;
				var last_pos = $("#canvas-cursor").position();
				
				if (layer_select.id == "event") {
					return;
				}
				
				var x = Math.floor((e.pageX - $('#canvas-map-layer').offset().left - (rightclick_mode ? $("#canvas-cursor").width()-size_x : 0)) / size_x) * size_x;
				var y = Math.floor((e.pageY - $('#canvas-map-layer').offset().top - (rightclick_mode ? $("#canvas-cursor").height()-size_y : 0)) / size_y) * size_y;
				dir = "";
				
				if (rightclick) {
					//if (last_x - x != 0 && last_y - y != 0) {
						var w  = x + size_x - rightclick_pos.left;
						var h  = y + size_y - rightclick_pos.top;
						if (w < size_x) w = size_x;
						if (h < size_y) h = size_y;
						$("#canvas-cursor").css({
							width: w + 'px',
							height: h + 'px'
						});
					//}
					return;
				}
				
				$("#canvas-cursor").css({
					top: y,
					left: x
				});
				
				if (last_pos.top - y < 0) {
					dir = "bottom";
				}
				else if (last_pos.top - y > 0) {
					dir = "top";
				}
				else if (last_pos.left - x < 0) {
					dir = "right";
				}
				else if (last_pos.left - x > 0) {
					dir = "left";
				}
				
				var select = $("#canvas-cursor");
				var pos = select.position();
				
				var _x = Math.round(pos.left / Math.ceil(size_x));
				var _y = Math.round(pos.top / Math.ceil(size_y));
				var autotile_id;
				
				if (!mapData.map[_x]) {
					mapData.map[_x] = [];
				}
				if (!mapData.map[_x][_y]) {
					mapData.map[_x][_y] = [null, null, null];
				}
				
				autotile_id = mapData.map[_x][_y][0];
				
				if (current_type_tiles == "autotile" && mousedown) {
					changeTile(pos.left, pos.top, 0xFF, true);
					if (autotile_id <  nbAutotiles*48) {
						changeTile(pos.left, pos.top, 0xFF, true, Math.floor(autotile_id / 48) * 48);
					}
					
				}
				else if (mousedown && dir != "") {
					
					var imgData;
					if (current_tools == "pencil") {
						if (dir == "right") {
							var data = getData(last_pos.left, last_pos.top, size_x, select.height());
							drawAreaCopy(last_pos.left + select.width(), last_pos.top, size_x, select.height(), data);
						}
						else if (dir == "left") {
						
							var data = getData(pos.left + select.width(), last_pos.top, size_x, select.height());
							drawAreaCopy(pos.left, last_pos.top, size_x, select.height(), data);

						}
						else if (dir == "top") {
						
							var data = getData(pos.left, pos.top + select.height(), select.width(), size_y);
							drawAreaCopy(pos.left, pos.top, select.width(), size_y, data);

						}
						else if (dir == "bottom") {
						
							var data = getData(pos.left, last_pos.top, select.width(), size_y);
							drawAreaCopy(pos.left, last_pos.top  + select.height(), select.width(), size_y, data);

						}
						
					}
					else {
						drawArea(pos.left, pos.top, select.width(), select.height(), [[null]]);
					}
					if (autotile_id && autotile_id <  nbAutotiles*48) {
						changeTile(pos.left, pos.top, 0xFF, true, Math.floor(autotile_id / 48) * 48);
					}

				}
				
				function getData(x, y, w, h) {
					imgData = ctx.getImageData(x, y, w, h);
					return getDataMap(x, y, w, h)
				}
				
				function drawAreaCopy(x, y, w, h, data) {		
					setDataMap(x, y, w, h, data);
					memorize(x, y, w, h);
					ctx.clearRect(x, y, w, h);
					ctx.putImageData(imgData, x, y);
				}
				
			});
	
			
					var propreties = {};
					var canvas;
					var ctx;

					var layer = [];
					
					var canvas_event = document.getElementById("canvas-map-layer_event");
					var ctx_event = canvas_event.getContext("2d");	
					ctx_event.strokeStyle = '#666';
					ctx_event.beginPath();			
					for (var i=0 ; i < canvas_event.width / size_x; i++) {
						ctx_event.moveTo(i * size_x, 0);
						ctx_event.lineTo(i * size_x, canvas_event.height);
					}
					for (var i=0 ; i < canvas_event.height / size_y; i++) {
						ctx_event.moveTo(0, i * size_y);
						ctx_event.lineTo(canvas_event.width, i* size_y);
					}
					ctx_event.stroke();
					
						
					
					new WindowConfirm("#delete_event", {
						text: LANG['DELETE_EVENT_CONFIRM']
					}, function(data, e) {
						var event = $('#layer-map-event .tile-event.selected');
						deleteEvent(event.attr('data-id'));
						event.remove();
					});
					
					drawEvent();
					
					function deleteEvent(id) {
						var pos = getEventPosById(id);
						events.splice(pos,1);
					}
					
					$('#layer-map-event').click(function(e) {
						var cursor_event = $('.cursor-event', this), pos, find_event = false;
						if (cursor_event.length == 0) {
							var div = $('<div>');
							div.addClass('cursor-event');
							$(this).append(div);
							cursor_event = div;
						}
						var x = Math.floor((e.pageX - $(this).offset().left) / size_x) * size_x;
						var y = Math.floor((e.pageY - $(this).offset().top) / size_y) * size_y;
						
						
						$.each(events, function(i, ev) {
							if (ev.position_x == x / size_x && ev.position_y == y / size_y) {
								find_event = true;
							}
						});	

						if (find_event) {
							cursor_event.hide();
						}
						else {
							buttonAddEvent();
							cursor_event.show();
						}
						pos = cursor_event.position();
						cursor_event.css({
							left: x + "px",
							top: y + "px"
						});
						cursor_event.width(size_x - (parseInt(cursor_event.css('border-width'))* 2));
						cursor_event.height(size_y - (parseInt(cursor_event.css('border-width')) * 2));
						cursor_event.attr('data-x', x / size_x);
						cursor_event.attr('data-y', y / size_y);
						
						
					});
					
					$('#layer-map-event').dblclick(function() {
						if ($('#layer-map-event .cursor-event').css('display') != 'none') {
							$('#add_event').trigger('click');
						}
					});
					
					$('#edit_event').click(function() {
						var json = $.parseJSON($(this).attr('data-window'));
						if (ListEventType._type[json.type].params.create) ListEventType._type[json.type].params.create();
						if (ListEventType._type[json.type].params.onClick) ListEventType._type[json.type].params.onClick($(this).attr('data-window'));
					});

					 for (var l=0 ; l < nb_layer ; l++) {
						canvas = document.getElementById("canvas-map-layer_" + l);
						ctx = canvas.getContext("2d");
						if (l == 0) {
							$("#canvas-map").css({
								background: "black"
							});
							ctx.fillStyle = "#FFFFFF";
							ctx.fillRect(0, 0, canvas.width, canvas.height); 			
						}

						var _tile, tile_id, _img, _img_x, _img_y;
						for (var i=0 ; i < data_map._width ; i++) {
							for (var j=0 ; j < data_map._height ; j++) {
								if (!map[i]) {
									map[i] = [];
								}
								if (!map[i][j]) {
									map[i][j] = [null, null, null];
								}
								var id = map[i][j][l];
								if (id === undefined) {
									id = null;
								}
								 if (id != null) {
									//if ((id - 48) - autotiles_array.length >= 0) {
										tile_id = id-nbAutotiles*48;
										
										_tile = tile(w, tile_id);

										if (tile_id >= 0) {
											_img = img;
											_img_x = _tile.x;
											_img_y = _tile.y;
										}
										else {
											_img =  autotiles_array[id];
											_img_x = 0;
											_img_y = 0;
										}
										if (_img) {
											ctx.drawImage(_img, _img_x, _img_y, size_x, size_y, size_x * i, size_y * j, size_x, size_y);
										}
									//}
									/*else {
										var cont = autotiles_array[id-48];
										if (cont) {
											cont = cont.clone(true);
											cont.x = 32 * i;
											cont.y = 32 * j;
											layer[l].addChild(cont);
										}
									}*/
									
								}
								
							}
						}	
						Preload.load(LANG["GENERATE_MAP"]);						
					 }
					 mapData.map = map;
					$('.layer[data-id="0"]').trigger('click');
					
						 
		}
		
		
		

		
}

function tile(w, id) {
	var size_x = getSizeTile(false).x;
	var size_y = getSizeTile(false).y;
	var pos_y = parseInt(id / (w / size_x));
	var pos_x = (id % (w / size_x));
	return {x: pos_x*size_x, y: pos_y*size_y};
}

function buttonAddEvent() {
	$('#layer-map-event .tile-event.selected').removeClass('selected');
	$('#edit_event').hide();
	$('#delete_event').hide();
	$('#add_event').show();
}

function buttonEditEvent() {
	$('#edit_event').show();
	$('#delete_event').show();
	$('#add_event').hide();
}




function getSizeTile(zoom) {
	zoom = zoom == undefined ? true : zoom;
	return {
		x: 32 * (zoom ? currentZoom : 1),
		y: 32 * (zoom ? currentZoom : 1)
	}
}

function manageEvent(layout_e, attr, layout) {
	if (!attr) attr = {};
	layout_e.layoutEvent("event", attr.data);
	_layoutEvent(layout_e, attr, layout);
}

function _layoutEvent(layout_e, attr, layout) {
	layout_e.addButton(LANG["OK"], "_add_event", function(data) {
		console.log(data);
		saveEvent(attr, data);
	}, {bottom: true, submit: true, data: attr});
	layout_e.addButton(LANG["CANCEL"], "_quit_event", "cancel", {bottom: true});
}

function drawEvent() {
	$.each(events, function(i, e) {
		if (typeof events[i].data_event == "string") {
			events[i].data_event = $.parseJSON(events[i].data_event);
		}
		if ($('#layer-map-event div[data-id="' + e.event_id + '"]').length > 0) return;
		
		var div = $('<div>');
		var _class = ListEventType._type[events[i].data_event.type].params._class;
		
		div.addClass('tile-event');
		if (_class) div.addClass("event-type-" + _class);
		div.css({
			top: (e.position_y * size_y) + "px",
			left: (e.position_x * size_x) + "px",
			position: "absolute"
		});
		
		//div.attr('data-event', e.data_event);
		div.attr('data-id', e.event_id);
		div.click(function() {
			var e_params, ev = events[i];

			if (ev.data_event == null) {
				e_params = {};
			}
			else {
				e_params = ev.data_event;
			}
			$('.tile-event').removeClass('selected');
			$(this).addClass('selected');

			if (!e_params.data) e_params.data = {};
			
			$('#edit_event').attr('data-window', JSON.stringify({
				"type":  e_params.type, 
				"data": e_params.data, 
				"title": LANG['EDIT_EVENT'], 
				"event_id": e.event_id
			}));
			
			buttonEditEvent();
		});
		div.draggable({
			grid: [ size_x, size_y ],
			start: function() {
				$('#layer-map-event .cursor-event').hide();
			},
			stop: function(e, ui) {
				var id = $(this).attr('data-id');
				var pos = getEventPosById(id);
				events[pos].position_x = ui.position.left / size_x;
				events[pos].position_y = ui.position.top / size_y;
			}
		});
		div.dblclick(function() {
			$('#edit_event').trigger('click');
		});
		$('#layer-map-event').append(div);
		var margin_x = size_x / 8;
		var margin_y = size_y / 8;
		div.css({
			'margin': margin_x + "px " + margin_y + "px"
		});
		
		var border = div.css('border-width');
		if (!border) {
			border = div.css('border-bottom-width'); // firefox
		}
	
		div.width(size_x - (parseInt(border)* 2) - (margin_x * 2));
		div.height(size_y - (parseInt(border) * 2) - (margin_y * 2));
		
		changeGraphicEvent(events[i]);
		
	});	

}

function changeGraphicEvent(event) {
	var div = $('#layer-map-event .tile-event[data-id="' + event.event_id + '"]');
	var graphic = ListEventType._type[event.data_event.type].params.graphic;
	var graphic_path = "", img;
	if (graphic) {
		graphic_path = graphic(event.data_event.data);
		if (graphic_path) {
			if (div.children('img').length > 0) {
				img = div.children('img');
				img.attr('src', graphic_path);
			}
			else {
				img = new Image();
				img.onload = function() {
					div.append($(this));
				}
				img.src = graphic_path;
			}
		}
	}
	

}

function newIdEvent() {
	var max = 0
	$.each(events, function(i, e) {
		if (e.event_id > max) {
			max = e.event_id;
		}
	});
	return +max+1;
}

function saveEvent(attr, input) {
	var val =  input, pos, json;
	//var div = $('#layer-map-event div[data-id="' + attr.event_id + '"]');
	if (attr.event_id) {
		pos = getEventPosById(attr.event_id);
		json = events[pos].data_event;
		json.data = val;
		events[pos].data_event = json;
		changeGraphicEvent(events[pos]);
	}
	else {
		events.push({
			data_event:{
				type: attr.type,
				data: val
			},
			event_id: newIdEvent(),
			position_x: attr.position_x,
			position_y: attr.position_y
		})
		$('#layer-map-event .cursor-event').hide();
		drawEvent();
	}
	
	
	
	//div.attr('data-event', JSON.stringify(json));
	
}

function getEventPosById(id) {
	var pos = 0;
	for (var i=0 ; i < events.length ; i++) {
		if (events[i].event_id == id) {
			pos = i;
			break;
		}
	}
	return pos;
	
}


/*	function getData(x, y, w, h) {
					imgData = ctx.getImageData(x, y, w, h);
					return getDataMap(x, y, w, h)
				}
				
				function drawAreaCopy(x, y, w, h, data) {		
					setDataMap(x, y, w, h, data);
					memorize(x, y, w, h);
					ctx.clearRect(x, y, w, h);
					ctx.putImageData(imgData, x, y);
				}*/


function bitmapAutoTiles(bmp, position, animated) {
	var i, x, y;
	var mi_tile = size_x / 2;
	var nb_seq = animated / mi_tile;

	var canvas = document.createElement("canvas");
	var ctx = canvas.getContext("2d"), imgData;
	
	for (i=0 ; i < 4 ; i++) {
		x = 0, y = 0
		//bmp.currentFrame = nb_seq * + position[i][0];
		imgData = bmp.getImageData(position[i][0] * 16, position[i][1] * 16, mi_tile, mi_tile);
		/*if (animated / mi_tile > 6) {
			bmp.waitFrame = 5;
			bmp.arrayFrames = [];
			for (k=0 ; k < nb_seq / 6 ; k++) {
				bmp.arrayFrames.push(bmp.currentFrame + (k*6));
			}
		}*/
		
		switch (i) {
			case 1: x = mi_tile; break;
			case 2: x = mi_tile; y = mi_tile; break;
			case 3: y = mi_tile; break;
			
		}
		ctx.putImageData(imgData, x, y);
	}
	tmp_autotiles_array.push(canvas);
	
}

function dataAutotile(x, y) {
	var i = 0;
	x = (x - 1) * 2;
	y = (y - 1) * 2;
	var tab = [];
	for (i=0 ; i < 4 ; i++) {
		switch (i) {
			case 1:
				x++;
			break;
			case 2:
				y++;
			break;
			case 3:
				x--;
			break;
		}
		tab.push([x, y]);
	}
	
	return tab;
	

}

var Rpg = {};
Rpg.valueExist = function(a, value) {
	var array_find, i, j;
	for (i=0 ; i < a.length ; i++) {
		if ($.isArray(value)) {
			array_find = true;
			for (j=0 ; j < a[i].length ; j++) {
				if (a[i][j] != value[j]) {
					array_find = false;
				}
			}
			if (array_find) {
				return i;
			}
		}
		else {
			if (a[i] == value) {
				return i;
			}
		}
	}
	return false;
};

function clone(srcInstance) {
			var i;
	if(typeof(srcInstance) != 'object' || srcInstance == null) {
		return srcInstance;
	}
	var newInstance = srcInstance.constructor();
	for(i in srcInstance){
		newInstance[i] = this.clone(srcInstance[i]);
	}
	return newInstance;
}

function constructAutoTiles(seq, bmp, autotile, animated) {
	var i, j, k;
	switch (seq) {
		case 0:
			bitmapAutoTiles(bmp, autotile.center, animated);				
		break;
		case 1: 
			var array_corner = [];
			var corner_close = [];
			var split;
			for (i=1 ; i <= 4 ; i++) {
				for (j=0 ; j <= array_corner.length ; j++) {
					corner_close.push((j != 0 ? array_corner[j-1] : '') + i + ";");
				}
				for (j=0 ; j < corner_close.length ; j++) {
					array_corner.push(corner_close[j]);
					split = corner_close[j].split(';');
					split.pop();
					var tile_corner = [];
					for (k=1 ; k <= 4 ; k++) {
						if (Rpg.valueExist(split, k) !== false) {
							tile_corner.push(autotile.corner[k-1]);
						}
						else {
							tile_corner.push(autotile.center[k-1]);
						}
					}
					
					bitmapAutoTiles(bmp, tile_corner, animated);	
				}
				corner_close = [];
			}
			
		break;
		case 2:
			var dir = [autotile.left, autotile.top, autotile.right, autotile.bottom];
			var new_tile;
			var corner_id = [2, 3];
			var pos;
			for (i=0 ; i < 4 ; i++) {
				for (j=0 ; j < 4 ; j++) {
				  
					new_tile = clone(dir[i]);
					
					if (j == 1 || j == 3) {
						pos = corner_id[0]-1;
						new_tile[pos] = autotile.corner[pos];
					}
					
					if (j == 2 || j == 3) {
						
						pos = corner_id[1]-1;
						new_tile[pos] = autotile.corner[pos];
					}
					
					bitmapAutoTiles(bmp, new_tile, animated);

					
					 
				}
				
				corner_id[0]++;
				corner_id[1]++;
				
				if (corner_id[0] > 4) corner_id[0] = 1;
				if (corner_id[1] > 4) corner_id[1] = 1;		
			}

		break;
		case 3:
			bitmapAutoTiles(bmp, [autotile.left[0], autotile.right[1], autotile.right[2], autotile.left[3]], animated);	
			bitmapAutoTiles(bmp, [autotile.top[0], autotile.top[1], autotile.bottom[2], autotile.bottom[3]], animated);	
		break;
		case 4:
			var dir = [autotile.top_left, autotile.top_right, autotile.bottom_right, autotile.bottom_left];
			var new_tile;
			var pos = 3;
			for (i=0 ; i < dir.length ; i++) {
				for (j=0 ; j < 2 ; j++) {
					new_tile = clone(dir[i]);
					if (j == 1) {
						new_tile[pos-1] = autotile.corner[pos-1];
					}
					bitmapAutoTiles(bmp, new_tile, animated);
				}
				pos++;
				if (pos > 4) pos = 1;
			}
		break;
		case 5:
			var dir = [
				[autotile.top_left[0], autotile.top_right[1], autotile.right[2], autotile.left[3]],
				[autotile.top_left[0], autotile.top[1], autotile.bottom[2], autotile.bottom_left[3]],
				[autotile.left[0], autotile.right[1], autotile.bottom_right[2], autotile.bottom_left[3]],
				[autotile.top[0], autotile.top_right[1], autotile.bottom_right[2], autotile.bottom[3]]
			];
			
			for (i=0 ; i < dir.length ; i++) {
				bitmapAutoTiles(bmp, dir[i], animated);	
			}
			
		break;
		case 6:
			bitmapAutoTiles(bmp, autotile.full, animated);	
			bitmapAutoTiles(bmp, autotile.full, animated);
		break;
	}
}

function initMaps() {

	

	var autotile = {
		center: dataAutotile(2, 3),
		full: 	dataAutotile(1, 1),
		corner: dataAutotile(3, 1),
		left:   dataAutotile(1, 3),
		right:  dataAutotile(3, 3),
		top:    dataAutotile(2, 2),
		bottom: dataAutotile(2, 4),
		top_left: dataAutotile(1, 2),
		top_right: dataAutotile(3, 2),
		bottom_left: dataAutotile(1, 4),
		bottom_right: dataAutotile(3, 4)
	};		
	
	var i=1;
	Ajax.dataMaterials('autotile', function(ret) {
		Preload.load(LANG['LOAD_AUTOTILE_DATA']);
		
		$.each(ret, function(id, obj) {
			
			var name = /\/([^\/]+$)/.exec(obj.path)[1];
			var canvas = document.createElement("canvas");
			var ctx = canvas.getContext("2d");
			var image = new Image();
			image.src = obj.path;
			image.onload = function() {
				tmp_autotiles_array = [];
				Preload.load(LANG['LOAD_AUTOTILE'] + " [" + obj.name + "]");
				//var tile_div = $('<div>');
				canvas.width = image.width;
				canvas.height = image.height;
				ctx.drawImage(this, 0, 0);
				for (j=0 ; j < 7 ; j++) {
					constructAutoTiles(j, ctx, autotile, false);
				}	
			//	tile_div.append(autotiles_array[47]);
				autotiles_all[id] = {
					canvas: tmp_autotiles_array,
					path: obj.path,
					filename: name
				};

				//tile.append(tile_div);
				Preload.load(LANG['GENERATE_AUTOTILE'] + " [" + obj.name + "]");
				i++;
			}
			
		});
		
		
		var last_maps = _getMemorize("map");
		if (last_maps && SETTING.project > 0) {
			loadEditorMap(last_maps);
		}
		else {
			Preload.current = Preload.total;
			Preload.load("");
		}

	}, 'object');
	
	

	nb_layer = $('.layer').length;
	
	$('#b_tilesets').click(function() {
		$('#autotiles').hide();
		$('#tileset').show();
		current_type_tiles = "tileset";
		tilesSelected(this);
	});
	
	$('#b_autotiles').click(function() {
		$('#autotiles').show();
		$('#tileset').hide();
		current_type_tiles = "autotile";
		tilesSelected(this);
	});
	
	function tilesSelected(div) {
		$(div).parent().children('li').removeClass('selected');
		$(div).addClass('selected');
	}

	$('.layer').click(function() {
		layer_select.id = $(this).attr('data-id');
		layer_select.canvas = document.getElementById("canvas-map-layer_" + layer_select.id);
		layer_select.ctx = layer_select.canvas.getContext("2d");
		$("#canvas-map-layer_event").hide();
		$("#canvas-cursor").removeClass('cursor_event');
		for (var i=0 ; i < nb_layer ; i++) {
			$("#canvas-map-layer_" + i).css("opacity", layer_select.id == i ? 1 : OPACITY_LAYER);
		}
		$('#button_draw').show();
		$('#button_events').hide();
		$('.layer').removeClass('selected');
		$('#layer_event').removeClass('selected');
		$(this).addClass('selected');
	});
	
	
	

	$('#layer_event').click(function() {
		
		for (var i=0 ; i < nb_layer ; i++) {
			$("#canvas-map-layer_" + i).css("opacity", 1);
		}
		$("#canvas-map-layer_event").show();
		$("#canvas-cursor").addClass('cursor_event');
		layer_select.id = "event";
		$('#button_draw').hide();
		$("#canvas-cursor").hide();
		$('#button_events').show();
		$('.layer').removeClass('selected');
		$(this).addClass('selected');
		current_tools = "event";
	});
	
	$('#canvas-map').disableSelection();
	
	$('#canvas-map-layer, #canvas-cursor').hover(function() {
		if (!$("#canvas-cursor").hasClass('cursor_event')) $("#canvas-cursor").show();
	}, function() {
		$("#canvas-cursor").hide();
	});
	
	var render = (function(global) {
	
		var docStyle = document.documentElement.style;
		
		var engine;
		if (global.opera && Object.prototype.toString.call(opera) === '[object Opera]') {
			engine = 'presto';
		} else if ('MozAppearance' in docStyle) {
			engine = 'gecko';
		} else if ('WebkitAppearance' in docStyle) {
			engine = 'webkit';
		} else if (typeof navigator.cpuClass === 'string') {
			engine = 'trident';
		}
		
		var vendorPrefix = {
			trident: 'ms',
			gecko: 'Moz',
			webkit: 'Webkit',
			presto: 'O'
		}[engine];
		
		var helperElem = document.createElement("div");
		var undef;
		var content = document.getElementById("canvas-map-layer");
		var cursor = document.getElementById("canvas-cursor");

		var perspectiveProperty = vendorPrefix + "Perspective";
		var transformProperty = vendorPrefix + "Transform";
		
		if (helperElem.style[perspectiveProperty] !== undef) {
			
			return function(left, top, zoom) {
				cursor.style[transformProperty + "Origin"] = "0 0";
				cursor.style[transformProperty] = 'translate3d(' + (-left) + 'px,' + (-top) + 'px,0) scale(' + zoom + ')';
				content.style[transformProperty + "Origin"] = "0 0";
				content.style[transformProperty] = 'translate3d(' + (-left) + 'px,' + (-top) + 'px,0) scale(' + zoom + ')';
				
			};	
			
		} else if (helperElem.style[transformProperty] !== undef) {
			
			return function(left, top, zoom) {
				content.style[transformProperty] = 'translate(' + (-left) + 'px,' + (-top) + 'px) scale(' + zoom + ')';
			};
			
		} else {
			
			return function(left, top, zoom) {
				content.style.marginLeft = left ? (-left/zoom) + 'px' : '';
				content.style.marginTop = top ? (-top/zoom) + 'px' : '';
				content.style.zoom = zoom || '';
			};
			
		}
	})(this);
	
	var ZOOM_MIN = 0.3;
	var ZOOM_MAX = 1.2;
	var ZOOM_STEP = 0.1;
	
	$('#slider-zoom').slider({
		min: ZOOM_MIN,
		max: ZOOM_MAX,
		value: 1,
		step: ZOOM_STEP,
		slide: function(e, ui) {
			scroller.zoomTo(ui.value, true);
			currentZoom = ui.value;
		}
	});
	
	var scroller = new Scroller(render, {
		zooming: true,
		minZoom: ZOOM_MIN,
		maxZoom: ZOOM_MAX
	});

	
	$('#zoom_in').click(function() {
		var val = $('#slider-zoom').slider('value');
		if (val + ZOOM_STEP < ZOOM_MAX) {
			val += ZOOM_STEP;
		}
		$('#slider-zoom').slider('value', val);
		scroller.zoomTo(val, true);
		currentZoom = val;
		$("#canvas-map").jScrollPane();
	});
	$('#zoom_out').click(function() {
		var val = $('#slider-zoom').slider('value');
		if (val - ZOOM_STEP > ZOOM_MIN) {
			val -= ZOOM_STEP;
		}
		$('#slider-zoom').slider('value', val);
		scroller.zoomTo(val, true);
		currentZoom = val;
		$("#canvas-map").jScrollPane();
	});
	
	/*$('#add_event').click(function() {
		
	});*/
	
	

	new Window("#add_event", {
		width: 400,
		height: 400,
		title: LANG['ADD_TITLE'],
	}, function(layout, attr) {
		var _list = [];
		$.each(ListEventType._type, function(id, val) {
			_list.push({
				data:{id: id},
				content: val.name
			});
			if (val.params.create) val.params.create(layout);
		});
		var list_map = layout.addList(_list, {
			id: "list_event",
			scroll: false,
			size: 'milarge'
		}, function(attr) {
			
		});
		layout.addButton(LANG["CANCEL"], "quit_list_event", "cancel", {bottom: true});

		var pos_cursor = $('#layer-map-event .cursor-event');
		
		list_map.children('li').click(function() {
			var json = $.parseJSON($(this).attr('data-window'));
			layout.win.close();
			if (ListEventType._type[json.id].params.onClick) ListEventType._type[json.id].params.onClick(JSON.stringify({
				title: LANG['ADD_EVENT'],
				position_x: pos_cursor.attr('data-x'),
				position_y: pos_cursor.attr('data-y'),
				type: json.id,
				data: {}
			}));
		});
		
	});
	
	
	

	var _win = new Window("#manage_maps", {
		width: 500,
		height: "auto",
		title: LANG['MANAGE_MAPS']
	}, function(layout_map, attr) {
		Ajax.dataMaps(function(data_maps) {
			var array = [];
			var max_id = 1,
			html = "";
			$.each(data_maps, function(key, value) { 
			 value.id = key;
			 value.type = "edit";
			 html = '<table width="100%">\
				<tr>\
					<!--<td><div class="thumb_map"></div></td>-->\
					<td><h2>' + value.name + '</h2>\
						<p>Size: ' + value._width + '*' + value._height + ' tiles</p>\
					</td>\
					<td><div class="edit_map icon_16px icon_edit"></div><div class="delete_map icon_16px icon_delete"></div></td>\
				</tr>\
			 </table>';
			 if (key > max_id) {
				max_id = parseInt(key);
			 }
			  array.push({
				data: value,
				content: html
			  });
			});
			var list_map = layout_map.addList(array, {
				id: "list_map"
			}, function(attr) {
				layout_map.win.close();
				$('#save').trigger('click');
				loadEditorMap(attr);
			});
			
			layout_map.addButton(LANG["ADD_MAP"], "add_map", function() {
	
			}, {bottom: true, data: {type: "add"}});

			layout_map.addButton(LANG["CANCEL"], "quit_map", "cancel", {bottom: true});
			
			_win.addScrollBar();
			
			
			new Window(".edit_map", {title: LANG["EDIT_MAP"], height: 500, data: function() {
				return $(this).parents('li');
			}}, layoutWindowMap);
			new Window("#add_map", {title: LANG["ADD_MAP"], height: 500}, layoutWindowMap);
			
			new WindowConfirm(".delete_map", {
				text: LANG['DELETE_MAP_CONFIRM'],
				data: function() {
					return $(this).parents('li');
				}
			}, function(data, e) {
				var id = e.data.id;
				delete data_maps[id];
				Ajax.updateInfoMap(id, "delete", data_maps, null, function(ret) {
					displayInfoAjax("", "", ret);
					if (ret) {
						layout_map.win.refresh();
					}
				});
			});
			
			function layoutWindowMap(layout, attr) {
	
				var defaults = {
					name: "",
					_width: 20,
					_height: 15,
					type: "add"
				}
				
				var data_submit = {id: attr.id};
				var is_add = attr.type == "add";
				
				attr = $.extend({}, defaults, attr);
				layout.addInput("name",  is_add ? "MAP-" + (max_id+1) : attr.name, {
					label: LANG['NAME']
				});
				
				layout.addContainer("size", 3, {
					width: [50, 50, 150]
				});
				
				var text = layout.addText(LANG['SIZE_NO_RECOMMEND'], "no_recommend", {
					ret_p: true,
					container: ["size", 3],
				});
				
				showText(attr._width > attr._height ? attr._width : attr._height);

				layout.addInput("_width",  attr._width, {
					label: LANG['WIDTH'],
					type: "number",
					min: 20,
					max: 200,
					container: ["size", 1],
					width: "50px",
					onChangeRealTime: showText
				});
				
				layout.addInput("_height", attr._height, {
					label: LANG['HEIGHT'],
					type: "number",
					min: 15,
					max: 200,
					container: ["size", 2],
					width: "50px",
					onChangeRealTime: showText
				});
				
				function showText(val) {
					if (val > 100) {
						text.show();
					}
					else {
						text.hide();
					}
				}
				
				layout.addComboBox("tileset", layout.drawListData("tilesets", "name"), {
					label: LANG['TILESET'],
					_default: attr.tileset
				});
				
				layout.addComboBox("autotiles", layout.drawListData("autotiles", "name", true), {
					label: LANG['AUTOTILES'],
					_default: attr.autotiles
				});
				
				layout.addInputMaterial("bgm", "bgm", nameMaterial(attr.bgm), attr.bgm, function(data) {
				}, {
					label: LANG['BGM']
				});
				
				layout.addInputMaterial("bgs", "bgs", nameMaterial(attr.bgs), attr.bgs, function(data) {
				}, {
					label: LANG['BGS']
				});
				
				layout.addButton(LANG["OK"], "ok_propreties_map", submit_map, {bottom: true, submit: true, data: data_submit});
				layout.addButton(LANG["CANCEL"], "quit_propreties_map", "cancel", {bottom: true});
				
				
				
				 function submit_map(data, e) {
					var id = e.data.id;
					var type = "edit";
					if (is_add) {
						id = max_id+1;
						type = "add";
					}
					var obj = {}
					data.id = id;
					
					
					obj[id] = data;
					

					Ajax.updateInfoMap(id, type, data_maps, obj, function(ret) {
						displayInfoAjax("", "", ret);
						if (type == "edit") {
							if (id == current_map_id) {
								_memorize("map", obj[id]);
							}
							layout_map.win.refresh();
						}
						else {
							layout_map.win.close();
							$('#save').trigger('click');
							loadEditorMap(obj[id]);
						}
					});
				}
				
			}
		
		});
	});
	
	
};
