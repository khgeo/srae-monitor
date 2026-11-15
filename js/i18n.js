// English / Khmer interface text. Add a language by adding another dictionary with the same keys.

export const CROPS = ['rice_wet', 'rice_dry', 'cassava', 'maize', 'soybean', 'mungbean', 'sugarcane', 'cashew', 'mango', 'rubber', 'pepper', 'durian', 'longan', 'banana', 'vegetables', 'other'];
export const NOTE_CATS = ['disease', 'pest', 'weed', 'water', 'nutrient', 'damage', 'other'];

const en = {
  'app.tagline': 'Satellite crop monitoring',
  'ui.language': 'Language', 'ui.help': 'Help', 'ui.settings': 'Settings', 'ui.cancel': 'Cancel', 'ui.save': 'Save',
  'ui.delete': 'Delete', 'ui.edit': 'Edit', 'ui.ok': 'OK', 'ui.close': 'Close', 'ui.confirm': 'Please confirm', 'ui.retry': 'Retry',
  'ui.loading': 'Loading…', 'ui.stop': 'Stop', 'ui.collapse': 'Collapse', 'ui.back': 'Back to fields', 'ui.zoom': 'Zoom to field',
  'unit.ha': 'ha',

  'fields.title': 'My fields', 'fields.draw': 'Draw field', 'fields.import': 'Import', 'fields.more': 'More',
  'fields.demo': 'Add demo field (Battambang rice)', 'fields.exportAll': 'Export all fields (GeoJSON)', 'fields.backup': 'Backup all data (JSON)',
  'fields.search': 'Search fields…', 'fields.defaultName': 'Field {n}', 'fields.total': '{n} fields · {ha} ha',
  'fields.emptyTitle': 'No fields yet',
  'fields.emptyText': 'Draw a field boundary on the map, import GeoJSON / KML / zipped Shapefile, or try the demo field.',
  'fields.importHint': 'Tip: you can also drag & drop files onto the map.',

  'field.name': 'Field name', 'field.crop': 'Crop', 'field.variety': 'Variety', 'field.varietyPh': 'e.g. Phka Rumduol',
  'field.sowing': 'Sowing date', 'field.harvest': 'Harvest date', 'field.owner': 'Farmer / owner', 'field.color': 'Outline colour',
  'field.notes': 'Notes', 'field.areaIs': 'Area: {ha} ha (calculated from the boundary).', 'field.newTitle': 'New field',
  'field.editTitle': 'Edit field', 'field.confirmDelete': 'Delete “{name}” and its scouting notes? This cannot be undone.',
  'field.location': 'Location', 'field.elevation': 'Elevation', 'field.coords': 'Centre (lat, lon)',

  'tabs.overview': 'Status', 'tabs.chart': 'Index chart', 'tabs.weather': 'Weather', 'tabs.zones': 'Zones', 'tabs.notes': 'Scouting',

  'trace.btn': 'Trace field', 'trace.tip': 'Click inside a field on the satellite map to outline it automatically',
  'trace.hint': 'Click inside a field to outline it automatically. Shift+click (or Add part) adds a missed part. Enter saves and you can click the next field; Esc stops.',
  'trace.add': 'Add part', 'trace.addTip': 'Next click adds a missed part (same as Shift+click)',
  'trace.tol': 'Tolerance', 'trace.clear': 'Clear', 'trace.save': 'Save field', 'trace.done': 'Done', 'trace.area': '{ha} ha',
  'trace.loading': 'Reading satellite imagery…',
  'trace.zoomIn': 'Zoom in closer to the field (zoom 15 or more) to trace it.',
  'trace.none': 'No clear field boundary found here. Try a higher tolerance, or draw the field.',
  'trace.edge': 'The shape spread too far: the boundary is unclear here. Lower the tolerance or draw the field.',
  'trace.apart': 'That part does not touch the current shape. Click inside the same field.',
  'trace.existing': 'This spot is already inside one of your fields.',
  'trace.saved': 'Field saved. Click the next field, or press Done.',
  'trace.imgFail': 'Could not read the satellite imagery here. Check the internet connection or draw the field.',
  'draw.hint': 'Click on the map to add boundary points. Click the first point, double-click or press Enter to finish. Backspace undoes, Esc cancels.',
  'edit.hint': 'Drag the white corners to reshape. Drag a small blue dot to add a corner; right-click a corner to remove it. Then press Save shape.',
  'edit.save': 'Save shape', 'edit.cancel': 'Cancel',

  'map.index': 'Index', 'map.opacity': 'Opacity', 'map.basemap': 'Base map', 'map.loading': 'Processing Sentinel-2 image…',
  'bm.satellite': 'Satellite', 'bm.streets': 'Streets', 'bm.topo': 'Topographic',
  'tl.prev': 'Older image', 'tl.next': 'Newer image',

  'scenes.searching': 'Searching Sentinel-2 images…', 'scenes.none': 'No Sentinel-2 images found for this period. Try raising the cloud limit in Settings.',
  'scenes.error': 'Could not reach the satellite catalogue.', 'scenes.loadError': 'Could not load this image. Try another date.',

  'legend.mean': 'Mean', 'legend.min': 'Min', 'legend.max': 'Max', 'legend.clear': 'Clear', 'legend.cloud': 'Cloud/shadow',
  'legend.nodata': 'No data', 'legend.noValid': 'The field is fully covered by cloud on this date.', 'legend.trueColor': 'Natural colour (bands 4-3-2). Clouds are hatched.',

  'ov.ndvi': 'Latest NDVI', 'ov.since': 'since {d}', 'ov.loading': 'Loading images…', 'ov.noData': 'No image yet',
  'ov.daysAgo': '{n} days ago', 'ov.inDays': 'in {n} days', 'ov.setSowing': 'Set date', 'ov.area': 'Area', 'ov.status': 'Crop status',
  'ov.openChart': 'Open index chart', 'ov.weather': 'Weather', 'ov.openWeather': 'Weather details', 'ov.info': 'Field information',
  'ov.report': 'Field report', 'ov.editShape': 'Edit shape', 'ov.exportField': 'Export GeoJSON',

  'status.bare': 'Bare soil, water or very young crop (NDVI below 0.2).',
  'status.sparse': 'Sparse vegetation — early growth or stressed crop.',
  'status.moderate': 'Moderate vegetation — crop is developing.',
  'status.dense': 'Dense, healthy vegetation.',
  'status.veryDense': 'Very dense vegetation — peak growth.',
  'status.uniform': 'Growth is uniform across the field.',
  'status.someVar': 'Some variation inside the field.',
  'status.uneven': 'Uneven growth — check the low areas on the map or create zones.',

  'chart.period': 'Period', 'chart.last12': 'Last 12 months', 'chart.thisYear': 'This calendar year', 'chart.season': 'This season (from sowing)',
  'chart.comparePrev': 'Compare with previous year', 'chart.calc': 'Calculate {idx} history', 'chart.progress': 'Processed {done} / {total} images',
  'chart.done': 'Index history updated ({n} images processed).', 'chart.points': '{n} clear observations',
  'chart.empty': 'No values yet — press Calculate. Each image is downloaded and processed in your browser, so this can take a few minutes; results are saved for next time.',
  'chart.help': 'Line: field mean. Shaded band: 10th–90th percentile (field variability). Click a point to show that image on the map.',
  'chart.table': 'Values table', 'chart.csv': 'Download CSV', 'chart.mean': 'mean', 'chart.prevYear': 'Previous year', 'chart.date': 'Date',

  'wx.today': 'Today', 'wx.rainPast7': 'Rain, last 7 days', 'wx.rainNext7': 'Rain, next 7 days', 'wx.soil': 'Soil moisture',
  'wx.chartTitle': 'Temperature and rainfall (30 days + 14-day forecast)', 'wx.accTitle': 'Accumulated since {d}',
  'wx.accSummary': '{gdd} growing degree days (base {base} °C), {rain} mm rain, {et0} mm reference evapotranspiration.',
  'wx.soilTitle': 'Soil moisture, 3–9 cm (volumetric)', 'wx.soilLabel': 'Soil moisture',
  'wx.rain': 'Rain (mm)', 'wx.tmax': 'Max temp', 'wx.tmin': 'Min temp', 'wx.gdd': 'Growing degree days', 'wx.gddUnit': '°C·days',
  'wx.rainSince': 'Rain since sowing', 'wx.error': 'Weather data is not available right now.',
  'wx.source': 'Weather: Open-Meteo (forecast models and ERA5 reanalysis). Shaded area = forecast.',

  'zones.title': 'Productivity zones', 'zones.intro': 'Split the field into management zones from the vegetation index, e.g. for variable-rate fertiliser or targeted scouting.',
  'zones.count': 'Zones', 'zones.method': 'Method', 'zones.quantile': 'Equal area (quantiles)', 'zones.equal': 'Equal interval', 'zones.kmeans': 'Natural groups (k-means)',
  'zones.source': 'Based on', 'zones.current': 'Current image', 'zones.avg': 'Average of best images',
  'zones.smooth': 'Smooth small patches', 'zones.create': 'Create zones', 'zones.result': 'Zones',
  'zones.zone': 'Zone', 'zones.rate': 'Rate', 'zones.total': 'Total', 'zones.totalProduct': 'kg total',
  'zones.showOnMap': 'Show zones on map', 'zones.exportGeo': 'Export zones (GeoJSON)', 'zones.exportCsv': 'Export table (CSV)',
  'zones.rateHelp': 'Enter an application rate per zone (e.g. kg/ha). Rates are included in the exported GeoJSON for use in GIS or machinery software.',
  'zones.avgOf': 'Average of {n} clear images: {dates}', 'zones.needTs': 'Not enough clear images processed yet — calculate the index chart first. Using the current image.',
  'zones.noScene': 'Load an image first.', 'zones.tooFew': 'Too few clear pixels to create zones.',

  'notes.title': 'Scouting notes', 'notes.add': 'Add note on map', 'notes.export': 'Export (GeoJSON)', 'notes.hint': 'Click on the map where you observed the problem. Esc to cancel.',
  'notes.intro': 'Record observations in the field: pests, disease, weeds, water problems. Notes are stored in this browser.',
  'notes.empty': 'No notes for this field yet.', 'notes.cat': 'Category', 'notes.date': 'Date', 'notes.text': 'Observation', 'notes.photo': 'Photo (optional)',
  'notes.new': 'New scouting note', 'notes.edit': 'Edit note', 'notes.zoom': 'Show on map', 'notes.confirmDel': 'Delete this note?', 'notes.photoErr': 'Could not read the photo.',
  'cat.disease': 'Disease', 'cat.pest': 'Pests', 'cat.weed': 'Weeds', 'cat.water': 'Flood / drought', 'cat.nutrient': 'Nutrient deficiency', 'cat.damage': 'Damage', 'cat.other': 'Other',

  'set.title': 'Settings', 'set.maxCloud': 'Max scene cloud cover (%)', 'set.lookback': 'Show images from last (days)',
  'set.edge': 'Field-edge pixels', 'set.edgeAuto': 'Auto: leave out when possible (recommended)', 'set.edgePure': 'Always leave out', 'set.edgeAll': 'Include (area-weighted)',
  'px.label': 'Sentinel-2 pixels', 'px.value': '{n} pixels (10 m), {pure} fully inside the field', 'px.title': 'Small field',
  'px.intro': 'This field touches {n} Sentinel-2 pixels (10 m × 10 m); only {pure} lie fully inside it. Pixels on the edge mix the crop with bunds, paths and neighbouring plots.',
  'px.tipTiny': 'Too few clean pixels: treat the index as an estimate for this spot, and compare with neighbouring fields rather than reading single values.',
  'px.tip1': 'Use NDVI, EVI or MSAVI: they use the 10 m bands. NDRE, ReCI and NDMI use 20 m bands and suit larger fields.',
  'px.tip2': 'Follow the trend in the Index chart: changes over time are more reliable than one image.',
  'px.tip3': 'Edge pixels are left out of the field mean when there are enough clean pixels (Settings → Field-edge pixels).',
  'px.usedPure': 'Mean from {n} Sentinel-2 pixels ({res} m) fully inside the field; edge pixels left out.',
  'px.usedAll': 'Mean from all {n} Sentinel-2 pixels ({res} m) touching the field, weighted by the share inside it.',
  'set.tsMax': 'Max images per chart run', 'set.tsMinClear': 'Min clear part of field for chart (%)', 'set.gddBase': 'GDD base temperature (°C)',
  'set.collection': 'Sentinel-2 collection', 'set.clearCache': 'Clear cached index values', 'set.backup': 'Backup data', 'set.restore': 'Restore backup',
  'set.wipe': 'Delete all data', 'set.wipeConfirm': 'Delete ALL fields and notes stored in this browser?',

  'msg.tooSmall': 'The field is too small (under 0.01 ha).', 'msg.tooLarge': 'The area is too large (over 20,000 ha). Draw a single field.',
  'msg.largeField': 'Large field: images take longer to load.', 'msg.deleted': 'Field deleted.', 'msg.multiNoEdit': 'Multi-part fields cannot be reshaped here. Edit them in QGIS and import again.',
  'msg.imported': '{n} field(s) imported.', 'msg.skipped': '{n} feature(s) skipped (not polygons).', 'msg.noPolygons': 'No polygons found in the file.',
  'msg.importFail': 'Could not read {name}.', 'msg.restored': 'Backup restored: {fields} fields, {notes} notes.', 'msg.noFields': 'There are no fields yet.',
  'msg.cacheCleared': 'Cached values cleared.', 'msg.storageFull': 'Browser storage is full. Remove photos or old fields.',
  'msg.libFail': 'Map libraries failed to load. Check your internet connection and reload.', 'msg.popup': 'Allow pop-ups to open the report.',

  'report.title': 'Field monitoring report', 'report.print': 'Print / Save as PDF', 'report.history': 'Vegetation index history',
  'report.sources': 'Sources: Copernicus Sentinel-2 L2A via Earth Search (AWS Open Data), Open-Meteo weather, ISRIC SoilGrids 2.0 (CC BY 4.0), soil types by Crocker (1962) via Open Development Cambodia (CC BY 4.0). Generated with Srae Monitor.',
  'map.searchPh': 'Search place or lat, lon', 'map.search': 'Search', 'map.locate': 'My location', 'map.fullscreen': 'Full screen',
  'map.noResults': 'No places found.', 'map.locError': 'Could not get your location. Allow location access and try again.',
  'cmp.btn': 'Compare', 'cmp.tip': 'Compare two dates: map of the change between them', 'cmp.title': 'Change in {idx}', 'cmp.with': 'Compared with',
  'cmp.mean': 'Mean change', 'cmp.strongDec': 'Strong decrease', 'cmp.dec': 'Decrease', 'cmp.slightDec': 'Slight decrease', 'cmp.stable': 'Stable',
  'cmp.slightInc': 'Slight increase', 'cmp.inc': 'Increase', 'cmp.strongInc': 'Strong increase',
  'cmp.trueColor': 'Change maps need a vegetation index — choose NDVI or another index.', 'cmp.noOverlap': 'No part of the field is clear on both dates. Choose another date.',
  'legend.geotiffTitle': 'Download this layer as a GeoTIFF (opens in QGIS / ArcGIS)',
  'stage.title': 'Growth stage', 'stage.day': 'day {n} after sowing', 'stage.expected': 'Expected harvest ≈ {d}', 'stage.harvestShort': 'Expected harvest',
  'stage.beforeSowing': 'Sowing in {n} days', 'stage.done': 'Season complete — ready for harvest', 'stage.noSowing': 'Enter the sowing date to see the growth stage.',
  'stage.note': 'typical durations', 'stage.emergence': 'Emergence', 'stage.seedling': 'Seedling', 'stage.tillering': 'Tillering', 'stage.booting': 'Panicle initiation',
  'stage.heading': 'Heading & flowering', 'stage.grainfill': 'Grain filling', 'stage.maturity': 'Maturity', 'stage.vegetative': 'Vegetative', 'stage.flowering': 'Flowering',
  'stage.podfill': 'Pod filling', 'stage.establishment': 'Establishment', 'stage.canopy': 'Canopy growth', 'stage.bulking': 'Root bulking',
  'stage.germination': 'Germination', 'stage.grandgrowth': 'Grand growth', 'stage.ripening': 'Ripening',
  'fields.sort': 'Sort', 'sort.name': 'Name', 'sort.ndvi': 'NDVI (lowest first)', 'sort.change': 'Biggest NDVI drop', 'sort.area': 'Area (largest first)',
  'fields.checkAll': 'Check all', 'fields.checkTip': 'Get the latest clear Sentinel-2 NDVI for every field',
  'fields.checking': 'Checking {done}/{total}: {name}…', 'fields.checkDone': 'Updated {n} of {total} fields with a recent clear image.',
  'fields.alerts': '{n} need attention', 'fields.dropTip': 'NDVI dropped by 0.05 or more since the previous clear image',
  'map.3d': '3D terrain view', 'map.measure': 'Measure distance and area', 'map.tip3d': '3D view: right-click and drag (or two fingers) to tilt and rotate.',
  'measure.hint': 'Click points to measure. Double-click or Enter to finish; Backspace removes the last point.', 'measure.dist': 'Distance', 'measure.area': 'Area', 'measure.perim': 'Perimeter',
  'alert.title': 'Alerts', 'alert.rain': 'Heavy rain expected {d}: about {mm} mm — check drainage, delay fertiliser.',
  'alert.heat': 'Heat stress: {n} day(s) above 36 °C (up to {t} °C) — critical at flowering.',
  'alert.dry': 'Dry spell: almost no rain for 10 days and none forecast — consider irrigation.',
  'alert.none': 'No weather warnings for the next 7 days.', 'alert.spray': 'Dry days for spraying or fertilising: {d}',
  'wx.forecast7': '7-day forecast',
  'map.loadError': 'The map could not load. Please send this message to the developer',
  'tabs.soil': 'Soil', 'map.soil': 'Soil-type map (Crocker 1962)',
  'soil.title': 'Soil', 'soil.type': 'Soil type', 'soil.texture': 'Texture', 'soil.topsoil': 'Topsoil 0–30 cm', 'soil.subsoil': 'Subsoil 30–60 cm',
  'soil.clay': 'Clay', 'soil.silt': 'Silt', 'soil.sand': 'Sand', 'soil.soc': 'Organic carbon', 'soil.n': 'Total nitrogen',
  'soil.properties': 'Soil properties', 'soil.triangle': 'Soil texture triangle', 'soil.advice': 'Management hints',
  'soil.suitFor': 'Suitability for {crop}', 'soil.suitTitle': 'Which crops suit this soil?',
  'soil.suitNote': 'Indicative rating from topsoil texture, pH and fertility only. Drainage, flooding, slope, depth and climate are not included.',
  'soil.showMap': 'Show soil-type map', 'soil.hideMap': 'Hide soil-type map', 'soil.csv': 'Download soil data (CSV)',
  'soil.srcGithub': 'Soil data: stored in this site (data/soil), built from SoilGrids 2.0 at 250 m.',
  'soil.srcApi': 'Soil data: live from the SoilGrids 2.0 API (250 m).',
  'soil.sources': 'Sources: ISRIC SoilGrids 2.0 (CC BY 4.0); soil types: Crocker (1962) via Open Development Cambodia (CC BY 4.0). Model estimates — confirm with a soil test.',
  'soil.error': 'Soil data could not be loaded.', 'soil.noData': 'No soil data for this location.',
  'soil.notBuilt': 'The soil data files have not been built yet. In the GitHub repository open Actions → “Update soil data” → Run workflow.',
  'soil.mapMissing': 'The soil-type map is not available yet. Run the “Update soil data” workflow in the GitHub repository (Actions tab).',
  'soil.r.veryLow': 'Very low', 'soil.r.low': 'Low', 'soil.r.medium': 'Medium', 'soil.r.high': 'High',
  'soil.ph.extremelyAcid': 'Very strongly acid', 'soil.ph.stronglyAcid': 'Strongly acid', 'soil.ph.slightlyAcid': 'Slightly acid', 'soil.ph.neutral': 'Neutral', 'soil.ph.alkaline': 'Alkaline',
  'tex.sand': 'Sand', 'tex.loamySand': 'Loamy sand', 'tex.sandyLoam': 'Sandy loam', 'tex.loam': 'Loam', 'tex.siltLoam': 'Silt loam', 'tex.silt': 'Silt',
  'tex.sandyClayLoam': 'Sandy clay loam', 'tex.clayLoam': 'Clay loam', 'tex.siltyClayLoam': 'Silty clay loam', 'tex.sandyClay': 'Sandy clay', 'tex.siltyClay': 'Silty clay', 'tex.clay': 'Clay',
  'suit.good': 'Suitable', 'suit.fair': 'Moderately suitable', 'suit.poor': 'Marginal',
  'suit.lim.texture': 'texture', 'suit.lim.acid': 'too acid', 'suit.lim.alkaline': 'too alkaline', 'suit.lim.fertility': 'low fertility',
  'adv.lime': 'Soil is very acid: consider liming (e.g. dolomite) based on a soil test, and use acid-tolerant varieties.',
  'adv.alkaline': 'Soil is alkaline: some micronutrients (zinc, iron) may be less available.',
  'adv.organic': 'Low organic matter: add manure or compost, keep crop residues (do not burn rice straw), consider green manure.',
  'adv.nitrogen': 'Low nitrogen: plan adequate N fertiliser or legumes in rotation.',
  'adv.sandy': 'Light (sandy) soil: holds little water and nutrients — split fertiliser into several small doses and mulch.',
  'adv.lowCec': 'Low CEC: nutrients wash out easily; apply fertiliser little and often, add organic matter.',
  'adv.drainage': 'Heavy clay: ensure good drainage for upland crops (ridges, raised beds).',
  'adv.riceSandy': 'Sandy rice soil: water percolates quickly — keep bunds well maintained and level the field.',
  'adv.soilTest': 'These are 250 m model estimates. A laboratory soil test of your field is the basis for fertiliser rates.',
  'stype.regur.short': 'black cracking clay', 'stype.regur.desc': 'Dark, heavy clay that swells when wet and cracks when dry (Vertisol). Naturally fertile; good for maize, soybean, mung bean and dry-season crops; hard to work and can waterlog.',
  'stype.latosol.short': 'deep red/brown soil', 'stype.latosol.desc': 'Deep, well-drained red or brown soils (Ferralsols/Nitisols), often on basalt. Good structure; suited to rubber, cashew, pepper, fruit trees and upland crops; acid and need nutrient management.',
  'stype.plinthite.short': 'soil with ironstone layer', 'stype.plinthite.desc': 'Soils with a hard ironstone (laterite) layer at shallow depth that limits roots and drainage. Often poor; best for rice or tolerant crops.',
  'stype.podzol.short': 'sandy, acid, low fertility', 'stype.podzol.desc': 'Sandy, acid and leached soils with low nutrient and water holding capacity. Need organic matter and split fertiliser; cassava and cashew tolerate them.',
  'stype.planosol.short': 'hardpan, seasonally wet', 'stype.planosol.desc': 'Light topsoil over a dense, slowly permeable subsoil; waterlogged in the wet season and dry later. Mainly used for rice.',
  'stype.hydromorphic.short': 'poorly drained, rice soil', 'stype.hydromorphic.desc': 'Poorly drained grey soils of lowlands, flooded part of the year. The main rice soils of Cambodia; fertility varies from low to moderate.',
  'stype.coastal.short': 'coastal soil, salinity risk', 'stype.coastal.desc': 'Coastal and estuarine soils; may be saline or acid-sulphate. Check salinity and acidity before cropping.',
  'stype.alluvial.short': 'river alluvium, fertile', 'stype.alluvial.desc': 'Young soils on river and lake deposits (Mekong, Tonle Sap). Generally fertile; suited to rice, vegetables, maize and riverbank (chamkar) crops; flood risk.',
  'stype.lithosol.short': 'shallow, stony', 'stype.lithosol.desc': 'Shallow, stony soils on hills and mountains. Not suited to annual crops; erosion risk — keep under forest or perennial cover.',
  'demo.name': 'Demo rice field (Battambang)',
  'help.title': 'Help — how to use Srae Monitor',
};

