import AppKit
import CoreText

// Backpressure brand kit ("queue depth" mark): SVG logos with the wordmark as
// outlines, PNG icons, and a JPEG brand board. macOS only (AppKit + CoreText).
//
//   swift scripts/brand/generate.swift <dir with Inter-400.ttf, Inter-600.ttf> <outDir>
//
// The mark's geometry mirrors src/lib/brand.ts; change both together. Copy the
// outputs into public/brand (and icon.svg / apple-icon.png into src/app).

let fontDir = CommandLine.arguments[1]
let out = CommandLine.arguments[2]
try? FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)

for f in ["Inter-400.ttf", "Inter-600.ttf"] {
    CTFontManagerRegisterFontsForURL(URL(fileURLWithPath: "\(fontDir)/\(f)") as CFURL, .process, nil)
}
func inter(_ size: CGFloat, _ weight: NSFont.Weight) -> NSFont {
    let name = weight == .regular ? "Inter-Regular" : "Inter-SemiBold"
    guard let f = NSFont(name: name, size: size) else { fatalError("missing font \(name)") }
    return f
}

// ---- Colors ---------------------------------------------------------------
let INK = "#0B0B0B", AMBER = "#F59E0B", WHITE = "#FFFFFF", BLACK = "#000000"
func color(_ s: String) -> NSColor {
    var v: UInt64 = 0
    Scanner(string: String(s.dropFirst())).scanHexInt64(&v)
    return NSColor(srgbRed: CGFloat((v >> 16) & 0xff) / 255, green: CGFloat((v >> 8) & 0xff) / 255,
                   blue: CGFloat(v & 0xff) / 255, alpha: 1)
}

// ---- The mark, in a 100×100 box (content spans x 4–94, y 6–94) -----------
struct Bar { let x, top, bottom: CGFloat; let amber: Bool }
let bars: [Bar] = [
    Bar(x: 4, top: 64, bottom: 94, amber: false),
    Bar(x: 28, top: 48, bottom: 94, amber: false),
    Bar(x: 52, top: 32, bottom: 94, amber: false),
    Bar(x: 76, top: 27, bottom: 94, amber: false),
    Bar(x: 76, top: 6, bottom: 21, amber: true), // overflow: the stage is full and pushing back
]
let barW: CGFloat = 18, barR: CGFloat = 4

func markSVG(fg: String, dx: CGFloat = 0, dy: CGFloat = 0, s: CGFloat = 1) -> String {
    bars.map { b in
        let f = b.amber ? AMBER : fg
        return "<rect x=\"\(fmt(dx + b.x * s))\" y=\"\(fmt(dy + b.top * s))\" width=\"\(fmt(barW * s))\" height=\"\(fmt((b.bottom - b.top) * s))\" rx=\"\(fmt(barR * s))\" fill=\"\(f)\"/>"
    }.joined()
}
func drawMark(_ x: CGFloat, _ y: CGFloat, _ size: CGFloat, fg: NSColor) {
    let u = size / 100
    for b in bars {
        (b.amber ? color(AMBER) : fg).setFill()
        NSBezierPath(roundedRect: NSRect(x: x + b.x * u, y: y + b.top * u, width: barW * u, height: (b.bottom - b.top) * u),
                     xRadius: barR * u, yRadius: barR * u).fill()
    }
}
func fmt(_ v: CGFloat) -> String {
    let r = (v * 100).rounded() / 100
    return r == r.rounded() ? String(Int(r)) : String(format: "%g", r)
}

// ---- Wordmark as outlines -------------------------------------------------
// Lockup spec (mark units): wordmark = Inter SemiBold at 0.46 × mark, tracking −2.5%,
// gap 0.30 × mark, cap height centered on the mark.
let WORD = "Backpressure", FONT_SCALE: CGFloat = 0.46, GAP: CGFloat = 0.30, TRACK: CGFloat = -0.025

