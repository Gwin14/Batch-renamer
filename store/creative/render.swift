// Gera os ativos "Cabeçalho" e "Resultados da busca" da página de produto (App Store Connect).
// Uso: swift store/creative/render.swift  → grava os JPEGs em store/creative/out/
import AppKit

let orange = NSColor(srgbRed: 0xD9/255, green: 0x48/255, blue: 0x0F/255, alpha: 1)
let orangeText = NSColor(srgbRed: 0xC9/255, green: 0x45/255, blue: 0x12/255, alpha: 1)
let ink = NSColor(srgbRed: 0x1C/255, green: 0x1C/255, blue: 0x1E/255, alpha: 1)
let gray = NSColor(srgbRed: 0x8E/255, green: 0x8E/255, blue: 0x93/255, alpha: 1)

func rgb(_ hex: Int, _ a: CGFloat = 1) -> NSColor {
  NSColor(srgbRed: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255,
          blue: CGFloat(hex & 255) / 255, alpha: a)
}

struct Copy {
  let headline: String
  let city: String
  let searchTitle: String
  let previewLabel: String
  let button: String
}

let copies: [String: Copy] = [
  "pt": Copy(headline: "Do IMG_4821 ao nome certo.", city: "Lisboa",
             searchTitle: "Renomeie centenas de fotos de uma vez",
             previewLabel: "PRÉVIA · 248 ARQUIVOS", button: "Renomear 248 arquivos"),
  "en": Copy(headline: "From IMG_4821 to the right name.", city: "Lisbon",
             searchTitle: "Rename hundreds of photos at once",
             previewLabel: "PREVIEW · 248 FILES", button: "Rename 248 files"),
]

// MARK: - Canvas

func render(width: Int, height: Int, to url: URL, draw: (CGContext) -> Void) {
  let cs = CGColorSpace(name: CGColorSpace.sRGB)!
  let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                      space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  ctx.translateBy(x: 0, y: CGFloat(height))
  ctx.scaleBy(x: 1, y: -1)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: true)
  draw(ctx)
  NSGraphicsContext.restoreGraphicsState()
  let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
  let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.94])!
  try! data.write(to: url)
  print("✓", url.lastPathComponent, "\(width)×\(height)")
}

func fill(_ ctx: CGContext, _ rect: CGRect, radius: CGFloat, _ color: NSColor) {
  ctx.addPath(CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil))
  ctx.setFillColor(color.cgColor)
  ctx.fillPath()
}

func background(_ ctx: CGContext, _ w: CGFloat, _ h: CGFloat) {
  let cs = CGColorSpace(name: CGColorSpace.sRGB)!
  let lin = CGGradient(colorsSpace: cs, colors: [rgb(0xE4561C).cgColor, rgb(0xB5380A).cgColor] as CFArray,
                       locations: [0, 1])!
  ctx.drawLinearGradient(lin, start: .zero, end: CGPoint(x: 0, y: h), options: [])
  let glow = CGGradient(colorsSpace: cs, colors: [rgb(0xFF8A4C, 0.45).cgColor, rgb(0xFF8A4C, 0).cgColor] as CFArray,
                        locations: [0, 1])!
  ctx.drawRadialGradient(glow, startCenter: CGPoint(x: w / 2, y: h * 0.5), startRadius: 0,
                         endCenter: CGPoint(x: w / 2, y: h * 0.5), endRadius: max(w, h) * 0.45, options: [])
}

func attr(_ s: String, size: CGFloat, weight: NSFont.Weight = .regular, mono: Bool = false,
          color: NSColor, kern: CGFloat = 0) -> NSAttributedString {
  let font = mono ? NSFont.monospacedSystemFont(ofSize: size, weight: weight)
                  : NSFont.systemFont(ofSize: size, weight: weight)
  return NSAttributedString(string: s, attributes: [.font: font, .foregroundColor: color, .kern: kern])
}

func drawText(_ s: NSAttributedString, x: CGFloat, centerY: CGFloat) {
  let size = s.size()
  s.draw(at: CGPoint(x: x, y: centerY - size.height / 2))
}

func drawCentered(_ s: NSAttributedString, centerX: CGFloat, centerY: CGFloat) {
  let size = s.size()
  s.draw(at: CGPoint(x: centerX - size.width / 2, y: centerY - size.height / 2))
}