const km = {
  'app.tagline': 'តាមដានដំណាំតាមផ្កាយរណប',
  'ui.language': 'ភាសា', 'ui.help': 'ជំនួយ', 'ui.settings': 'ការកំណត់', 'ui.cancel': 'បោះបង់', 'ui.save': 'រក្សាទុក',
  'ui.delete': 'លុប', 'ui.edit': 'កែ', 'ui.ok': 'យល់ព្រម', 'ui.close': 'បិទ', 'ui.confirm': 'សូមបញ្ជាក់', 'ui.retry': 'ព្យាយាមម្ដងទៀត',
  'ui.loading': 'កំពុងផ្ទុក…', 'ui.stop': 'ឈប់', 'ui.collapse': 'បង្រួម', 'ui.back': 'ត្រឡប់ទៅបញ្ជីស្រែ', 'ui.zoom': 'ពង្រីកទៅស្រែ',
  'unit.ha': 'ហិកតា',

  'fields.title': 'ស្រែ/ចម្ការរបស់ខ្ញុំ', 'fields.draw': 'គូរព្រំស្រែ', 'fields.import': 'នាំចូល', 'fields.more': 'បន្ថែម',
  'fields.demo': 'បន្ថែមស្រែសាកល្បង (ស្រូវ បាត់ដំបង)', 'fields.exportAll': 'នាំចេញស្រែទាំងអស់ (GeoJSON)', 'fields.backup': 'បម្រុងទុកទិន្នន័យទាំងអស់ (JSON)',
  'fields.search': 'ស្វែងរកស្រែ…', 'fields.defaultName': 'ស្រែទី {n}', 'fields.total': '{n} កន្លែង · {ha} ហិកតា',
  'fields.emptyTitle': 'មិនទាន់មានស្រែនៅឡើយ',
  'fields.emptyText': 'គូរព្រំស្រែលើផែនទី នាំចូលឯកសារ GeoJSON / KML / Shapefile (zip) ឬសាកល្បងស្រែគំរូ។',
  'fields.importHint': 'គន្លឹះ៖ អាចអូសឯកសារទម្លាក់លើផែនទីបានផងដែរ។',

  'field.name': 'ឈ្មោះស្រែ', 'field.crop': 'ដំណាំ', 'field.variety': 'ពូជ', 'field.varietyPh': 'ឧ. ផ្ការំដួល',
  'field.sowing': 'ថ្ងៃសាបព្រោះ/ដាំ', 'field.harvest': 'ថ្ងៃប្រមូលផល', 'field.owner': 'កសិករ/ម្ចាស់', 'field.color': 'ពណ៌ព្រំ',
  'field.notes': 'កំណត់សម្គាល់', 'field.areaIs': 'ផ្ទៃដី៖ {ha} ហិកតា (គណនាពីព្រំ)។', 'field.newTitle': 'ស្រែថ្មី',
  'field.editTitle': 'កែព័ត៌មានស្រែ', 'field.confirmDelete': 'លុប «{name}» និងកំណត់ត្រាតាមដានរបស់វា? មិនអាចត្រឡប់វិញបានទេ។',
  'field.location': 'ទីតាំង', 'field.elevation': 'កម្ពស់', 'field.coords': 'ចំណុចកណ្ដាល (រយៈទទឹង, រយៈបណ្ដោយ)',

  'tabs.overview': 'ស្ថានភាព', 'tabs.chart': 'ក្រាហ្វសន្ទស្សន៍', 'tabs.weather': 'អាកាសធាតុ', 'tabs.zones': 'តំបន់', 'tabs.notes': 'ការតាមដាន',

  'trace.btn': 'គូសព្រំស្វ័យប្រវត្តិ', 'trace.tip': 'ចុចខាងក្នុងស្រែលើផែនទីផ្កាយរណប ដើម្បីគូសព្រំរបស់វាដោយស្វ័យប្រវត្តិ',
  'trace.hint': 'ចុចខាងក្នុងស្រែ ដើម្បីគូសព្រំស្វ័យប្រវត្តិ។ Shift+ចុច (ឬ បន្ថែមផ្នែក) ដើម្បីបន្ថែមផ្នែកដែលខ្វះ។ Enter រក្សាទុក ហើយចុចស្រែបន្ទាប់បាន។ Esc ឈប់។',
  'trace.add': 'បន្ថែមផ្នែក', 'trace.addTip': 'ការចុចបន្ទាប់បន្ថែមផ្នែកដែលខ្វះ (ដូច Shift+ចុច)',
  'trace.tol': 'ភាពធូរ', 'trace.clear': 'សម្អាត', 'trace.save': 'រក្សាទុកស្រែ', 'trace.done': 'រួចរាល់', 'trace.area': '{ha} ហិកតា',
  'trace.loading': 'កំពុងអានរូបភាពផ្កាយរណប…',
  'trace.zoomIn': 'សូមពង្រីកផែនទីឱ្យជិតស្រែ (កម្រិត ១៥ ឡើងទៅ) ដើម្បីគូសព្រំ។',
  'trace.none': 'រកមិនឃើញព្រំស្រែច្បាស់នៅទីនេះទេ។ សាកល្បងបង្កើនភាពធូរ ឬគូសស្រែដោយដៃ។',
  'trace.edge': 'រាងលាតសន្ធឹងឆ្ងាយពេក៖ ព្រំនៅទីនេះមិនច្បាស់។ បន្ថយភាពធូរ ឬគូសស្រែដោយដៃ។',
  'trace.apart': 'ផ្នែកនោះមិនជាប់នឹងរាងបច្ចុប្បន្នទេ។ សូមចុចខាងក្នុងស្រែតែមួយ។',
  'trace.existing': 'ចំណុចនេះស្ថិតនៅក្នុងស្រែមួយរបស់អ្នករួចហើយ។',
  'trace.saved': 'បានរក្សាទុកស្រែ។ ចុចស្រែបន្ទាប់ ឬចុច រួចរាល់។',
  'trace.imgFail': 'មិនអាចអានរូបភាពផ្កាយរណបនៅទីនេះបានទេ។ ពិនិត្យអ៊ីនធឺណិត ឬគូសស្រែដោយដៃ។',
  'draw.hint': 'ចុចលើផែនទីដើម្បីដាក់ចំណុចព្រំ។ ចុចចំណុចដំបូង ចុចពីរដង ឬ Enter ដើម្បីបញ្ចប់។ Backspace ត្រឡប់ក្រោយ Esc បោះបង់។',
  'edit.hint': 'អូសជ្រុងពណ៌សដើម្បីកែរាង។ អូសចំណុចខៀវតូចដើម្បីបន្ថែមជ្រុង ចុចកណ្ដុរស្ដាំលើជ្រុងដើម្បីលុប។ រួចចុច «រក្សាទុករាង»។',
  'edit.save': 'រក្សាទុករាង', 'edit.cancel': 'បោះបង់',

  'map.index': 'សន្ទស្សន៍', 'map.opacity': 'ភាពស្រអាប់', 'map.basemap': 'ផែនទីមូលដ្ឋាន', 'map.loading': 'កំពុងដំណើរការរូបភាព Sentinel-2…',
  'bm.satellite': 'ផ្កាយរណប', 'bm.streets': 'ផ្លូវ', 'bm.topo': 'សណ្ឋានដី',
  'tl.prev': 'រូបភាពចាស់ជាង', 'tl.next': 'រូបភាពថ្មីជាង',

  'scenes.searching': 'កំពុងស្វែងរករូបភាព Sentinel-2…', 'scenes.none': 'រកមិនឃើញរូបភាព Sentinel-2 សម្រាប់រយៈពេលនេះទេ។ សាកល្បងបង្កើនកម្រិតពពកក្នុងការកំណត់។',
  'scenes.error': 'មិនអាចភ្ជាប់ទៅកាតាឡុកផ្កាយរណបបានទេ។', 'scenes.loadError': 'មិនអាចផ្ទុករូបភាពនេះបានទេ។ សាកល្បងកាលបរិច្ឆេទផ្សេង។',

  'legend.mean': 'មធ្យម', 'legend.min': 'អប្បបរមា', 'legend.max': 'អតិបរមា', 'legend.clear': 'ច្បាស់', 'legend.cloud': 'ពពក/ស្រមោល',
  'legend.nodata': 'គ្មានទិន្នន័យ', 'legend.noValid': 'ស្រែត្រូវពពកគ្របទាំងស្រុងនៅថ្ងៃនេះ។', 'legend.trueColor': 'ពណ៌ធម្មជាតិ (បន្ទាត់ 4-3-2)។ ពពកបង្ហាញជាឆ្នូត។',

  'ov.ndvi': 'NDVI ចុងក្រោយ', 'ov.since': 'ធៀបនឹង {d}', 'ov.loading': 'កំពុងផ្ទុករូបភាព…', 'ov.noData': 'មិនទាន់មានរូបភាព',
  'ov.daysAgo': '{n} ថ្ងៃមុន', 'ov.inDays': 'ក្នុងរយៈ {n} ថ្ងៃទៀត', 'ov.setSowing': 'កំណត់ថ្ងៃ', 'ov.area': 'ផ្ទៃដី', 'ov.status': 'ស្ថានភាពដំណាំ',
  'ov.openChart': 'បើកក្រាហ្វសន្ទស្សន៍', 'ov.weather': 'អាកាសធាតុ', 'ov.openWeather': 'ព័ត៌មានអាកាសធាតុលម្អិត', 'ov.info': 'ព័ត៌មានស្រែ',
  'ov.report': 'របាយការណ៍ស្រែ', 'ov.editShape': 'កែរាង', 'ov.exportField': 'នាំចេញ GeoJSON',

  'status.bare': 'ដីទទេ ទឹក ឬដំណាំទើបដុះ (NDVI ក្រោម 0.2)។',
  'status.sparse': 'រុក្ខជាតិស្រើបស្រាល — ដំណាក់កាលដំបូង ឬដំណាំរងផលប៉ះពាល់។',
  'status.moderate': 'រុក្ខជាតិមធ្យម — ដំណាំកំពុងលូតលាស់។',
  'status.dense': 'រុក្ខជាតិក្រាស់ និងមានសុខភាពល្អ។',
  'status.veryDense': 'រុក្ខជាតិក្រាស់ខ្លាំង — ការលូតលាស់ខ្ពស់បំផុត។',
  'status.uniform': 'ការលូតលាស់ស្មើគ្នាពេញស្រែ។',
  'status.someVar': 'មានភាពខុសគ្នាខ្លះក្នុងស្រែ។',
  'status.uneven': 'ការលូតលាស់មិនស្មើ — ពិនិត្យតំបន់ទាបលើផែនទី ឬបង្កើតតំបន់។',

  'chart.period': 'រយៈពេល', 'chart.last12': '១២ ខែចុងក្រោយ', 'chart.thisYear': 'ឆ្នាំនេះ', 'chart.season': 'រដូវនេះ (ចាប់ពីសាបព្រោះ)',
  'chart.comparePrev': 'ប្រៀបធៀបជាមួយឆ្នាំមុន', 'chart.calc': 'គណនាប្រវត្តិ {idx}', 'chart.progress': 'បានដំណើរការ {done} / {total} រូបភាព',
  'chart.done': 'បានធ្វើបច្ចុប្បន្នភាពប្រវត្តិសន្ទស្សន៍ ({n} រូបភាព)។', 'chart.points': 'ការសង្កេតច្បាស់ {n}',
  'chart.empty': 'មិនទាន់មានតម្លៃ — ចុច «គណនា»។ រូបភាពនីមួយៗត្រូវទាញយក និងដំណើរការក្នុងកម្មវិធីរុករករបស់អ្នក ដូច្នេះអាចចំណាយពេលពីរបីនាទី។ លទ្ធផលត្រូវរក្សាទុកសម្រាប់លើកក្រោយ។',
  'chart.help': 'ខ្សែ៖ តម្លៃមធ្យមនៃស្រែ។ ផ្ទៃពណ៌ស្រាល៖ ភាគរយទី១០–៩០ (ភាពខុសគ្នាក្នុងស្រែ)។ ចុចលើចំណុចដើម្បីបង្ហាញរូបភាពនោះលើផែនទី។',
  'chart.table': 'តារាងតម្លៃ', 'chart.csv': 'ទាញយក CSV', 'chart.mean': 'មធ្យម', 'chart.prevYear': 'ឆ្នាំមុន', 'chart.date': 'កាលបរិច្ឆេទ',

  'wx.today': 'ថ្ងៃនេះ', 'wx.rainPast7': 'ភ្លៀង ៧ ថ្ងៃមុន', 'wx.rainNext7': 'ភ្លៀង ៧ ថ្ងៃខាងមុខ', 'wx.soil': 'សំណើមដី',
  'wx.chartTitle': 'សីតុណ្ហភាព និងបរិមាណទឹកភ្លៀង (៣០ ថ្ងៃ + ព្យាករណ៍ ១៤ ថ្ងៃ)', 'wx.accTitle': 'សរុបចាប់ពី {d}',
  'wx.accSummary': '{gdd} ដឺក្រេ-ថ្ងៃលូតលាស់ (មូលដ្ឋាន {base} °C), ភ្លៀង {rain} mm, ការហួតយោង {et0} mm។',
  'wx.soilTitle': 'សំណើមដី ជម្រៅ ៣–៩ សង់ទីម៉ែត្រ', 'wx.soilLabel': 'សំណើមដី',
  'wx.rain': 'ភ្លៀង (mm)', 'wx.tmax': 'សីតុណ្ហភាពខ្ពស់', 'wx.tmin': 'សីតុណ្ហភាពទាប', 'wx.gdd': 'ដឺក្រេ-ថ្ងៃលូតលាស់ (GDD)', 'wx.gddUnit': '°C·ថ្ងៃ',
  'wx.rainSince': 'ភ្លៀងតាំងពីសាបព្រោះ', 'wx.error': 'ទិន្នន័យអាកាសធាតុមិនអាចប្រើបាននៅពេលនេះទេ។',
  'wx.source': 'អាកាសធាតុ៖ Open-Meteo (គំរូព្យាករណ៍ និង ERA5)។ ផ្ទៃពណ៌ប្រផេះ = ការព្យាករណ៍។',

  'zones.title': 'តំបន់ផលិតភាព', 'zones.intro': 'បែងចែកស្រែជាតំបន់គ្រប់គ្រងតាមសន្ទស្សន៍រុក្ខជាតិ ឧ. សម្រាប់ដាក់ជីតាមអត្រាផ្សេងៗ ឬការតាមដានគោលដៅ។',
  'zones.count': 'ចំនួនតំបន់', 'zones.method': 'វិធីសាស្ត្រ', 'zones.quantile': 'ផ្ទៃស្មើគ្នា (quantile)', 'zones.equal': 'ចន្លោះស្មើគ្នា', 'zones.kmeans': 'ក្រុមធម្មជាតិ (k-means)',
  'zones.source': 'ផ្អែកលើ', 'zones.current': 'រូបភាពបច្ចុប្បន្ន', 'zones.avg': 'មធ្យមនៃរូបភាពល្អបំផុត',
  'zones.smooth': 'លុបចំណុចតូចៗ', 'zones.create': 'បង្កើតតំបន់', 'zones.result': 'តំបន់',
  'zones.zone': 'តំបន់', 'zones.rate': 'អត្រា', 'zones.total': 'សរុប', 'zones.totalProduct': 'គក សរុប',
  'zones.showOnMap': 'បង្ហាញតំបន់លើផែនទី', 'zones.exportGeo': 'នាំចេញតំបន់ (GeoJSON)', 'zones.exportCsv': 'នាំចេញតារាង (CSV)',
  'zones.rateHelp': 'បញ្ចូលអត្រាប្រើប្រាស់សម្រាប់តំបន់នីមួយៗ (ឧ. គក/ហិកតា)។ អត្រានឹងបញ្ចូលក្នុង GeoJSON ដែលនាំចេញ សម្រាប់ប្រើក្នុង GIS ឬគ្រឿងយន្ត។',
  'zones.avgOf': 'មធ្យមនៃរូបភាពច្បាស់ {n}៖ {dates}', 'zones.needTs': 'រូបភាពច្បាស់មិនទាន់គ្រប់គ្រាន់ — សូមគណនាក្រាហ្វសន្ទស្សន៍ជាមុន។ កំពុងប្រើរូបភាពបច្ចុប្បន្ន។',
  'zones.noScene': 'សូមផ្ទុករូបភាពជាមុនសិន។', 'zones.tooFew': 'ភីកសែលច្បាស់តិចពេកដើម្បីបង្កើតតំបន់។',

  'notes.title': 'កំណត់ត្រាតាមដាន', 'notes.add': 'បន្ថែមកំណត់ត្រាលើផែនទី', 'notes.export': 'នាំចេញ (GeoJSON)', 'notes.hint': 'ចុចលើផែនទីត្រង់កន្លែងដែលអ្នកសង្កេតឃើញបញ្ហា។ Esc ដើម្បីបោះបង់។',
  'notes.intro': 'កត់ត្រាការសង្កេតនៅទីវាល៖ សត្វល្អិត ជំងឺ ស្មៅ បញ្ហាទឹក។ កំណត់ត្រារក្សាទុកក្នុងកម្មវិធីរុករកនេះ។',
  'notes.empty': 'មិនទាន់មានកំណត់ត្រាសម្រាប់ស្រែនេះទេ។', 'notes.cat': 'ប្រភេទ', 'notes.date': 'កាលបរិច្ឆេទ', 'notes.text': 'ការសង្កេត', 'notes.photo': 'រូបថត (ស្រេចចិត្ត)',
  'notes.new': 'កំណត់ត្រាតាមដានថ្មី', 'notes.edit': 'កែកំណត់ត្រា', 'notes.zoom': 'បង្ហាញលើផែនទី', 'notes.confirmDel': 'លុបកំណត់ត្រានេះ?', 'notes.photoErr': 'មិនអាចអានរូបថតបានទេ។',
  'cat.disease': 'ជំងឺ', 'cat.pest': 'សត្វល្អិតចង្រៃ', 'cat.weed': 'ស្មៅ', 'cat.water': 'ទឹកជំនន់ / រាំងស្ងួត', 'cat.nutrient': 'ខ្វះជីជាតិ', 'cat.damage': 'ការខូចខាត', 'cat.other': 'ផ្សេងៗ',

  'set.title': 'ការកំណត់', 'set.maxCloud': 'ពពកអតិបរមាក្នុងរូបភាព (%)', 'set.lookback': 'បង្ហាញរូបភាពក្នុងរយៈ (ថ្ងៃ)',
  'set.edge': 'ភីកសែលគែមស្រែ', 'set.edgeAuto': 'ស្វ័យប្រវត្តិ៖ ដកចេញពេលអាច (ណែនាំ)', 'set.edgePure': 'ដកចេញជានិច្ច', 'set.edgeAll': 'រាប់បញ្ចូល (ថ្លឹងតាមផ្ទៃ)',
  'px.label': 'ភីកសែល Sentinel-2', 'px.value': '{n} ភីកសែល (១០ ម), {pure} នៅខាងក្នុងស្រែទាំងស្រុង', 'px.title': 'ស្រែតូច',
  'px.intro': 'ស្រែនេះប៉ះនឹងភីកសែល Sentinel-2 ចំនួន {n} (១០ ម × ១០ ម) ប៉ុន្តែមានតែ {pure} ប៉ុណ្ណោះដែលនៅខាងក្នុងស្រែទាំងស្រុង។ ភីកសែលនៅគែមលាយដំណាំជាមួយភ្លឺស្រែ ផ្លូវ និងស្រែជិតខាង។',
  'px.tipTiny': 'ភីកសែលស្អាតតិចពេក៖ ចាត់ទុកសន្ទស្សន៍ជាការប៉ាន់ស្មានប៉ុណ្ណោះ ហើយប្រៀបធៀបជាមួយស្រែជិតខាង ជាជាងអានតម្លៃតែមួយ។',
  'px.tip1': 'ប្រើ NDVI, EVI ឬ MSAVI ព្រោះវាប្រើ band ១០ ម។ NDRE, ReCI និង NDMI ប្រើ band ២០ ម ដែលសមនឹងស្រែធំជាង។',
  'px.tip2': 'តាមដាននិន្នាការក្នុងក្រាហ្វសន្ទស្សន៍៖ ការប្រែប្រួលតាមពេលវេលាអាចទុកចិត្តបានជាងរូបភាពតែមួយ។',
  'px.tip3': 'ភីកសែលគែមត្រូវបានដកចេញពីតម្លៃមធ្យម នៅពេលមានភីកសែលស្អាតគ្រប់គ្រាន់ (ការកំណត់ → ភីកសែលគែមស្រែ)។',
  'px.usedPure': 'មធ្យមពីភីកសែល Sentinel-2 ចំនួន {n} ({res} ម) ដែលនៅខាងក្នុងស្រែទាំងស្រុង ដោយដកភីកសែលគែមចេញ។',
  'px.usedAll': 'មធ្យមពីភីកសែល Sentinel-2 ទាំង {n} ({res} ម) ដែលប៉ះស្រែ ថ្លឹងតាមចំណែកដែលនៅក្នុងស្រែ។',
  'set.tsMax': 'រូបភាពអតិបរមាក្នុងការគណនាម្ដង', 'set.tsMinClear': 'ផ្នែកច្បាស់អប្បបរមានៃស្រែ (%)', 'set.gddBase': 'សីតុណ្ហភាពមូលដ្ឋាន GDD (°C)',
  'set.collection': 'បណ្ដុំទិន្នន័យ Sentinel-2', 'set.clearCache': 'សម្អាតតម្លៃដែលបានរក្សាទុក', 'set.backup': 'បម្រុងទុក', 'set.restore': 'ស្ដារពីឯកសារបម្រុង',
  'set.wipe': 'លុបទិន្នន័យទាំងអស់', 'set.wipeConfirm': 'លុបស្រែ និងកំណត់ត្រាទាំងអស់ដែលរក្សាទុកក្នុងកម្មវិធីរុករកនេះ?',

  'msg.tooSmall': 'ស្រែតូចពេក (តិចជាង 0.01 ហិកតា)។', 'msg.tooLarge': 'ផ្ទៃធំពេក (លើស 20,000 ហិកតា)។ សូមគូរស្រែតែមួយ។',
  'msg.largeField': 'ស្រែធំ៖ ការផ្ទុករូបភាពត្រូវការពេលយូរជាង។', 'msg.deleted': 'បានលុបស្រែ។', 'msg.multiNoEdit': 'ស្រែច្រើនផ្នែកមិនអាចកែរាងនៅទីនេះបានទេ។ សូមកែក្នុង QGIS ហើយនាំចូលម្ដងទៀត។',
  'msg.imported': 'បាននាំចូលស្រែ {n}។', 'msg.skipped': 'បានរំលង {n} (មិនមែនពហុកោណ)។', 'msg.noPolygons': 'រកមិនឃើញពហុកោណក្នុងឯកសារទេ។',
  'msg.importFail': 'មិនអាចអាន {name} បានទេ។', 'msg.restored': 'បានស្ដារ៖ ស្រែ {fields}, កំណត់ត្រា {notes}។', 'msg.noFields': 'មិនទាន់មានស្រែទេ។',
  'msg.cacheCleared': 'បានសម្អាតតម្លៃដែលរក្សាទុក។', 'msg.storageFull': 'កន្លែងផ្ទុករបស់កម្មវិធីរុករកពេញហើយ។ សូមលុបរូបថត ឬស្រែចាស់ៗ។',
  'msg.libFail': 'បណ្ណាល័យផែនទីមិនអាចផ្ទុកបាន។ សូមពិនិត្យអ៊ីនធឺណិត ហើយផ្ទុកទំព័រឡើងវិញ។', 'msg.popup': 'សូមអនុញ្ញាត pop-up ដើម្បីបើករបាយការណ៍។',

  'report.title': 'របាយការណ៍តាមដានស្រែ', 'report.print': 'បោះពុម្ព / រក្សាទុកជា PDF', 'report.history': 'ប្រវត្តិសន្ទស្សន៍រុក្ខជាតិ',
  'report.sources': 'ប្រភព៖ Copernicus Sentinel-2 L2A តាមរយៈ Earth Search (AWS Open Data) អាកាសធាតុ Open-Meteo ISRIC SoilGrids 2.0 (CC BY 4.0) និងប្រភេទដី Crocker (1962) តាមរយៈ Open Development Cambodia (CC BY 4.0)។ បង្កើតដោយ Srae Monitor។',
  'map.searchPh': 'ស្វែងរកទីកន្លែង ឬ រយៈទទឹង, រយៈបណ្ដោយ', 'map.search': 'ស្វែងរក', 'map.locate': 'ទីតាំងរបស់ខ្ញុំ', 'map.fullscreen': 'ពេញអេក្រង់',
  'map.noResults': 'រកមិនឃើញទីកន្លែងទេ។', 'map.locError': 'មិនអាចរកទីតាំងរបស់អ្នកបានទេ។ សូមអនុញ្ញាតការចូលប្រើទីតាំង ហើយព្យាយាមម្ដងទៀត។',
  'cmp.btn': 'ប្រៀបធៀប', 'cmp.tip': 'ប្រៀបធៀបពីរកាលបរិច្ឆេទ៖ ផែនទីបម្រែបម្រួលរវាងពួកវា', 'cmp.title': 'បម្រែបម្រួល {idx}', 'cmp.with': 'ប្រៀបធៀបជាមួយ',
  'cmp.mean': 'បម្រែបម្រួលមធ្យម', 'cmp.strongDec': 'ថយចុះខ្លាំង', 'cmp.dec': 'ថយចុះ', 'cmp.slightDec': 'ថយចុះបន្តិច', 'cmp.stable': 'ថេរ',
  'cmp.slightInc': 'កើនឡើងបន្តិច', 'cmp.inc': 'កើនឡើង', 'cmp.strongInc': 'កើនឡើងខ្លាំង',
  'cmp.trueColor': 'ផែនទីបម្រែបម្រួលត្រូវការសន្ទស្សន៍រុក្ខជាតិ — សូមជ្រើស NDVI ឬសន្ទស្សន៍ផ្សេង។', 'cmp.noOverlap': 'គ្មានផ្នែកណាមួយនៃស្រែច្បាស់នៅទាំងពីរថ្ងៃទេ។ សូមជ្រើសថ្ងៃផ្សេង។',
  'legend.geotiffTitle': 'ទាញយកស្រទាប់នេះជា GeoTIFF (បើកក្នុង QGIS / ArcGIS)',
  'stage.title': 'ដំណាក់កាលលូតលាស់', 'stage.day': 'ថ្ងៃទី {n} ក្រោយសាបព្រោះ', 'stage.expected': 'ប្រមូលផលប្រហែល {d}', 'stage.harvestShort': 'ប្រមូលផល (ប៉ាន់ស្មាន)',
  'stage.beforeSowing': 'សាបព្រោះក្នុងរយៈ {n} ថ្ងៃទៀត', 'stage.done': 'ចប់រដូវ — ត្រៀមប្រមូលផល', 'stage.noSowing': 'បញ្ចូលថ្ងៃសាបព្រោះ ដើម្បីមើលដំណាក់កាលលូតលាស់។',
  'stage.note': 'រយៈពេលជាមធ្យម', 'stage.emergence': 'ដុះពន្លក', 'stage.seedling': 'កូនសំណាប', 'stage.tillering': 'បែកគុម្ព', 'stage.booting': 'ផ្ដើមផ្ទៃពោះ',
  'stage.heading': 'ចេញកួរ និងចេញផ្កា', 'stage.grainfill': 'ពេញគ្រាប់', 'stage.maturity': 'ទុំ', 'stage.vegetative': 'លូតលាស់ដើមស្លឹក', 'stage.flowering': 'ចេញផ្កា',
  'stage.podfill': 'ពេញសំបក', 'stage.establishment': 'ចាក់ឫស', 'stage.canopy': 'លូតលាស់ស្លឹក', 'stage.bulking': 'ធំមើម',
  'stage.germination': 'ដុះពន្លក', 'stage.grandgrowth': 'លូតលាស់ខ្លាំង', 'stage.ripening': 'ទុំ',
  'fields.sort': 'តម្រៀប', 'sort.name': 'ឈ្មោះ', 'sort.ndvi': 'NDVI (ទាបមុន)', 'sort.change': 'NDVI ធ្លាក់ខ្លាំងបំផុត', 'sort.area': 'ផ្ទៃដី (ធំមុន)',
  'fields.checkAll': 'ពិនិត្យទាំងអស់', 'fields.checkTip': 'ទាញយក NDVI Sentinel-2 ច្បាស់ចុងក្រោយសម្រាប់ស្រែនីមួយៗ',
  'fields.checking': 'កំពុងពិនិត្យ {done}/{total}៖ {name}…', 'fields.checkDone': 'បានធ្វើបច្ចុប្បន្នភាព {n} ក្នុងចំណោម {total} ស្រែ ដោយរូបភាពច្បាស់ថ្មីៗ។',
  'fields.alerts': '{n} ត្រូវយកចិត្តទុកដាក់', 'fields.dropTip': 'NDVI ធ្លាក់ចុះ 0.05 ឬច្រើនជាងនេះ ធៀបនឹងរូបភាពច្បាស់មុន',
  'map.3d': 'ទិដ្ឋភាពសណ្ឋានដី 3D', 'map.measure': 'វាស់ចម្ងាយ និងផ្ទៃដី', 'map.tip3d': 'ទិដ្ឋភាព 3D៖ ចុចកណ្ដុរស្ដាំហើយអូស (ឬប្រើពីរម្រាមដៃ) ដើម្បីផ្អៀង និងបង្វិល។',
  'measure.hint': 'ចុចចំណុចដើម្បីវាស់។ ចុចពីរដង ឬ Enter ដើម្បីបញ្ចប់។ Backspace លុបចំណុចចុងក្រោយ។', 'measure.dist': 'ចម្ងាយ', 'measure.area': 'ផ្ទៃដី', 'measure.perim': 'បរិមាត្រ',
  'alert.title': 'ការព្រមាន', 'alert.rain': 'រំពឹងថាមានភ្លៀងខ្លាំង {d}៖ ប្រហែល {mm} mm — ពិនិត្យប្រព័ន្ធបង្ហូរទឹក ពន្យារការដាក់ជី។',
  'alert.heat': 'កំដៅខ្លាំង៖ {n} ថ្ងៃលើស 36 °C (រហូតដល់ {t} °C) — គ្រោះថ្នាក់នៅពេលចេញផ្កា។',
  'alert.dry': 'រាំងស្ងួត៖ ស្ទើរតែគ្មានភ្លៀង ១០ ថ្ងៃ ហើយគ្មានការព្យាករណ៍ភ្លៀង — គួរពិចារណាស្រោចស្រព។',
  'alert.none': 'គ្មានការព្រមានអាកាសធាតុសម្រាប់ ៧ ថ្ងៃខាងមុខទេ។', 'alert.spray': 'ថ្ងៃស្ងួតសម្រាប់បាញ់ថ្នាំ ឬដាក់ជី៖ {d}',
  'wx.forecast7': 'ព្យាករណ៍ ៧ ថ្ងៃ',
  'map.loadError': 'ផែនទីមិនអាចផ្ទុកបានទេ។ សូមផ្ញើសារនេះទៅអ្នកអភិវឌ្ឍន៍',
  'tabs.soil': 'ដី', 'map.soil': 'ផែនទីប្រភេទដី (Crocker 1962)',
  'soil.title': 'ដី', 'soil.type': 'ប្រភេទដី', 'soil.texture': 'វាយនភាពដី', 'soil.topsoil': 'ដីស្រទាប់លើ ០–៣០ សម', 'soil.subsoil': 'ដីស្រទាប់ក្រោម ៣០–៦០ សម',
  'soil.clay': 'ដីឥដ្ឋ', 'soil.silt': 'ល្បាប់', 'soil.sand': 'ខ្សាច់', 'soil.soc': 'កាបូនសរីរាង្គ', 'soil.n': 'អាសូតសរុប',
  'soil.properties': 'លក្ខណៈដី', 'soil.triangle': 'ត្រីកោណវាយនភាពដី', 'soil.advice': 'អនុសាសន៍គ្រប់គ្រងដី',
  'soil.suitFor': 'ភាពសមស្របសម្រាប់ {crop}', 'soil.suitTitle': 'តើដំណាំណាខ្លះសមនឹងដីនេះ?',
  'soil.suitNote': 'ការវាយតម្លៃប៉ាន់ស្មាន ផ្អែកតែលើវាយនភាព pH និងជីជាតិដីស្រទាប់លើ។ មិនរាប់បញ្ចូលការបង្ហូរទឹក ទឹកជំនន់ ជម្រាល ជម្រៅ និងអាកាសធាតុទេ។',
  'soil.showMap': 'បង្ហាញផែនទីប្រភេទដី', 'soil.hideMap': 'លាក់ផែនទីប្រភេទដី', 'soil.csv': 'ទាញយកទិន្នន័យដី (CSV)',
  'soil.srcGithub': 'ទិន្នន័យដី៖ រក្សាទុកក្នុងគេហទំព័រនេះ (data/soil) ផ្អែកលើ SoilGrids 2.0 គុណភាព ២៥០ ម៉ែត្រ។',
  'soil.srcApi': 'ទិន្នន័យដី៖ ទាញផ្ទាល់ពី SoilGrids 2.0 API (២៥០ ម៉ែត្រ)។',
  'soil.sources': 'ប្រភព៖ ISRIC SoilGrids 2.0 (CC BY 4.0); ប្រភេទដី៖ Crocker (1962) តាមរយៈ Open Development Cambodia (CC BY 4.0)។ ជាការប៉ាន់ស្មានពីគំរូ — សូមបញ្ជាក់ដោយការវិភាគដី។',
  'soil.error': 'មិនអាចផ្ទុកទិន្នន័យដីបានទេ។', 'soil.noData': 'គ្មានទិន្នន័យដីសម្រាប់ទីតាំងនេះទេ។',
  'soil.notBuilt': 'ឯកសារទិន្នន័យដីមិនទាន់បានបង្កើតនៅឡើយ។ ក្នុង GitHub repository សូមចូល Actions → «Update soil data» → Run workflow។',
  'soil.mapMissing': 'ផែនទីប្រភេទដីមិនទាន់មាននៅឡើយ។ សូមដំណើរការ workflow «Update soil data» ក្នុង GitHub repository (ផ្ទាំង Actions)។',
  'soil.r.veryLow': 'ទាបណាស់', 'soil.r.low': 'ទាប', 'soil.r.medium': 'មធ្យម', 'soil.r.high': 'ខ្ពស់',
  'soil.ph.extremelyAcid': 'ជូរខ្លាំងណាស់', 'soil.ph.stronglyAcid': 'ជូរខ្លាំង', 'soil.ph.slightlyAcid': 'ជូរបន្តិច', 'soil.ph.neutral': 'អព្យាក្រឹត', 'soil.ph.alkaline': 'បាស (អាល់កាឡាំង)',
  'tex.sand': 'ដីខ្សាច់ (Sand)', 'tex.loamySand': 'ដីខ្សាច់ល្បាយ (Loamy sand)', 'tex.sandyLoam': 'ដីល្បាយខ្សាច់ (Sandy loam)', 'tex.loam': 'ដីល្បាយ (Loam)', 'tex.siltLoam': 'ដីល្បាយល្បាប់ (Silt loam)', 'tex.silt': 'ដីល្បាប់ (Silt)',
  'tex.sandyClayLoam': 'ដីល្បាយឥដ្ឋខ្សាច់ (Sandy clay loam)', 'tex.clayLoam': 'ដីល្បាយឥដ្ឋ (Clay loam)', 'tex.siltyClayLoam': 'ដីល្បាយឥដ្ឋល្បាប់ (Silty clay loam)', 'tex.sandyClay': 'ដីឥដ្ឋខ្សាច់ (Sandy clay)', 'tex.siltyClay': 'ដីឥដ្ឋល្បាប់ (Silty clay)', 'tex.clay': 'ដីឥដ្ឋ (Clay)',
  'suit.good': 'សមស្រប', 'suit.fair': 'សមស្របមធ្យម', 'suit.poor': 'សមស្របតិចតួច',
  'suit.lim.texture': 'វាយនភាព', 'suit.lim.acid': 'ជូរពេក', 'suit.lim.alkaline': 'បាសពេក', 'suit.lim.fertility': 'ជីជាតិទាប',
  'adv.lime': 'ដីជូរខ្លាំង៖ គួរពិចារណាដាក់កំបោរ (ឧ. dolomite) ផ្អែកលើការវិភាគដី និងប្រើពូជធន់នឹងដីជូរ។',
  'adv.alkaline': 'ដីបាស៖ សារធាតុចិញ្ចឹមតិចតួចមួយចំនួន (ស័ង្កសី ដែក) អាចស្រូបយកបានតិច។',
  'adv.organic': 'សារធាតុសរីរាង្គទាប៖ ដាក់ជីលាមកសត្វ ឬជីកំប៉ុស ទុកកាកសំណល់ដំណាំ (កុំដុតចំបើង) ពិចារណាប្រើជីបៃតង។',
  'adv.nitrogen': 'អាសូតទាប៖ គ្រោងដាក់ជីអាសូតគ្រប់គ្រាន់ ឬដាំសណ្ដែកឆ្លាស់។',
  'adv.sandy': 'ដីស្រាល (ខ្សាច់)៖ រក្សាទឹក និងជីបានតិច — បំបែកការដាក់ជីជាច្រើនដងតូចៗ និងគ្របដី។',
  'adv.lowCec': 'CEC ទាប៖ ជីងាយហូរបាត់ ដាក់ជីតិចៗ តែញឹកញាប់ និងបន្ថែមសារធាតុសរីរាង្គ។',
  'adv.drainage': 'ដីឥដ្ឋធ្ងន់៖ ធានាការបង្ហូរទឹកល្អសម្រាប់ដំណាំចម្ការ (រងដី ថ្នាលខ្ពស់)។',
  'adv.riceSandy': 'ដីស្រែខ្សាច់៖ ទឹកជ្រាបលឿន — ថែភ្លឺឱ្យល្អ និងរាបស្មើស្រែ។',
  'adv.soilTest': 'នេះជាការប៉ាន់ស្មានពីគំរូ ២៥០ ម៉ែត្រ។ ការវិភាគដីស្រែរបស់អ្នកនៅមន្ទីរពិសោធន៍ គឺជាមូលដ្ឋានសម្រាប់កំណត់បរិមាណជី។',
  'stype.regur.short': 'ដីឥដ្ឋខ្មៅប្រេះ', 'stype.regur.desc': 'ដីឥដ្ឋធ្ងន់ពណ៌ខ្មៅ ហើមពេលសើម និងប្រេះពេលស្ងួត (Vertisol)។ មានជីជាតិធម្មជាតិ ល្អសម្រាប់ពោត សណ្ដែកសៀង សណ្ដែកបាយ និងដំណាំរដូវប្រាំង ប៉ុន្តែពិបាកភ្ជួររាស់ និងអាចដក់ទឹក។',
  'stype.latosol.short': 'ដីក្រហម/ត្នោតជ្រៅ', 'stype.latosol.desc': 'ដីក្រហម ឬត្នោតជ្រៅ បង្ហូរទឹកល្អ (Ferralsol/Nitisol) ច្រើនលើថ្មបាសាល់។ រចនាសម្ព័ន្ធល្អ សមសម្រាប់កៅស៊ូ ស្វាយចន្ទី ម្រេច ដើមឈើហូបផ្លែ និងដំណាំចម្ការ ប៉ុន្តែជូរ និងត្រូវការគ្រប់គ្រងជី។',
  'stype.plinthite.short': 'ដីមានស្រទាប់ថ្មបាយក្រៀម', 'stype.plinthite.desc': 'ដីមានស្រទាប់ថ្មបាយក្រៀម (laterite) រឹងនៅជម្រៅរាក់ ដែលរារាំងឫស និងការបង្ហូរទឹក។ ជាទូទៅខ្សោយ សមសម្រាប់ស្រូវ ឬដំណាំធន់។',
  'stype.podzol.short': 'ខ្សាច់ ជូរ ជីជាតិទាប', 'stype.podzol.desc': 'ដីខ្សាច់ ជូរ និងរលាយជីច្រើន ផ្ទុកទឹក និងជីបានតិច។ ត្រូវការសារធាតុសរីរាង្គ និងបំបែកការដាក់ជី ដំឡូងមី និងស្វាយចន្ទីអាចធន់បាន។',
  'stype.planosol.short': 'មានស្រទាប់រឹង ដក់ទឹកតាមរដូវ', 'stype.planosol.desc': 'ដីស្រទាប់លើស្រាល លើស្រទាប់ក្រោមក្រាស់ ទឹកជ្រាបយឺត ដក់ទឹកនៅរដូវវស្សា និងស្ងួតនៅពេលក្រោយ។ ភាគច្រើនប្រើសម្រាប់ធ្វើស្រែ។',
  'stype.hydromorphic.short': 'បង្ហូរទឹកខ្សោយ ដីស្រែ', 'stype.hydromorphic.desc': 'ដីពណ៌ប្រផេះនៅតំបន់ទំនាប បង្ហូរទឹកខ្សោយ លិចទឹកមួយផ្នែកនៃឆ្នាំ។ ជាដីស្រែសំខាន់របស់កម្ពុជា ជីជាតិពីទាបដល់មធ្យម។',
  'stype.coastal.short': 'ដីឆ្នេរ ហានិភ័យប្រៃ', 'stype.coastal.desc': 'ដីតំបន់ឆ្នេរ និងមាត់ទន្លេ អាចប្រៃ ឬជូរស៊ុលហ្វាត។ សូមពិនិត្យភាពប្រៃ និងភាពជូរមុនដាំដុះ។',
  'stype.alluvial.short': 'ដីល្បាប់ទន្លេ មានជីជាតិ', 'stype.alluvial.desc': 'ដីក្មេងលើដីល្បាប់ទន្លេ និងបឹង (មេគង្គ ទន្លេសាប)។ ជាទូទៅមានជីជាតិ សមសម្រាប់ស្រូវ បន្លែ ពោត និងដំណាំចម្ការមាត់ទន្លេ មានហានិភ័យទឹកជំនន់។',
  'stype.lithosol.short': 'ដីរាក់ មានថ្ម', 'stype.lithosol.desc': 'ដីរាក់ មានថ្មច្រើន នៅលើភ្នំ និងទួល។ មិនសមសម្រាប់ដំណាំប្រចាំឆ្នាំ មានហានិភ័យសំណឹក — គួររក្សាព្រៃ ឬដំណាំអចិន្ត្រៃយ៍។',
  'demo.name': 'ស្រែស្រូវគំរូ (បាត់ដំបង)',
  'help.title': 'ជំនួយ — របៀបប្រើ Srae Monitor',
};