func wordPath(size: CGFloat, originX: CGFloat, baseline: CGFloat) -> (d: String, width: CGFloat) {
    let font = inter(size, .semibold) as CTFont
    let attr = NSAttributedString(string: WORD, attributes: [.font: font, .kern: TRACK * size])
    let lineRef = CTLineCreateWithAttributedString(attr)
    var d = ""
    for run in CTLineGetGlyphRuns(lineRef) as! [CTRun] {
        let n = CTRunGetGlyphCount(run)
        var glyphs = [CGGlyph](repeating: 0, count: n)
        var pos = [CGPoint](repeating: .zero, count: n)
        CTRunGetGlyphs(run, CFRange(location: 0, length: n), &glyphs)
        CTRunGetPositions(run, CFRange(location: 0, length: n), &pos)
        for i in 0..<n {
            guard let p = CTFontCreatePathForGlyph(font, glyphs[i], nil) else { continue }
            let ox = originX + pos[i].x
            p.applyWithBlock { el in
                let e = el.pointee
                func pt(_ k: Int) -> String {
                    let q = e.points[k]
                    return "\(fmt(ox + q.x)) \(fmt(baseline - q.y))"
                }
                switch e.type {
                case .moveToPoint: d += "M\(pt(0))"
                case .addLineToPoint: d += "L\(pt(0))"
                case .addQuadCurveToPoint: d += "Q\(pt(0)) \(pt(1))"
                case .addCurveToPoint: d += "C\(pt(0)) \(pt(1)) \(pt(2))"
                case .closeSubpath: d += "Z"
                @unknown default: break
                }
            }
        }
    }
    return (d, CGFloat(CTLineGetTypographicBounds(lineRef, nil, nil, nil)))
}

let fs = 100 * FONT_SCALE
let capH = inter(fs, .semibold).capHeight
let baseline = 50 + capH / 2
let textX: CGFloat = 100 + 100 * GAP
let word = wordPath(size: fs, originX: textX, baseline: baseline)
let lockW = textX + word.width - 4 + 2 // content from x=4 to end of text (+2 for the last glyph's overhang)

func lockupSVG(fg: String) -> String {
    """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="4 6 \(fmt(lockW)) 88" role="img" aria-label="Backpressure">\
    \(markSVG(fg: fg))<path d="\(word.d)" fill="\(fg)"/></svg>

    """
}
func markOnlySVG(fg: String) -> String {
    "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" role=\"img\" aria-label=\"Backpressure\">\(markSVG(fg: fg))</svg>\n"
}
// App icon: black rounded square, mark at 58%.
let iconSVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" rx=\"22.5\" fill=\"\(BLACK)\"/>\(markSVG(fg: WHITE, dx: 21, dy: 21, s: 0.58))</svg>\n"

func write(_ name: String, _ s: String) {
    try! s.write(toFile: "\(out)/\(name)", atomically: true, encoding: .utf8)
    print("wrote \(name)")
}
write("backpressure-mark-on-dark.svg", markOnlySVG(fg: WHITE))
write("backpressure-mark-on-light.svg", markOnlySVG(fg: INK))
write("backpressure-logo-on-dark.svg", lockupSVG(fg: WHITE))
write("backpressure-logo-on-light.svg", lockupSVG(fg: INK))
write("backpressure-app-icon.svg", iconSVG)
print("lockup aspect \(fmt(lockW / 88))")

// ---- Rasters --------------------------------------------------------------
func render(_ w: Int, _ h: Int, _ path: String, jpeg: Bool, _ draw: () -> Void) {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    let ctx = NSGraphicsContext(bitmapImageRep: rep)!
    let cg = ctx.cgContext
    cg.translateBy(x: 0, y: CGFloat(h))
    cg.scaleBy(x: 1, y: -1)
    NSGraphicsContext.current = NSGraphicsContext(cgContext: cg, flipped: true)
    draw()
    NSGraphicsContext.current = nil
    let data = jpeg ? rep.representation(using: .jpeg, properties: [.compressionFactor: 0.95])!
                    : rep.representation(using: .png, properties: [:])!
    try! data.write(to: URL(fileURLWithPath: "\(out)/\(path)"))
    print("wrote \(path)")
}

/// Lockup drawn with the same spec as the SVG, mark box at (x, y) of side m.
func drawLockup(x: CGFloat, y: CGFloat, m: CGFloat, fg: NSColor) {
    drawMark(x, y, m, fg: fg)
    let size = m * FONT_SCALE
    let f = inter(size, .semibold)
    let str = NSAttributedString(string: WORD, attributes: [.font: f, .foregroundColor: fg, .kern: TRACK * size])
    let base = y + m * 0.5 + f.capHeight / 2
    str.draw(at: NSPoint(x: x + m * (1 + GAP), y: base - f.ascender))
}
func lockupWidth(m: CGFloat) -> CGFloat { m * lockW / 100 }

