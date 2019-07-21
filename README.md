## Leaflet add SuperMap REST map

```
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './assets/js/L.TileLayer.SmREST'
```

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
