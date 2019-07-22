## Leaflet add SuperMap REST map


[![npm version](https://badge.fury.io/js/smrest.svg)](https://badge.fury.io/js/smrest)

1. install this plugin
```
npm i smrest
```

2. import this plugin
```
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'smrest'
```

3. use  L.tileLayer.SmREST(url,option) add a SuperMap rest layer

```
url: like "http://support.supermap.com.cn:8090/iserver/services/map-world/rest/maps/World"
```


```
option:{
		transparent: true,
		cacheEnabled: true,
		clipRegionEnabled: false,
		//地图显示裁剪的区域。(geometry)
		clipRegion: null,
		//请求的地图的坐标参考系统。 如：prjCoordSys={"epsgCode":3857}
		prjCoordSys: null,
		//地图对象在同一范围内时，是否重叠显示
		overlapDisplayed: false,
		//避免地图对象压盖显示的过滤选项
		overlapDisplayedOptions: null,
		//切片版本名称，cacheEnabled 为 true 时有效。
		tileversion: null,
		// serverType: ServerType.ISERVER,
		format: 'png',
} 
```
other options extends L.TileLayer 
[https://leafletjs.com/reference-1.5.0.html#tilelayer]


```
 L.tileLayer.SmREST(
          "http://support.supermap.com.cn:8090/iserver/services/map-world/rest/maps/World",
          {
            noWrap: true,
            bounds: [[-90, -180], [90, 180]]
          }
        )
        .addTo(map);
```