/// "2026-07-14_Lisboa_001" laranja em negrito + ".jpg" escuro, como na prévia do Studio.
func renamed(_ base: String, _ ext: String, size: CGFloat, mono: Bool, baseColor: NSColor, extColor: NSColor) -> NSAttributedString {
  let s = NSMutableAttributedString(attributedString: attr(base, size: size, weight: .semibold, mono: mono, color: baseColor))
  s.append(attr(ext, size: size, weight: .regular, mono: mono, color: extColor))
  return s
}

// MARK: - Cabeçalho 21:9 (3840 × 1646)

func header(_ c: Copy, to url: URL) {
  let W: CGFloat = 3840, H: CGFloat = 1646
  render(width: Int(W), height: Int(H), to: url) { ctx in
    background(ctx, W, H)

    // Antes (esquerda): nomes bagunçados, tortos, desalinhados.
    let messy: [(String, CGFloat, CGFloat, CGFloat, CGFloat)] = [
      // nome, x, y, largura, rotação (graus)
      ("WhatsApp Image 2026-07…", 120, 520, 760, -4),
      ("IMG_4822.JPG", 330, 700, 560, 3),
      ("Screenshot 14-07 (2).png", 90, 880, 800, -2),
      ("DSC01236.JPG", 360, 1060, 520, 4),
      ("foto 2 final.jpg", 160, 1230, 600, -3),
    ]
    for (i, m) in messy.enumerated() {
      ctx.saveGState()
      let rect = CGRect(x: m.1, y: m.2 - 55, width: m.3, height: 110)
      ctx.translateBy(x: rect.midX, y: rect.midY)
      ctx.rotate(by: m.4 * .pi / 180)
      ctx.translateBy(x: -rect.midX, y: -rect.midY)
      let a: CGFloat = 0.14 + CGFloat(i % 2) * 0.05
      fill(ctx, rect, radius: 55, rgb(0xFFFFFF, a))
      drawText(attr(m.0, size: 46, weight: .medium, mono: true, color: rgb(0xFFFFFF, 0.62)), x: rect.minX + 50, centerY: rect.midY)
      ctx.restoreGState()
    }

    // Depois (direita): nomes alinhados, mesmo padrão.
    let neat = ["_002.jpg", "_003.jpg", "_004.png", "_005.jpg", "_006.jpg"]
    for (i, suffix) in neat.enumerated() {
      let y: CGFloat = 520 + CGFloat(i) * 180
      let rect = CGRect(x: 2860, y: y - 55, width: 860, height: 110)
      fill(ctx, rect, radius: 55, rgb(0xFFFFFF, 0.88 - CGFloat(i) * 0.12))
      fill(ctx, CGRect(x: rect.minX + 34, y: rect.midY - 21, width: 42, height: 42), radius: 21, orange.withAlphaComponent(0.9))
      let name = renamed("2026-07-14_\(c.city)", suffix, size: 44, mono: true,
                         baseColor: orangeText, extColor: ink.withAlphaComponent(0.8))
      drawText(name, x: rect.minX + 104, centerY: rect.midY)
    }

    // Centro: o próprio ícone do Lote, com nomes reais.
    let x0: CGFloat = 1300
    let ph: CGFloat = 150
    fill(ctx, CGRect(x: x0, y: 640 - ph / 2, width: 880, height: ph), radius: ph / 2, rgb(0xFFFFFF, 0.36))
    drawText(attr("IMG_4821.JPG", size: 64, weight: .medium, mono: true, color: rgb(0xFFFFFF, 0.92)), x: x0 + 70, centerY: 640)

    // sombra da pílula branca
    ctx.saveGState()
    ctx.setShadow(offset: CGSize(width: 0, height: 24), blur: 70, color: rgb(0x6A1E00, 0.45).cgColor)
    fill(ctx, CGRect(x: x0, y: 830 - ph / 2, width: 1320, height: ph), radius: ph / 2, .white)
    ctx.restoreGState()
    fill(ctx, CGRect(x: x0 + 44, y: 830 - 38, width: 76, height: 76), radius: 38, orange)
    drawText(renamed("2026-07-14_\(c.city)_001", ".jpg", size: 64, mono: true, baseColor: orangeText, extColor: ink),
             x: x0 + 156, centerY: 830)

    fill(ctx, CGRect(x: x0, y: 1020 - ph / 2, width: 1080, height: ph), radius: ph / 2, rgb(0xFFFFFF, 0.36))
    drawText(attr("DSC01234.JPG", size: 64, weight: .medium, mono: true, color: rgb(0xFFFFFF, 0.92)), x: x0 + 70, centerY: 1020)

    // Frase
    drawCentered(attr(c.headline, size: 150, weight: .bold, color: .white, kern: -2), centerX: W / 2, centerY: 300)
  }
}

