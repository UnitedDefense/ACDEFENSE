# Placeholder Images

This directory contains placeholder images used as fallbacks when content images are not available.

## Required Images

### Course Placeholder (`course-placeholder.jpg`)
- **Dimensions**: 800x400px (2:1 aspect ratio)
- **Format**: JPEG
- **Usage**: Fallback for course card images when no thumbnail is provided
- **Recommended Design**:
  - Background: Professional gray (#4B5563)
  - Text: "Course Image" centered in white
  - AC Defense branding optional

### Product Placeholder (`product-placeholder.jpg`)
- **Dimensions**: 800x800px (1:1 aspect ratio)
- **Format**: JPEG
- **Usage**: Fallback for product images when no image is provided
- **Recommended Design**:
  - Background: Professional gray (#6B7280)
  - Text: "Product Image" centered in white
  - AC Defense branding optional

## Creating Placeholders

### Option 1: Using ImageMagick (Command Line)
```bash
# Course placeholder (800x400)
convert -size 800x400 xc:#4B5563 -gravity center -pointsize 48 -fill white \
  -annotate +0+0 "Course Placeholder" course-placeholder.jpg

# Product placeholder (800x800)
convert -size 800x800 xc:#6B7280 -gravity center -pointsize 48 -fill white \
  -annotate +0+0 "Product Placeholder" product-placeholder.jpg
```

### Option 2: Using Online Tools
- [Canva](https://www.canva.com/) - Free design tool
- [Photopea](https://www.photopea.com/) - Free Photoshop alternative
- [Placeholder.com](https://placeholder.com/) - Generate simple placeholders

### Option 3: Using Figma/Adobe
Create simple solid color backgrounds with centered text using your preferred design tool.

## Production Recommendations

For production use, consider:
1. **Brand Colors**: Use AC Defense brand colors instead of generic grays
2. **Logo/Icon**: Include AC Defense logo or relevant icon
3. **Professional Design**: Consider hiring a designer for polished placeholders
4. **Optimization**: Compress images for web (target < 50KB)
5. **Accessibility**: Ensure adequate contrast for any text

## SVG Alternatives

See `course-placeholder.svg` and `product-placeholder.svg` for scalable vector alternatives that can be used temporarily.
