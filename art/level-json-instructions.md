# Create or update a level JSON file

For each level, use its `.kra` file as the source. Save the JSON file beside it with the same base name. For example, save `cave-02.json` beside `cave-02.kra`. Do not use a fixed level name for other levels.

Keep the schema and property order below. If the matching JSON file already exists, update that file.

## Read the KRA layers

1. Open the `.kra` file in Krita. Use the layer for object shapes (`objets` in `level-01.kra`) and the `zones` layer for zone shapes.
2. Show the layer you need and hide other painted layers that cover it. Inspect the actual canvas at high zoom so you can distinguish solid fill pixels from edge smoothing and stray marks.
3. Use Krita as the source of truth for shape bounds. Do not use `kra_layers.py` or raw tile extraction to determine final bounds; extracted pixels can include antialiased edges or artifacts that are not intended shapes. If you use an extracted preview, verify every shape and bound in Krita.
4. Set `canvas.name` to the KRA filename without the `.kra` extension. Read the canvas width and height from the KRA document.

## Record the shapes

- Use the dominant solid fill color for each shape. Write the color as a six-digit hex value, such as `#7460E0`; ignore partially covered edge pixels when they only smooth the boundary.
- Use a plain color name in `name`, such as `Purple` or `Cyan`.
- Use the object position in the array for `ix`.
- Group object shapes with the same fill color in one `objects` entry.
- Add one `items` entry for each distinct intended object silhouette. Do not count antialias fringes or stray paint specks as separate objects.
- Add one `zones` entry for each distinct intended zone region. Do not split a zone into entries for disconnected raster scraps or cutout artifacts; only count them separately if they are clearly separate designed regions. Store its position directly on the entry.
- Record each shape's bounding box from its solid visible fill, in canvas pixels. The origin is the top-left corner. The bounding box endpoints are inclusive.
- Calculate `center.x` as `(x1 + x2) / 2`. Calculate `center.y` as `(y1 + y2) / 2`.
- Set each object's `zone` value to an empty string until a zone is assigned.
- Do not add `items` or `zoneid` properties to zones.

## JSON structure

All values in this example are placeholders. Replace them with values from the matching KRA. Keep the property names and order shown.

```json
{
  "imageSmoothingEnabled": true,
  "maxZoom": 60,
  "canvas": {
    "name": "level-name",
    "width": 0,
    "height": 0,
    "coordinate_origin": "top-left"
  },
  "objects": [
    {
      "ix": 0,
      "name": "Color name",
      "color": "#000000",
      "items": [
        {
          "zone": "",
          "bbox": {"x1": 0, "y1": 0, "x2": 0, "y2": 0},
          "center": {"x": 0, "y": 0}
        }
      ]
    }
  ],
  "zones": [
    {
      "name": "Color name",
      "color": "#000000",
      "bbox": {"x1": 0, "y1": 0, "x2": 0, "y2": 0},
      "center": {"x": 0, "y": 0}
    }
  ],
  "notes": "Colors are dominant fill colors. Bounding box endpoints are inclusive; positions are canvas pixels."
}
```

The `objects` and `zones` arrays can contain any number of entries. Each object entry can contain any number of items. Each zone entry represents one zone shape.

## Check the JSON

1. Make sure that the file parses as valid JSON. Do not add comments or trailing commas.
2. Make sure that every object item has `zone`, `bbox`, and `center` properties.
3. Make sure that each zone has `name`, `color`, `bbox`, and `center` properties. Do not add an `items` array or a `zoneid` property to a zone.
4. Make sure that `canvas.name` matches the KRA filename without its extension. Make sure that the canvas size matches the KRA and each center matches its bounding box.