const CROP_NAMES = {
  en: { rice_wet: 'Rice (wet season)', rice_dry: 'Rice (dry season)', cassava: 'Cassava', maize: 'Maize', soybean: 'Soybean', mungbean: 'Mung bean', sugarcane: 'Sugarcane', cashew: 'Cashew', mango: 'Mango', rubber: 'Rubber', pepper: 'Pepper', durian: 'Durian', longan: 'Longan', banana: 'Banana', vegetables: 'Vegetables', other: 'Other' },
  km: { rice_wet: 'ស្រូវវស្សា', rice_dry: 'ស្រូវប្រាំង', cassava: 'ដំឡូងមី', maize: 'ពោត', soybean: 'សណ្ដែកសៀង', mungbean: 'សណ្ដែកបាយ', sugarcane: 'អំពៅ', cashew: 'ស្វាយចន្ទី', mango: 'ស្វាយ', rubber: 'កៅស៊ូ', pepper: 'ម្រេច', durian: 'ធុរេន', longan: 'មៀន', banana: 'ចេក', vegetables: 'បន្លែ', other: 'ផ្សេងៗ' },
};

const INDEX_NAMES = {
  en: { NDVI: 'NDVI — vegetation', EVI: 'EVI — enhanced vegetation', MSAVI: 'MSAVI — early growth', NDRE: 'NDRE — chlorophyll / nitrogen', ReCI: 'ReCI — chlorophyll', NDMI: 'NDMI — crop moisture', NDWI: 'NDWI — surface water', TRUE: 'True colour' },
  km: { NDVI: 'NDVI — រុក្ខជាតិ', EVI: 'EVI — រុក្ខជាតិ (ពង្រឹង)', MSAVI: 'MSAVI — ដំណាក់កាលដំបូង', NDRE: 'NDRE — ក្លរ៉ូភីល / អាសូត', ReCI: 'ReCI — ក្លរ៉ូភីល', NDMI: 'NDMI — សំណើមដំណាំ', NDWI: 'NDWI — ទឹកលើផ្ទៃ', TRUE: 'ពណ៌ធម្មជាតិ' },
};