func appIcon(x: CGFloat, y: CGFloat, s: CGFloat, rounded: Bool = true) {
    color(BLACK).setFill()
    let r = rounded ? s * 0.225 : 0
    NSBezierPath(roundedRect: NSRect(x: x, y: y, width: s, height: s), xRadius: r, yRadius: r).fill()
    drawMark(x + s * 0.21, y + s * 0.21, s * 0.58, fg: color(WHITE))
}

// Icons for the site (full-bleed: iOS and Android apply their own mask).
render(180, 180, "apple-icon.png", jpeg: false) { appIcon(x: 0, y: 0, s: 180, rounded: false) }
render(192, 192, "icon-192.png", jpeg: false) { appIcon(x: 0, y: 0, s: 192, rounded: false) }
render(512, 512, "icon-512.png", jpeg: false) { appIcon(x: 0, y: 0, s: 512, rounded: false) }

// Transparent PNG logos (2400 px wide).
for (name, fg) in [("on-dark", WHITE), ("on-light", INK)] {
    let m: CGFloat = 400
    let w = Int(lockupWidth(m: m)) + 40, h = Int(m * 0.88) + 40
    render(w, h, "backpressure-logo-\(name).png", jpeg: false) {
        drawLockup(x: 20 - m * 0.04, y: 20 - m * 0.06, m: m, fg: color(fg))
    }
}
render(1024, 1024, "backpressure-app-icon.png", jpeg: false) { appIcon(x: 0, y: 0, s: 1024) }
render(1024, 1024, "backpressure-app-icon.jpg", jpeg: true) {
    color(BLACK).setFill(); NSRect(x: 0, y: 0, width: 1024, height: 1024).fill()
    drawMark(1024 * 0.21, 1024 * 0.21, 1024 * 0.58, fg: color(WHITE))
}

// Brand board (JPEG).
func label(_ s: String, _ size: CGFloat, _ w: NSFont.Weight, _ c: NSColor, _ x: CGFloat, _ y: CGFloat, kern: CGFloat = 0) {
    NSAttributedString(string: s, attributes: [.font: inter(size, w), .foregroundColor: c, .kern: kern * size])
        .draw(at: NSPoint(x: x, y: y))
}
render(1800, 1200, "backpressure-brand-board.jpg", jpeg: true) {
    let gray = color("#8A8A8A"), panel = color("#111111"), line = color("#2A2A2A"), paper = color("#F4F4F2")
    color(BLACK).setFill(); NSRect(x: 0, y: 0, width: 1800, height: 1200).fill()
    let m: CGFloat = 150
    drawLockup(x: 540 - lockupWidth(m: m) / 2 - m * 0.04, y: 540 - m / 2, m: m, fg: color(WHITE))
    label("Backpressure brand", 20, .semibold, gray, 72, 64, kern: 0.04)
    label("Queue depth", 34, .semibold, color(WHITE), 72, 1010)
    label("Four queues rise toward capacity; the last has filled and spills over in amber.", 19, .regular, gray, 72, 1062)
    label("Inter SemiBold, −2.5% tracking · white #FFFFFF · ink #0B0B0B · amber #F59E0B", 19, .regular, gray, 72, 1092)

    paper.setFill(); NSRect(x: 1080, y: 0, width: 720, height: 600).fill()
    label("On light", 16, .semibold, color("#5F5F5F"), 1120, 40, kern: 0.04)
    let m2: CGFloat = 84
    drawLockup(x: 1440 - lockupWidth(m: m2) / 2 - m2 * 0.04, y: 310 - m2 / 2, m: m2, fg: color(INK))

    panel.setFill(); NSRect(x: 1080, y: 600, width: 720, height: 600).fill()
    line.setFill(); NSRect(x: 1080, y: 600, width: 720, height: 1).fill(); NSRect(x: 1080, y: 0, width: 1, height: 1200).fill()
    label("App icon, favicon, small sizes", 16, .semibold, gray, 1120, 640, kern: 0.04)
    appIcon(x: 1120, y: 720, s: 220)
    appIcon(x: 1380, y: 776, s: 108)
    appIcon(x: 1520, y: 806, s: 48)
    drawMark(1600, 818, 24, fg: color(WHITE))
    drawMark(1650, 822, 16, fg: color(WHITE))
    let m3: CGFloat = 30
    drawLockup(x: 1440 - lockupWidth(m: m3) / 2 - m3 * 0.04, y: 1070 - m3 / 2, m: m3, fg: color(WHITE))
}
