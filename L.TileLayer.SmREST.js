L.TileLayer.SmREST = L.TileLayer.extend({

	options: {
		//如果有layersID，则是在使用专题图
		layersID: null,
		//如果为 true，则将请求重定向到瓦片的真实地址；如果为 false，则响应体中是瓦片的字节流
		redirect: false,
		transparent: true,
		cacheEnabled: true,
		clipRegionEnabled: false,
		//地图显示裁剪的区域
		clipRegion: null,
		//请求的地图的坐标参考系统。 如：prjCoordSys={"epsgCode":3857}
		prjCoordSys: null,
		//地图对象在同一范围内时，是否重叠显示
		overlapDisplayed: false,
		//避免地图对象压盖显示的过滤选项
		overlapDisplayedOptions: null,
		//切片版本名称，cacheEnabled 为 true 时有效。
		tileversion: null,
		crs: null,
		// serverType: ServerType.ISERVER,
		format: 'png',
		//启用托管地址。
		tileProxy: null,
		// attribution: Attributions.Common.attribution
	},

	initialize: function (url, options) {
		this._url = url;
		L.TileLayer.prototype.initialize.apply(this, arguments);
		L.setOptions(this, options);
		L.stamp(this);

		//当前切片在切片集中的index
		this.tileSetsIndex = -1;
		this.tempIndex = -1;
	},

	createTile: function (coords, done) {
		var tile = document.createElement('img');

		L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
		L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));

		if (this.options.crossOrigin || this.options.crossOrigin === '') {
			tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
		}

		tile.alt = '';
		tile.setAttribute('role', 'presentation');
		tile.src = this.getTileUrl(coords);

		return tile;
	},
    /**
     * @private
     * @function L.supermap.tiledMapLayer.prototype.onAdd
     * @description 添加地图。
     * @param {L.Map} map - 待添加的影像地图参数。
     */
	onAdd: function (map) {
		this._crs = this.options.crs || map.options.crs;
		L.TileLayer.prototype.onAdd.call(this, map);
	},

    /**
     * @function L.supermap.tiledMapLayer.prototype.getTileUrl
     * @description 根据行列号获取瓦片地址。
     * @param {Object} coords - 行列号。
     * @returns {string} 瓦片地址。
     */
	getTileUrl: function (coords) {
		var scale = this.getScaleFromCoords(coords);
		var layerUrl = this._getLayerUrl();
		var tileUrl = layerUrl + "&scale=" + scale + "&x=" + coords.x + "&y=" + coords.y;
		//支持代理
		if (this.options.tileProxy) {
			tileUrl = this.options.tileProxy + encodeURIComponent(tileUrl);
		}
		if (!this.options.cacheEnabled) {
			tileUrl += "&_t=" + new Date().getTime();
		}
		return tileUrl;
	},

    /**
     * @function L.supermap.tiledMapLayer.prototype.getScale
     * @description 根据缩放级别获取比例尺。
     * @param {number} zoom - 缩放级别。
     * @returns {number} 比例尺。
     */
	getScale: function (zoom) {
		var me = this;
		//返回当前比例尺
		var z = zoom || me._map.getZoom();
		return me.scales[z];
	},

    /**
     * @function L.supermap.tiledMapLayer.prototype.getScaleFromCoords
     * @description 通过行列号获取比例尺。
     * @param {Object} coords - 行列号。
     * @returns {number} 比例尺。
     */
	getScaleFromCoords: function (coords) {
		var me = this,
			scale;
		if (me.scales && me.scales[coords.z]) {
			return me.scales[coords.z];
		}
		me.scales = me.scales || {};
		scale = me.getDefaultScale(coords);
		me.scales[coords.z] = scale;
		return scale;
	},

    /**
     * @private
     * @function L.supermap.tiledMapLayer.prototype.getDefaultScale
     * @description 获取默认比例尺信息。
     * @param {Object} coords - 坐标对象参数。
     */
	getDefaultScale: function (coords) {
		var me = this,
			crs = me._crs;
		if (crs.scales) {
			return crs.scales[coords.z];
		} else {
			var tileBounds = me._tileCoordsToBounds(coords);
			var ne = crs.project(tileBounds.getNorthEast());
			var sw = crs.project(tileBounds.getSouthWest());
			var tileSize = me.options.tileSize;
			var resolution = Math.max(
				Math.abs(ne.x - sw.x) / tileSize,
				Math.abs(ne.y - sw.y) / tileSize
			);
			var mapUnit = 'METER'
			if (crs.code) {
				var array = crs.code.split(':');
				if (array && array.length > 1) {
					var code = parseInt(array[1]);
					mapUnit = code && code >= 4000 && code <= 5000 ? 'DEGREE' : 'METER';
				}
			}
			return me.resolutionToScale(resolution, 96, mapUnit);
		}
	},

	resolutionToScale: function (resolution, dpi, mapUnit) {
		var inchPerMeter = 1 / 0.0254;
		// 地球半径。
		var meterPerMapUnit = this.getMeterPerMapUnit(mapUnit);
		var scale = resolution * dpi * inchPerMeter * meterPerMapUnit;
		scale = 1 / scale;
		return scale;
	},
	getMeterPerMapUnit: function (mapUnit) {
		var earchRadiusInMeters = 6378137;
		var meterPerMapUnit;
		if (mapUnit === 'METER') {
			meterPerMapUnit = 1;
		} else if (mapUnit === 'DEGREE') {
			// 每度表示多少米。
			meterPerMapUnit = Math.PI * 2 * earchRadiusInMeters / 360;
		} else if (mapUnit === 'KILOMETER') {
			meterPerMapUnit = 1.0E-3;
		} else if (mapUnit === 'INCH') {
			meterPerMapUnit = 1 / 2.5399999918E-2;
		} else if (mapUnit === 'FOOT') {
			meterPerMapUnit = 0.3048;
		} else {
			return meterPerMapUnit;
		}
		return meterPerMapUnit;
	},

    /**
     * @function L.supermap.tiledMapLayer.prototype.setTileSetsInfo
     * @description 设置瓦片集信息。
     * @param {Object} tileSets - 瓦片对象集。
     */
	setTileSetsInfo: function (tileSets) {
		this.tileSets = tileSets;
		if (L.Util.isArray(this.tileSets)) {
			this.tileSets = this.tileSets[0];
		}
		if (!this.tileSets) {
			return;
		}
        /**
         * @event L.supermap.tiledMapLayer#tilesetsinfoloaded
         * @description 瓦片集信息设置完成后触发。
         * @property {Array.<Object>} tileVersions  - 瓦片集信息。
         */
		this.fire('tilesetsinfoloaded', {
			tileVersions: this.tileSets.tileVersions
		});
		this.changeTilesVersion();
	},

    /**
     * @function L.supermap.tiledMapLayer.prototype.lastTilesVersion
     * @description 请求上一个版本切片，并重新绘制。
     */
	lastTilesVersion: function () {
		this.tempIndex = this.tileSetsIndex - 1;
		this.changeTilesVersion();
	},

    /**
     * @function L.supermap.tiledMapLayer.prototype.nextTilesVersion
     * @description 请求下一个版本切片，并重新绘制。
     */
	nextTilesVersion: function () {
		this.tempIndex = this.tileSetsIndex + 1;
		this.changeTilesVersion();
	},

    /**
     * @function L.supermap.tiledMapLayer.prototype.changeTilesVersion
     * @description 切换到某一版本的切片，并重绘。通过 this.tempIndex 保存需要切换的版本索引
     */
	changeTilesVersion: function () {
		var me = this;
		//切片版本集信息是否存在
		if (me.tileSets == null) {
			//版本信息为空，重新查询，查询成功继续跳转到相应的版本
			//me.getTileSetsInfo();
			return;
		}
		if (me.tempIndex === me.tileSetsIndex || this.tempIndex < 0) {
			return;
		}
		//检测index是否可用
		var tileVersions = me.tileSets.tileVersions;
		if (tileVersions && me.tempIndex < tileVersions.length && me.tempIndex >= 0) {
			var name = tileVersions[me.tempIndex].name;
			var result = me.mergeTileVersionParam(name);
			if (result) {
				me.tileSetsIndex = me.tempIndex;
                /**
                 * @event L.supermap.tiledMapLayer#tileversionschanged
                 * @description 切片的版本切换和重绘成功之后触发。
                 * @property {Object} tileVersion  - 该版本的切片。
                 */
				me.fire('tileversionschanged', {
					tileVersion: tileVersions[me.tempIndex]
				});
			}
		}
	},

    /**
     * @function L.supermap.tiledMapLayer.prototype.updateCurrentTileSetsIndex
     * @description 手动设置当前切片集索引，目前主要提供给控件使用。
     * @param {number} index - 索引值。
     */
	updateCurrentTileSetsIndex: function (index) {
		this.tempIndex = index;
	},

    /**
     * @function L.supermap.tiledMapLayer.prototype.mergeTileVersionParam
     * @description 更改URL请求参数中的切片版本号，并重绘。
     * @param {string} version - 切片版本号。
     * @returns {boolean} 是否成功。
     */
	mergeTileVersionParam: function (version) {
		if (version) {
			this.requestParams["tileversion"] = version;
			this._paramsChanged = true;
			this.redraw();
			this._paramsChanged = false;
			return true;
		}
		return false;
	},

	_getLayerUrl: function () {
		if (this._paramsChanged) {
			this._layerUrl = this._createLayerUrl();
		}
		return this._layerUrl || this._createLayerUrl();
	},

	_createLayerUrl: function () {
		var me = this;
		var layerUrl = me._url + "/tileImage." + this.options.format + "?";
		layerUrl += encodeURI(me._getRequestParamString());
		layerUrl = this._appendCredential(layerUrl);
		this._layerUrl = layerUrl;
		return layerUrl;
	},

	_getRequestParamString: function () {
		this.requestParams = this.requestParams || this._getAllRequestParams();
		var params = [];
		for (var key in this.requestParams) {
			params.push(key + "=" + this.requestParams[key]);
		}
		return params.join('&');
	},

	_getAllRequestParams: function () {
		var me = this,
			options = me.options || {},
			params = {};

		var tileSize = this.options.tileSize;
		if (!(tileSize instanceof L.Point)) {
			tileSize = L.point(tileSize, tileSize);
		}
		params["width"] = tileSize.x;
		params["height"] = tileSize.y;

		params["redirect"] = options.redirect === true;
		params["transparent"] = options.transparent === true;
		params["cacheEnabled"] = !(options.cacheEnabled === false);

		if (options.prjCoordSys) {
			params["prjCoordSys"] = JSON.stringify(options.prjCoordSys);
		}

		if (options.layersID) {
			params["layersID"] = options.layersID.toString();
		}

		if (options.clipRegionEnabled && options.clipRegion instanceof L.Path) {
			options.clipRegion = Util.toSuperMapGeometry(options.clipRegion.toGeoJSON());
			options.clipRegion = CommonUtil.toJSON(ServerGeometry.fromGeometry(options.clipRegion));
			params["clipRegionEnabled"] = options.clipRegionEnabled;
			params["clipRegion"] = JSON.stringify(options.clipRegion);
		}

		//切片的起始参考点，默认为地图范围的左上角。
		var crs = me._crs;
		if (crs.options && crs.options.origin) {
			params["origin"] = JSON.stringify({
				x: crs.options.origin[0],
				y: crs.options.origin[1]
			});
		} else if (crs.projection && crs.projection.bounds) {
			var bounds = crs.projection.bounds;
			var tileOrigin = L.point(bounds.min.x, bounds.max.y);
			params["origin"] = JSON.stringify({
				x: tileOrigin.x,
				y: tileOrigin.y
			});
		}

		if (options.overlapDisplayed === false) {
			params["overlapDisplayed"] = false;
			if (options.overlapDisplayedOptions) {
				params["overlapDisplayedOptions"] = me.overlapDisplayedOptions.toString();
			}
		} else {
			params["overlapDisplayed"] = true;
		}

		if (options.cacheEnabled === true && options.tileversion) {
			params["tileversion"] = options.tileversion.toString();
		}

		return params;
	}
});

L.tileLayer.SmREST = function (url, options) {
	return new L.TileLayer.SmREST(url, options);
};