const INDEX_DESC = {
  en: {
    NDVI: 'Normalized Difference Vegetation Index: overall greenness and biomass.',
    EVI: 'Enhanced Vegetation Index: like NDVI but less saturated in dense canopies.',
    MSAVI: 'Modified Soil-Adjusted Vegetation Index: best when much soil is still visible (early growth).',
    NDRE: 'Normalized Difference Red Edge: sensitive to chlorophyll and nitrogen in mid–late season.',
    ReCI: 'Red-edge Chlorophyll Index: chlorophyll content of leaves.',
    NDMI: 'Normalized Difference Moisture Index: water content of the crop canopy.',
    NDWI: 'Normalized Difference Water Index: open water and flooded fields (high values).',
    TRUE: 'Natural colour image (red, green, blue).',
  },
  km: {
    NDVI: 'សន្ទស្សន៍ភាពខុសគ្នានៃរុក្ខជាតិ៖ ភាពបៃតង និងជីវម៉ាសទូទៅ។',
    EVI: 'សន្ទស្សន៍រុក្ខជាតិពង្រឹង៖ ដូច NDVI ប៉ុន្តែមិនឆ្អែតនៅពេលដំណាំក្រាស់។',
    MSAVI: 'សន្ទស្សន៍រុក្ខជាតិកែតម្រូវដី៖ ល្អបំផុតនៅពេលដីនៅឃើញច្រើន (ដំណាក់កាលដំបូង)។',
    NDRE: 'សន្ទស្សន៍ Red Edge៖ ឆ្លើយតបនឹងក្លរ៉ូភីល និងអាសូតនៅពាក់កណ្ដាល–ចុងរដូវ។',
    ReCI: 'សន្ទស្សន៍ក្លរ៉ូភីល Red Edge៖ បរិមាណក្លរ៉ូភីលក្នុងស្លឹក។',
    NDMI: 'សន្ទស្សន៍សំណើម៖ បរិមាណទឹកក្នុងដំណាំ។',
    NDWI: 'សន្ទស្សន៍ទឹក៖ ទឹកបើកចំហ និងស្រែលិចទឹក (តម្លៃខ្ពស់)។',
    TRUE: 'រូបភាពពណ៌ធម្មជាតិ (ក្រហម បៃតង ខៀវ)។',
  },
};