// MARK: - Resultados da busca 3:2 (3840 × 2560)

func thumb(_ ctx: CGContext, _ rect: CGRect, _ top: Int, _ bottom: Int, horizon: CGFloat) {
  ctx.saveGState()
  ctx.addPath(CGPath(roundedRect: rect, cornerWidth: 64, cornerHeight: 64, transform: nil))
  ctx.clip()
  let cs = CGColorSpace(name: CGColorSpace.sRGB)!
  let g = CGGradient(colorsSpace: cs, colors: [rgb(top).cgColor, rgb(bottom).cgColor] as CFArray, locations: [0, 1])!
  ctx.drawLinearGradient(g, start: CGPoint(x: 0, y: rect.minY), end: CGPoint(x: 0, y: rect.maxY), options: [])
  // "chão" da foto, como as miniaturas de exemplo do app
  ctx.setFillColor(rgb(0x000000, 0.22).cgColor)
  ctx.fill(CGRect(x: rect.minX, y: rect.minY + rect.height * horizon, width: rect.width, height: rect.height))
  ctx.restoreGState()
}

func search(_ c: Copy, to url: URL) {
  let W: CGFloat = 3840, H: CGFloat = 2560
  render(width: Int(W), height: Int(H), to: url) { ctx in
    background(ctx, W, H)

    drawCentered(attr(c.searchTitle, size: 176, weight: .bold, color: .white, kern: -2), centerX: W / 2, centerY: 330)

    let card = CGRect(x: 500, y: 600, width: 2840, height: 1780)
    ctx.saveGState()
    ctx.setShadow(offset: CGSize(width: 0, height: 40), blur: 120, color: rgb(0x5A1800, 0.45).cgColor)
    fill(ctx, card, radius: 110, rgb(0xF2F2F7))
    ctx.restoreGState()

    drawText(attr(c.previewLabel, size: 66, weight: .semibold, color: gray, kern: 4), x: card.minX + 120, centerY: card.minY + 120)

    let list = CGRect(x: card.minX + 70, y: card.minY + 210, width: card.width - 140, height: 1150)
    fill(ctx, list, radius: 80, .white)

    let rows: [(String, String, Int, Int, CGFloat)] = [
      ("_001", "IMG_4821.JPG", 0xE9B98A, 0x8C5A3A, 0.62),
      ("_002", "DSC01234.JPG", 0x8FC1EA, 0xD8C9A4, 0.58),
      ("_003", "foto 2 final.jpg", 0x3E4A7A, 0xE07A4F, 0.66),
    ]
    let rowH: CGFloat = list.height / 3
    for (i, r) in rows.enumerated() {
      let top = list.minY + CGFloat(i) * rowH
      let mid = top + rowH / 2
      thumb(ctx, CGRect(x: list.minX + 70, y: mid - 140, width: 280, height: 280), r.2, r.3, horizon: r.4)
      let tx = list.minX + 420
      drawText(renamed("2026-07-14_\(c.city)\(r.0)", ".jpg", size: 118, mono: false, baseColor: orangeText, extColor: ink),
               x: tx, centerY: mid - 62)
      drawText(attr(r.1, size: 84, color: gray), x: tx, centerY: mid + 78)
      if i < rows.count - 1 {
        ctx.setFillColor(rgb(0x3C3C43, 0.16).cgColor)
        ctx.fill(CGRect(x: tx, y: top + rowH - 2, width: list.maxX - tx, height: 4))
      }
    }

    let btn = CGRect(x: card.minX + 70, y: list.maxY + 60, width: card.width - 140, height: 240)
    fill(ctx, btn, radius: 120, rgb(0xCB4A1F))
    drawCentered(attr("✳︎  " + c.button, size: 104, weight: .semibold, color: .white), centerX: btn.midX, centerY: btn.midY)
  }
}

// MARK: - Main

let here = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
let out = here.appendingPathComponent("out")
try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
for (lang, c) in copies {
  header(c, to: out.appendingPathComponent("header-\(lang)-3840x1646.jpg"))
  search(c, to: out.appendingPathComponent("search-\(lang)-3840x2560.jpg"))
}
