/** Always outline canvas text before filling it. Coordinates use the canvas's logical pixels. */
export function drawPixelLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  { color = "#FFFFFF", size = 38, align = "left" as CanvasTextAlign } = {},
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.font = `700 ${size}px "Pixelify Sans", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#000000";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