const HELP = {
  en: `
<h3>1. Add your fields</h3>
<p>Press <b>Draw field</b> and click the corners of the field on the satellite map, or <b>Import</b> boundaries from GeoJSON, KML or a zipped Shapefile (for example exported from QGIS). Location and elevation are filled in automatically. Use the demo field to try the app straight away.</p>
<p><b>Trace field</b> finds a boundary for you: zoom in on the satellite map and click inside a paddy. The outline follows the bunds, roads and tree lines seen in the very-high-resolution imagery. If it misses part of the field, <b>Shift+click</b> inside the missing part; if it spills into a neighbour, lower the <b>Tolerance</b>; if a bund is hard to see, raise it. Press <b>Enter</b> (or <b>Save field</b>) and click the next paddy — saved fields block the next trace, so neighbouring plots never overlap. Check each outline: the base-map imagery may be older than this season, and <b>Edit shape</b> fixes any corner.</p>
<h3>2. Look at the latest satellite image</h3>
<p>Select a field. The app searches all Sentinel-2 images (10 m, every ~5 days) and shows the newest image where most of the field is cloud-free. The <b>timeline</b> at the bottom lists every date with its cloud cover; click a date to change the image. Clouds and shadows are masked (hatched grey). Move the mouse over the field to read pixel values.</p>
<h3>3. Choose an index</h3>
<ul><li><b>NDVI</b> – general crop vigour (0 = bare soil, 0.8+ = dense healthy crop).</li>
<li><b>MSAVI</b> – early season, when soil is still visible.</li>
<li><b>NDRE / ReCI</b> – chlorophyll and nitrogen status in mid–late season.</li>
<li><b>NDMI</b> – crop water stress. <b>NDWI</b> – flooding / standing water.</li></ul>
<h3>4. Index chart</h3>
<p>Calculates the field's mean index for every clear image in the season, so you can follow crop development and compare with last year. Processing happens in your browser; results are saved for next time.</p>
<h3>5. Weather, zones and scouting</h3>
<p><b>Weather</b> shows rainfall, temperature, soil moisture, a 14-day forecast and growing degree days since sowing. <b>Zones</b> divides the field into 2–7 productivity zones that you can export with fertiliser rates. <b>Scouting</b> lets you pin observations and photos on the map. <b>Field report</b> makes a printable PDF.</p>
<h3>6. Compare dates, growth stage and export</h3>
<p><b>Compare</b> (map toolbar) shows where the crop improved or declined between two images. The <b>Status</b> tab estimates the growth stage from the sowing date. <b>GeoTIFF</b> in the legend downloads the visible layer for QGIS. Use the search box to jump to a village or coordinates, ◎ for your GPS position, and ← → keys to step through image dates.</p>
<h3>7. More map tools</h3>
<p><b>3D</b> drapes the index map on terrain (right-click-drag or two fingers to tilt). The ruler measures distance, area and perimeter. In the field list, <b>Check all</b> fetches the latest clear NDVI for every field, and fields whose NDVI dropped are flagged ⚠. The Weather tab warns about heavy rain, heat and dry spells.</p>
<h3>8. Soil</h3>
<p>The <b>Soil</b> tab shows the topsoil and subsoil texture, pH, organic carbon, nitrogen and CEC of the field (SoilGrids 2.0, 250 m), the soil type from the Crocker (1962) soil map, management hints and which crops suit the soil. The layered button on the map shows the soil-type map. These are model estimates — confirm with a soil test.</p>
<h3>9. Small fields</h3>
<p>Sentinel-2 pixels are 10 m × 10 m, so a 0.2 ha paddy covers only about 20 of them, and those on the edge also see bunds, paths and neighbouring plots. For small fields the app uses a fine grid that follows the exact field shape and weights each satellite pixel by the share inside the field, and it leaves edge pixels out of the field mean whenever enough pixels lie fully inside (<b>Settings → Field-edge pixels</b>). The Status tab shows how many pixels the field has. Prefer NDVI, EVI or MSAVI (10 m bands) and follow the trend over time rather than a single image.</p>
<h3>Data and privacy</h3>
<p>Imagery: Copernicus Sentinel-2 L2A from the Earth Search STAC API (AWS Open Data). Weather: Open-Meteo. Soil: ISRIC SoilGrids 2.0 and Open Development Cambodia (CC BY 4.0). Commune / district / province: OCHA COD-AB boundaries (HDX) with NCDD Gazetteer names (Open Development Cambodia). Place search: OpenStreetMap Nominatim. Your fields and notes are stored only in this browser — use <b>Backup</b> to move them to another device.</p>
<p class="muted">Limits: Sentinel-2 pixels are 10–20 m, so very small plots (&lt; 0.2 ha) show few pixels. During the rainy season many images are cloudy.</p>`,
  km: `
<h3>១. បន្ថែមស្រែរបស់អ្នក</h3>
<p>ចុច <b>គូរព្រំស្រែ</b> ហើយចុចលើជ្រុងស្រែនៅលើផែនទីផ្កាយរណប ឬ <b>នាំចូល</b> ព្រំពីឯកសារ GeoJSON, KML ឬ Shapefile (zip) (ឧ. នាំចេញពី QGIS)។ ទីតាំង និងកម្ពស់ត្រូវបំពេញដោយស្វ័យប្រវត្តិ។ ប្រើស្រែគំរូដើម្បីសាកល្បងភ្លាមៗ។</p>
<p><b>គូសព្រំស្វ័យប្រវត្តិ</b> រកព្រំស្រែឱ្យអ្នក៖ ពង្រីកផែនទីផ្កាយរណប ហើយចុចខាងក្នុងស្រែ។ ព្រំនឹងតាមភ្លឺស្រែ ផ្លូវ និងជួរដើមឈើដែលឃើញក្នុងរូបភាពច្បាស់ខ្ពស់។ បើខ្វះផ្នែកណាមួយ សូម <b>Shift+ចុច</b> ក្នុងផ្នែកនោះ។ បើលាតចូលស្រែជិតខាង សូមបន្ថយ <b>ភាពធូរ</b>។ បើភ្លឺស្រែមើលឃើញពិបាក សូមបង្កើនវា។ ចុច <b>Enter</b> (ឬ <b>រក្សាទុកស្រែ</b>) ហើយចុចស្រែបន្ទាប់ — ស្រែដែលបានរក្សាទុករារាំងការគូសបន្ទាប់ ដូច្នេះស្រែជិតខាងមិនជាន់គ្នាទេ។ សូមពិនិត្យព្រំនីមួយៗ៖ រូបភាពផែនទីមូលដ្ឋានអាចចាស់ជាងរដូវនេះ ហើយ <b>កែរាង</b> អាចកែជ្រុងណាមួយបាន។</p>
<h3>២. មើលរូបភាពផ្កាយរណបចុងក្រោយ</h3>
<p>ជ្រើសរើសស្រែ។ កម្មវិធីស្វែងរករូបភាព Sentinel-2 ទាំងអស់ (១០ ម៉ែត្រ រៀងរាល់ប្រហែល ៥ ថ្ងៃ) ហើយបង្ហាញរូបភាពថ្មីបំផុតដែលស្រែភាគច្រើនគ្មានពពក។ <b>បន្ទាត់ពេលវេលា</b> នៅខាងក្រោមបង្ហាញកាលបរិច្ឆេទនីមួយៗ និងភាគរយពពក។ ចុចលើកាលបរិច្ឆេទដើម្បីប្ដូររូបភាព។ ពពក និងស្រមោលត្រូវបិទបាំង (ឆ្នូតប្រផេះ)។ ដាក់កណ្ដុរលើស្រែដើម្បីអានតម្លៃភីកសែល។</p>
<h3>៣. ជ្រើសរើសសន្ទស្សន៍</h3>
<ul><li><b>NDVI</b> – ភាពលូតលាស់ទូទៅ (0 = ដីទទេ, 0.8+ = ដំណាំក្រាស់ល្អ)។</li>
<li><b>MSAVI</b> – ដើមរដូវ នៅពេលដីនៅឃើញ។</li>
<li><b>NDRE / ReCI</b> – ស្ថានភាពក្លរ៉ូភីល និងអាសូតនៅពាក់កណ្ដាល–ចុងរដូវ។</li>
<li><b>NDMI</b> – ភាពខ្វះទឹករបស់ដំណាំ។ <b>NDWI</b> – ទឹកជំនន់ / ទឹកដក់។</li></ul>
<h3>៤. ក្រាហ្វសន្ទស្សន៍</h3>
<p>គណនាតម្លៃមធ្យមនៃសន្ទស្សន៍សម្រាប់រូបភាពច្បាស់នីមួយៗក្នុងរដូវ ដើម្បីតាមដានការលូតលាស់ និងប្រៀបធៀបជាមួយឆ្នាំមុន។ ការដំណើរការធ្វើឡើងក្នុងកម្មវិធីរុករករបស់អ្នក ហើយលទ្ធផលត្រូវរក្សាទុក។</p>
<h3>៥. អាកាសធាតុ តំបន់ និងការតាមដាន</h3>
<p><b>អាកាសធាតុ</b> បង្ហាញបរិមាណទឹកភ្លៀង សីតុណ្ហភាព សំណើមដី ការព្យាករណ៍ ១៤ ថ្ងៃ និងដឺក្រេ-ថ្ងៃលូតលាស់តាំងពីសាបព្រោះ។ <b>តំបន់</b> បែងចែកស្រែជា ២–៧ តំបន់ផលិតភាព ដែលអាចនាំចេញជាមួយអត្រាជី។ <b>ការតាមដាន</b> អនុញ្ញាតឱ្យដាក់ការសង្កេត និងរូបថតលើផែនទី។ <b>របាយការណ៍ស្រែ</b> បង្កើតឯកសារ PDF សម្រាប់បោះពុម្ព។</p>
<h3>៦. ប្រៀបធៀបកាលបរិច្ឆេទ ដំណាក់កាលលូតលាស់ និងការនាំចេញ</h3>
<p><b>ប្រៀបធៀប</b> (របារឧបករណ៍ផែនទី) បង្ហាញកន្លែងដែលដំណាំប្រសើរឡើង ឬធ្លាក់ចុះរវាងរូបភាពពីរ។ ផ្ទាំង <b>ស្ថានភាព</b> ប៉ាន់ស្មានដំណាក់កាលលូតលាស់ពីថ្ងៃសាបព្រោះ។ ប៊ូតុង <b>GeoTIFF</b> ក្នុងតារាងពណ៌ ទាញយកស្រទាប់ដែលកំពុងបង្ហាញសម្រាប់ QGIS។ ប្រើប្រអប់ស្វែងរកដើម្បីទៅភូមិ ឬកូអរដោនេ ◎ សម្រាប់ទីតាំង GPS របស់អ្នក និងគ្រាប់ចុច ← → ដើម្បីប្ដូរកាលបរិច្ឆេទរូបភាព។</p>
<h3>៧. ឧបករណ៍ផែនទីបន្ថែម</h3>
<p><b>3D</b> បង្ហាញផែនទីសន្ទស្សន៍លើសណ្ឋានដី (ចុចកណ្ដុរស្ដាំហើយអូស ឬពីរម្រាមដៃ ដើម្បីផ្អៀង)។ បន្ទាត់វាស់ចម្ងាយ ផ្ទៃដី និងបរិមាត្រ។ ក្នុងបញ្ជីស្រែ <b>ពិនិត្យទាំងអស់</b> ទាញយក NDVI ច្បាស់ចុងក្រោយសម្រាប់ស្រែនីមួយៗ ហើយស្រែដែល NDVI ធ្លាក់ចុះត្រូវសម្គាល់ ⚠។ ផ្ទាំងអាកាសធាតុព្រមានអំពីភ្លៀងខ្លាំង កំដៅ និងរាំងស្ងួត។</p>
<h3>៨. ដី</h3>
<p>ផ្ទាំង <b>ដី</b> បង្ហាញវាយនភាព pH កាបូនសរីរាង្គ អាសូត និង CEC នៃដីស្រទាប់លើ និងស្រទាប់ក្រោមរបស់ស្រែ (SoilGrids 2.0, ២៥០ ម៉ែត្រ) ប្រភេទដីពីផែនទីដី Crocker (1962) អនុសាសន៍គ្រប់គ្រង និងដំណាំដែលសមនឹងដី។ ប៊ូតុងស្រទាប់នៅលើផែនទីបង្ហាញផែនទីប្រភេទដី។ ទាំងនេះជាការប៉ាន់ស្មានពីគំរូ — សូមបញ្ជាក់ដោយការវិភាគដី។</p>
<h3>៩. ស្រែតូច</h3>
<p>ភីកសែល Sentinel-2 មានទំហំ ១០ ម × ១០ ម ដូច្នេះស្រែ ០,២ ហិកតា គ្របដណ្ដប់ប្រហែល ២០ ភីកសែលប៉ុណ្ណោះ ហើយភីកសែលនៅគែមក៏ឃើញភ្លឺស្រែ ផ្លូវ និងស្រែជិតខាងដែរ។ សម្រាប់ស្រែតូច កម្មវិធីប្រើក្រឡាល្អិតដែលតាមរាងស្រែពិតប្រាកដ ហើយថ្លឹងភីកសែលនីមួយៗតាមចំណែកដែលនៅក្នុងស្រែ ព្រមទាំងដកភីកសែលគែមចេញពីតម្លៃមធ្យម នៅពេលមានភីកសែលនៅខាងក្នុងទាំងស្រុងគ្រប់គ្រាន់ (<b>ការកំណត់ → ភីកសែលគែមស្រែ</b>)។ ផ្ទាំងស្ថានភាពបង្ហាញចំនួនភីកសែលរបស់ស្រែ។ គួរប្រើ NDVI, EVI ឬ MSAVI (band ១០ ម) ហើយតាមដាននិន្នាការតាមពេលវេលា ជាជាងរូបភាពតែមួយ។</p>
<h3>ទិន្នន័យ និងឯកជនភាព</h3>
<p>រូបភាព៖ Copernicus Sentinel-2 L2A ពី Earth Search STAC API (AWS Open Data)។ អាកាសធាតុ៖ Open-Meteo។ ឃុំ/សង្កាត់ ស្រុក/ខណ្ឌ ខេត្ត៖ ព្រំដែនរដ្ឋបាល OCHA COD-AB (HDX) និងឈ្មោះពីបញ្ជីឈ្មោះរដ្ឋបាល គ.ជ.អ.ប (NCDD Gazetteer, Open Development Cambodia)។ ការស្វែងរកទីកន្លែង៖ OpenStreetMap Nominatim។ ស្រែ និងកំណត់ត្រារបស់អ្នករក្សាទុកតែក្នុងកម្មវិធីរុករកនេះប៉ុណ្ណោះ — ប្រើ <b>បម្រុងទុក</b> ដើម្បីផ្ទេរទៅឧបករណ៍ផ្សេង។</p>
<p class="muted">ដែនកំណត់៖ ភីកសែល Sentinel-2 មានទំហំ ១០–២០ ម៉ែត្រ ដូច្នេះដីតូចៗ (&lt; 0.2 ហិកតា) មានភីកសែលតិច។ នៅរដូវវស្សា រូបភាពជាច្រើនមានពពក។</p>`,
};

