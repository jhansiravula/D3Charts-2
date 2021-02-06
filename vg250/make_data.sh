#brew install gdal
#npm install -g d3-dsv
#npm install -g d3-geo-projection
#npm install -g ndjson-cli
#npm install -g topojson

#https://daten.gdz.bkg.bund.de/produkte/vg/vg250_ebenen_0101/aktuell/vg250_01-01.utm32s.shape.ebenen.zip

#https://ec.europa.eu/eurostat/de/web/products-datasets/product?code=demo_r_d3dens
#https://appsso.eurostat.ec.europa.eu/nui/show.do?dataset=demo_r_d3dens&lang=de

# prepare data
csv2json -n demo_r_d3dens/demo_r_d3dens_1_Data.csv > table-1.ndjson
ndjson-map '{id: d.GEO, year: +d.TIME, value: +(d.Value.replace(/ /g, ""))}' < table-1.ndjson > table-2.ndjson
ndjson-filter 'd.year == 2018' < table-2.ndjson > table-3.ndjson
cp table-3.ndjson table.ndjson

# convert shape file to geojson, reprojecting to standard lat / lon
ogr2ogr -f GeoJSON -t_srs EPSG:4326 vg250.geojson vg250_01-01.utm32s.shape.ebenen/vg250_ebenen_0101/VG250_KRS.shp

# apply projection
geoproject 'd3.geoAzimuthalEqualArea().rotate([-10, -52]).fitSize([960, 470], d)' < vg250.geojson > vg250-proj.geojson
geo2svg -w 960 -h 960 < vg250-proj.geojson > vg250.svg

# convert to ndjson and join with data
ndjson-split 'd.features' < vg250-proj.geojson > vg250-1.ndjson
ndjson-map 'd.id = d.properties.NUTS, d' < vg250-1.ndjson > vg250-2.ndjson
ndjson-join 'd.id' vg250-2.ndjson table.ndjson > vg250-3.ndjson
ndjson-map 'd[0].properties = {name: d[0].properties.GEN, year: d[1].year, value: d[1].value}, d[0]' < vg250-3.ndjson > vg250-4.ndjson
cp vg250-4.ndjson vg250.ndjson

# convert to topojson, reduce file size
geo2topo -n counties=vg250.ndjson > vg250.json
toposimplify -p 1 -f < vg250.json > vg250-simplified.json
topoquantize 1e5 < vg250-simplified.json > vg250-quantized.json
cp vg250-quantized.json data.json

rm *.geojson *.ndjson vg250*.json vg250.svg
