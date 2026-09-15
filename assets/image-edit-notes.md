# Hero background editing

Method: built-in image generation/editing tool.

Source: `hero-hand-background-centered-1920x1080.png`.
Selected background: `hero-background-clean.png`.

The foreground uses the original photo through an SVG contour clip in `index.html`, not an AI-redrawn hand. The initial generated cutout changed the source composition and painted a checkerboard, so it was rejected and is not referenced by the website.

## Final background prompt

Use case: precise-object-edit. Edit target: this gray textured 1920x1080 website photograph. Create a clean background plate: REMOVE the entire hand, forearm, black horizontal rectangular bar and ALL their shadows. Fill their former areas seamlessly with the same existing pale neutral gray stucco/paper texture. Preserve the existing background grain size, neutral gray tone, soft uniform illumination and full wide 16:9 framing. Only a completely empty uniformly textured gray surface should remain. No subjects, no objects, no text, no dark residual shapes, no gradients added. This image will be a static background beneath separately layered original foreground.