const DICTS = { en, km };
let lang = 'en';

export function setLang(l) { lang = DICTS[l] ? l : 'en'; document.documentElement.lang = lang; document.body.classList.toggle('lang-km', lang === 'km'); }
export function getLang() { return lang; }

export function t(key, vars) {
  let s = DICTS[lang][key] ?? en[key] ?? key;
  if (key.startsWith('idxd.')) s = INDEX_DESC[lang][key.slice(5)] || INDEX_DESC.en[key.slice(5)] || '';
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}

export function applyI18n(root) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
}

const KM_MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];

export function fmtDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '';
  if (lang === 'km') { // explicit Khmer format; browser Khmer locale data is not always present
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    const parts = [];
    if (opts.day) parts.push(d);
    if (opts.month) parts.push(KM_MONTHS[m - 1]);
    if (opts.year) parts.push(opts.year === '2-digit' ? String(y).slice(2) : y);
    return parts.join(' ');
  }
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  try { return new Intl.DateTimeFormat(lang === 'km' ? 'km-KH' : 'en-GB', { ...opts, timeZone: 'UTC' }).format(d); }
  catch { return iso.slice(0, 10); }
}

export const cropName = (c) => CROP_NAMES[lang][c] || CROP_NAMES.en[c] || c || '';
export const indexName = (k) => INDEX_NAMES[lang][k] || k;
export const helpHtml = () => HELP[lang];

/** Key sets, exported for the consistency test. */
export const _dicts = DICTS;
